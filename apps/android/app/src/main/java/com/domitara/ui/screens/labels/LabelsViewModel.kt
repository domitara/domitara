package com.domitara.ui.screens.labels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.domitara.data.api.toUserMessage
import com.domitara.data.dto.Item
import com.domitara.data.dto.Label
import com.domitara.data.repository.DataRepository
import com.domitara.ui.common.Async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class LabelsViewModel(
    private val repo: DataRepository,
    private val activeHome: StateFlow<String?>,
) : ViewModel() {

    private val _labels = MutableStateFlow<Async<List<Label>>>(Async.Loading)
    val labels: StateFlow<Async<List<Label>>> = _labels.asStateFlow()

    private val _selected = MutableStateFlow<Label?>(null)
    val selected: StateFlow<Label?> = _selected.asStateFlow()

    private val _items = MutableStateFlow<Async<List<Item>>>(Async.Loading)
    val items: StateFlow<Async<List<Item>>> = _items.asStateFlow()

    private val _locationNames = MutableStateFlow<Map<String, String>>(emptyMap())
    val locationNames: StateFlow<Map<String, String>> = _locationNames.asStateFlow()

    init {
        // Reload whenever the active home changes (and for the initial value).
        viewModelScope.launch { activeHome.collect { load() } }
    }

    fun load() {
        _selected.value = null
        viewModelScope.launch {
            _labels.value = Async.Loading
            runCatching { repo.listLabels() }
                .onSuccess { _labels.value = Async.Success(it.sortedBy { l -> l.name }) }
                .onFailure { _labels.value = Async.Failure(it.toUserMessage("Failed to load labels")) }
        }
        viewModelScope.launch {
            runCatching { repo.listLocations() }
                .onSuccess { locs -> _locationNames.value = locs.associate { it.id to it.name } }
        }
    }

    fun select(label: Label) {
        _selected.value = label
        _items.value = Async.Loading
        viewModelScope.launch {
            runCatching { repo.listItems(labelId = label.id) }
                .onSuccess { _items.value = Async.Success(it) }
                .onFailure { _items.value = Async.Failure(it.toUserMessage("Failed to load items")) }
        }
    }

    fun clearSelection() {
        _selected.value = null
    }
}
