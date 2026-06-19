package com.domitara.ui.screens.maintenance

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.domitara.data.api.toUserMessage
import com.domitara.data.dto.CreateMaintenanceInput
import com.domitara.data.dto.CreateScheduleInput
import com.domitara.data.dto.Item
import com.domitara.data.dto.MaintenanceLog
import com.domitara.data.dto.MaintenanceSchedule
import com.domitara.data.dto.Reminder
import com.domitara.data.dto.UpdateScheduleInput
import com.domitara.data.repository.DataRepository
import com.domitara.ui.common.Async
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class MaintenanceData(
    val schedules: List<MaintenanceSchedule>,
    val logs: List<MaintenanceLog>,
    val reminders: List<Reminder>,
    val items: List<Item>,
)

class MaintenanceViewModel(
    private val repo: DataRepository,
    private val activeHome: StateFlow<String?>,
) : ViewModel() {

    private val _state = MutableStateFlow<Async<MaintenanceData>>(Async.Loading)
    val state: StateFlow<Async<MaintenanceData>> = _state.asStateFlow()

    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing.asStateFlow()

    /** Transient message for a failed mutation/refresh, shown as a snackbar. */
    private val _actionError = MutableStateFlow<String?>(null)
    val actionError: StateFlow<String?> = _actionError.asStateFlow()

    fun clearActionError() { _actionError.value = null }

    init {
        // Reload whenever the active home changes (and for the initial value).
        viewModelScope.launch { activeHome.collect { load() } }
    }

    fun load() {
        viewModelScope.launch {
            _state.value = Async.Loading
            runCatching { fetch() }
                .onSuccess { _state.value = it }
                .onFailure { _state.value = Async.Failure(it.toUserMessage("Failed to load")) }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _refreshing.value = true
            runCatching { fetch() }
                .onSuccess { _state.value = it }
                .onFailure { _actionError.value = it.toUserMessage("Couldn't refresh") }
            _refreshing.value = false
        }
    }

    /** Loads all maintenance sections in parallel; the active home scopes them via header. */
    private suspend fun fetch(): Async<MaintenanceData> {
        if (activeHome.value == null) {
            return Async.Failure("Create a home before logging maintenance.")
        }
        return coroutineScope {
            val schedulesD = async { repo.listSchedules() }
            val logsD = async { repo.listMaintenance() }
            val remindersD = async { runCatching { repo.listReminders() }.getOrDefault(emptyList()) }
            val itemsD = async { runCatching { repo.listItems() }.getOrDefault(emptyList()) }
            Async.Success(
                MaintenanceData(
                    schedules = schedulesD.await(),
                    logs = logsD.await(),
                    reminders = remindersD.await(),
                    items = itemsD.await(),
                ),
            )
        }
    }

    fun createLog(input: CreateMaintenanceInput, onDone: () -> Unit) =
        mutate(onDone) { repo.createMaintenance(input) }

    fun deleteLog(id: String) = mutate { repo.deleteMaintenance(id) }

    fun createSchedule(input: CreateScheduleInput, onDone: () -> Unit) =
        mutate(onDone) { repo.createSchedule(input) }

    fun updateSchedule(id: String, input: UpdateScheduleInput, onDone: () -> Unit) =
        mutate(onDone) { repo.updateSchedule(id, input) }

    fun deleteSchedule(id: String) = mutate { repo.deleteSchedule(id) }

    fun dismissReminder(id: String) {
        viewModelScope.launch {
            runCatching { repo.dismissReminder(id) }
                .onSuccess { removeReminder(id) }
                .onFailure { _actionError.value = it.toUserMessage("Couldn't dismiss reminder") }
        }
    }

    fun snoozeReminder(id: String, days: Int = 7) {
        viewModelScope.launch {
            runCatching { repo.snoozeReminder(id, days) }
                .onSuccess { removeReminder(id) }
                .onFailure { _actionError.value = it.toUserMessage("Couldn't snooze reminder") }
        }
    }

    /** Runs a mutation then re-fetches so all sections stay consistent. On failure
     *  surfaces a message and leaves [onDone] uncalled so the sheet stays open. */
    private fun mutate(onDone: () -> Unit = {}, block: suspend () -> Unit) {
        viewModelScope.launch {
            runCatching { block() }
                .onSuccess {
                    onDone()
                    runCatching { fetch() }.onSuccess { _state.value = it }
                }
                .onFailure { _actionError.value = it.toUserMessage("Couldn't save changes") }
        }
    }

    private fun removeReminder(id: String) {
        val current = _state.value
        if (current is Async.Success) {
            _state.value = Async.Success(
                current.data.copy(reminders = current.data.reminders.filterNot { it.id == id }),
            )
        }
    }
}
