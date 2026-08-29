package com.domitara.ui.screens.locations

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.domitara.data.api.toUserMessage
import com.domitara.data.dto.CreateLocationInput
import com.domitara.data.dto.Item
import com.domitara.data.dto.Location
import com.domitara.data.dto.LocationPaint
import com.domitara.data.dto.LocationType
import com.domitara.data.repository.DataRepository
import com.domitara.ui.common.Async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class LocationsViewModel(
    private val repo: DataRepository,
    private val activeHome: StateFlow<String?>,
) : ViewModel() {

    private val _locations = MutableStateFlow<Async<List<Location>>>(Async.Loading)
    val locations: StateFlow<Async<List<Location>>> = _locations.asStateFlow()

    val query = MutableStateFlow("")
    val expanded = MutableStateFlow<Set<String>>(emptySet())

    private val _selected = MutableStateFlow<Location?>(null)
    val selected: StateFlow<Location?> = _selected.asStateFlow()

    private val _items = MutableStateFlow<Async<List<Item>>>(Async.Loading)
    val items: StateFlow<Async<List<Item>>> = _items.asStateFlow()

    private val _paint = MutableStateFlow<Async<List<LocationPaint>>>(Async.Loading)
    val paint: StateFlow<Async<List<LocationPaint>>> = _paint.asStateFlow()

    private val _actionError = MutableStateFlow<String?>(null)
    val actionError: StateFlow<String?> = _actionError.asStateFlow()

    fun clearActionError() { _actionError.value = null }

    init {
        // Reload whenever the active home changes (and for the initial value).
        viewModelScope.launch { activeHome.collect { load() } }
    }

    fun load() {
        _selected.value = null
        viewModelScope.launch {
            _locations.value = Async.Loading
            runCatching { repo.listLocations() }
                .onSuccess { _locations.value = Async.Success(it) }
                .onFailure { _locations.value = Async.Failure(it.toUserMessage("Failed to load locations")) }
        }
    }

    fun setQuery(q: String) { query.value = q }

    fun toggleExpand(id: String) {
        val cur = expanded.value
        expanded.value = if (id in cur) cur - id else cur + id
    }

    fun select(location: Location) {
        _selected.value = location
        _items.value = Async.Loading
        _paint.value = Async.Loading
        val includeQuick = location.locationType == LocationType.CONTAINER
        viewModelScope.launch {
            runCatching { repo.listItems(locationId = location.id, includeQuick = includeQuick) }
                .onSuccess { _items.value = Async.Success(it) }
                .onFailure { _items.value = Async.Failure(it.toUserMessage("Failed to load items")) }
        }
        viewModelScope.launch {
            runCatching { repo.listLocationPaint(location.id) }
                .onSuccess { _paint.value = Async.Success(it) }
                .onFailure { _paint.value = Async.Failure(it.toUserMessage("Failed to load paint")) }
        }
    }

    fun clearSelection() { _selected.value = null }

    fun createLocation(
        name: String,
        parentId: String?,
        description: String?,
        locationType: LocationType,
        gridRows: Int?,
        gridCols: Int?,
    ) {
        viewModelScope.launch {
            runCatching {
                repo.createLocation(
                    CreateLocationInput(
                        name = name,
                        parentId = parentId,
                        description = description,
                        locationType = locationType,
                        gridRows = gridRows,
                        gridCols = gridCols,
                    ),
                )
            }
                .onSuccess { load() }
                .onFailure { _actionError.value = it.toUserMessage("Couldn't create location") }
        }
    }
}
