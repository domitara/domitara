package com.domitara.ui.screens.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.domitara.data.api.toUserMessage
import com.domitara.data.dto.DashboardStats
import com.domitara.data.dto.Item
import com.domitara.data.dto.Reminder
import com.domitara.data.repository.DataRepository
import com.domitara.ui.common.Async
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class DashboardData(
    val stats: DashboardStats,
    val reminders: List<Reminder>,
    val recentItems: List<Item>,
)

class DashboardViewModel(
    private val repo: DataRepository,
    private val activeHome: StateFlow<String?>,
) : ViewModel() {

    private val _state = MutableStateFlow<Async<DashboardData>>(Async.Loading)
    val state: StateFlow<Async<DashboardData>> = _state.asStateFlow()

    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing.asStateFlow()

    /** Transient message for a failed action/refresh, shown as a snackbar. */
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
                .onSuccess { _state.value = Async.Success(it) }
                .onFailure { _state.value = Async.Failure(it.toUserMessage("Failed to load")) }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _refreshing.value = true
            runCatching { fetch() }
                .onSuccess { _state.value = Async.Success(it) }
                .onFailure { _actionError.value = it.toUserMessage("Couldn't refresh") }
            _refreshing.value = false
        }
    }

    private suspend fun fetch(): DashboardData = coroutineScope {
        val statsD = async { repo.getDashboard() }
        val remindersD = async { runCatching { repo.listReminders() }.getOrDefault(emptyList()) }
        val itemsD = async { runCatching { repo.listItems() }.getOrDefault(emptyList()) }
        val recent = itemsD.await().sortedByDescending { it.createdAt }.take(8)
        DashboardData(statsD.await(), remindersD.await(), recent)
    }

    fun dismiss(id: String) {
        viewModelScope.launch {
            runCatching { repo.dismissReminder(id) }
                .onSuccess { removeReminder(id) }
                .onFailure { _actionError.value = it.toUserMessage("Couldn't dismiss reminder") }
        }
    }

    fun snooze(id: String, days: Int = 7) {
        viewModelScope.launch {
            runCatching { repo.snoozeReminder(id, days) }
                .onSuccess { removeReminder(id) }
                .onFailure { _actionError.value = it.toUserMessage("Couldn't snooze reminder") }
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
