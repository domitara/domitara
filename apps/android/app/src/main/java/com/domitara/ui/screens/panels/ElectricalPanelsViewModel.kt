package com.domitara.ui.screens.panels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.domitara.data.api.toUserMessage
import com.domitara.data.dto.CreateBreakerInput
import com.domitara.data.dto.CreatePanelInput
import com.domitara.data.dto.ElectricalBreaker
import com.domitara.data.dto.ElectricalPanel
import com.domitara.data.dto.FloorPlanArea
import com.domitara.data.dto.Home
import com.domitara.data.dto.UpdateBreakerInput
import com.domitara.di.AppContainer
import com.domitara.ui.common.Async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class ElectricalPanelsViewModel(private val container: AppContainer) : ViewModel() {

    private val repo = container.dataRepository

    private val _homes = MutableStateFlow<Async<List<Home>>>(Async.Loading)
    val homes: StateFlow<Async<List<Home>>> = _homes.asStateFlow()

    private val _selectedHome = MutableStateFlow<Home?>(null)
    val selectedHome: StateFlow<Home?> = _selectedHome.asStateFlow()

    private val _panels = MutableStateFlow<Async<List<ElectricalPanel>>>(Async.Loading)
    val panels: StateFlow<Async<List<ElectricalPanel>>> = _panels.asStateFlow()

    private val _selectedPanel = MutableStateFlow<ElectricalPanel?>(null)
    val selectedPanel: StateFlow<ElectricalPanel?> = _selectedPanel.asStateFlow()

    private val _breakers = MutableStateFlow<Async<List<ElectricalBreaker>>>(Async.Loading)
    val breakers: StateFlow<Async<List<ElectricalBreaker>>> = _breakers.asStateFlow()

    private val _areas = MutableStateFlow<List<FloorPlanArea>>(emptyList())
    val areas: StateFlow<List<FloorPlanArea>> = _areas.asStateFlow()

    /** Transient message for a failed mutation, shown as a snackbar. */
    private val _actionError = MutableStateFlow<String?>(null)
    val actionError: StateFlow<String?> = _actionError.asStateFlow()

    fun clearActionError() { _actionError.value = null }

    init {
        loadHomes()
        // Follow the app-wide active home so this screen stays consistent with the
        // rest of the app (and the X-Active-Home header used by writes).
        viewModelScope.launch {
            container.activeHomeId.collect { applyActiveHome(it) }
        }
    }

    fun loadHomes() {
        viewModelScope.launch {
            _homes.value = Async.Loading
            runCatching { repo.listHomes() }
                .onSuccess { list ->
                    _homes.value = Async.Success(list)
                    applyActiveHome(container.activeHomeId.value)
                }
                .onFailure { _homes.value = Async.Failure(it.toUserMessage()) }
        }
    }

    /** Selecting a home updates the global active home; [applyActiveHome] reloads. */
    fun selectHome(home: Home) {
        viewModelScope.launch { container.setActiveHome(home.id) }
    }

    /** Resolves the active home against the loaded list and reloads when it changes. */
    private fun applyActiveHome(id: String?) {
        val list = (_homes.value as? Async.Success)?.data ?: return
        if (list.isEmpty()) return
        val home = list.firstOrNull { it.id == id } ?: list.first()
        if (_selectedHome.value?.id == home.id) return
        _selectedHome.value = home
        _selectedPanel.value = null
        loadPanels(home.id)
        viewModelScope.launch {
            runCatching { repo.listFloorPlanAreas(home.id) }.onSuccess { _areas.value = it }
        }
    }

    private fun loadPanels(homeId: String) {
        viewModelScope.launch {
            _panels.value = Async.Loading
            runCatching { repo.listPanels(homeId) }
                .onSuccess { panels ->
                    _panels.value = Async.Success(panels)
                    panels.sortedBy { it.sortOrder }.firstOrNull()?.let { selectPanel(it) }
                }
                .onFailure { _panels.value = Async.Failure(it.toUserMessage()) }
        }
    }

    fun selectPanel(panel: ElectricalPanel) {
        _selectedPanel.value = panel
        loadBreakers(panel.id)
    }

    private fun loadBreakers(panelId: String) {
        viewModelScope.launch {
            _breakers.value = Async.Loading
            runCatching { repo.listBreakers(panelId) }
                .onSuccess { _breakers.value = Async.Success(it) }
                .onFailure { _breakers.value = Async.Failure(it.toUserMessage()) }
        }
    }

    fun createPanel(name: String, totalAmps: Int, totalSlots: Int?, locationNote: String?) {
        val homeId = _selectedHome.value?.id ?: return
        viewModelScope.launch {
            runCatching {
                repo.createPanel(homeId, CreatePanelInput(name, totalAmps, totalSlots, locationNote))
            }
                .onSuccess {
                    loadPanels(homeId)
                    selectPanel(it)
                }
                .onFailure { _actionError.value = it.toUserMessage("Couldn't create panel") }
        }
    }

    fun deletePanel(panelId: String) {
        val homeId = _selectedHome.value?.id ?: return
        viewModelScope.launch {
            runCatching { repo.deletePanel(panelId) }
                .onSuccess {
                    _selectedPanel.value = null
                    loadPanels(homeId)
                }
                .onFailure { _actionError.value = it.toUserMessage("Couldn't delete panel") }
        }
    }

    fun saveBreaker(existing: ElectricalBreaker?, slot: Int, input: BreakerForm) {
        val panelId = _selectedPanel.value?.id ?: return
        viewModelScope.launch {
            runCatching {
                if (existing == null) {
                    repo.createBreaker(
                        panelId,
                        CreateBreakerInput(
                            slot = slot,
                            label = input.label.ifBlank { null },
                            amps = input.amps,
                            breakerType = input.breakerType,
                            isGfci = input.isGfci,
                            isAfci = input.isAfci,
                            notes = input.notes.ifBlank { null },
                            floorPlanAreaId = input.floorPlanAreaId,
                        ),
                    )
                } else {
                    repo.updateBreaker(
                        existing.id,
                        UpdateBreakerInput(
                            label = input.label.ifBlank { null },
                            amps = input.amps,
                            breakerType = input.breakerType,
                            isGfci = input.isGfci,
                            isAfci = input.isAfci,
                            notes = input.notes.ifBlank { null },
                            floorPlanAreaId = input.floorPlanAreaId,
                        ),
                    )
                }
            }
                .onSuccess { _selectedPanel.value?.let { loadBreakers(it.id) } }
                .onFailure { _actionError.value = it.toUserMessage("Couldn't save breaker") }
        }
    }

    fun deleteBreaker(breakerId: String) {
        viewModelScope.launch {
            runCatching { repo.deleteBreaker(breakerId) }
                .onSuccess { _selectedPanel.value?.let { loadBreakers(it.id) } }
                .onFailure { _actionError.value = it.toUserMessage("Couldn't delete breaker") }
        }
    }
}

/** Editable breaker fields collected by the editor sheet. */
data class BreakerForm(
    val label: String = "",
    val amps: Int? = null,
    val breakerType: String = "standard",
    val isGfci: Boolean = false,
    val isAfci: Boolean = false,
    val notes: String = "",
    val floorPlanAreaId: String? = null,
)
