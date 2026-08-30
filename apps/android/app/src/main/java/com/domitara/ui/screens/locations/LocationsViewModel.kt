package com.domitara.ui.screens.locations

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.domitara.data.api.toUserMessage
import com.domitara.data.dto.CreateLocationInput
import com.domitara.data.dto.CreatePaintColorInput
import com.domitara.data.dto.Item
import com.domitara.data.dto.Location
import com.domitara.data.dto.LocationPaint
import com.domitara.data.dto.LocationPaintInput
import com.domitara.data.dto.LocationType
import com.domitara.data.dto.PaintColor
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

    private val _paintColors = MutableStateFlow<List<PaintColor>>(emptyList())
    val paintColors: StateFlow<List<PaintColor>> = _paintColors.asStateFlow()

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
        loadPaintColors()
    }

    private fun loadPaintColors() {
        viewModelScope.launch {
            runCatching { repo.listPaintColors() }
                .onSuccess { list -> _paintColors.value = list.sortedBy { it.name } }
                .onFailure { /* non-fatal: the assign-paint picker just shows an empty list */ }
        }
    }

    fun createPaintColor(
        name: String,
        color: String,
        brand: String?,
        colorCode: String?,
        sheen: String?,
        notes: String?,
    ) {
        viewModelScope.launch {
            runCatching {
                repo.createPaintColor(
                    CreatePaintColorInput(
                        name = name,
                        color = color,
                        brand = brand?.ifBlank { null },
                        colorCode = colorCode?.ifBlank { null },
                        sheen = sheen?.ifBlank { null },
                        notes = notes?.ifBlank { null },
                    ),
                )
            }
                .onSuccess { loadPaintColors() }
                .onFailure { _actionError.value = it.toUserMessage("Couldn't create paint color") }
        }
    }

    /** Refresh the location list without dropping the current detail selection. */
    private fun refreshLocations() {
        viewModelScope.launch {
            runCatching { repo.listLocations() }
                .onSuccess { list ->
                    _locations.value = Async.Success(list)
                    _selected.value?.let { sel -> _selected.value = list.find { it.id == sel.id } ?: sel }
                }
                .onFailure { _actionError.value = it.toUserMessage("Failed to reload locations") }
        }
    }

    fun setQuery(q: String) { query.value = q }

    fun toggleExpand(id: String) {
        val cur = expanded.value
        expanded.value = if (id in cur) cur - id else cur + id
    }

    fun select(location: Location) {
        _selected.value = location
        loadItems(location)
        loadPaint(location.id)
    }

    private fun loadItems(location: Location) {
        _items.value = Async.Loading
        val includeQuick = location.locationType == LocationType.CONTAINER
        viewModelScope.launch {
            runCatching { repo.listItems(locationId = location.id, includeQuick = includeQuick) }
                .onSuccess { _items.value = Async.Success(it) }
                .onFailure { _items.value = Async.Failure(it.toUserMessage("Failed to load items")) }
        }
    }

    private fun loadPaint(locationId: String) {
        _paint.value = Async.Loading
        viewModelScope.launch {
            runCatching { repo.listLocationPaint(locationId) }
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

    fun updateLocation(
        id: String,
        name: String,
        parentId: String?,
        description: String?,
        locationType: LocationType,
        gridRows: Int?,
        gridCols: Int?,
    ) {
        viewModelScope.launch {
            runCatching {
                repo.updateLocation(
                    id,
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
                .onSuccess { updated ->
                    _selected.value = updated
                    refreshLocations()
                }
                .onFailure { _actionError.value = it.toUserMessage("Couldn't update location") }
        }
    }

    fun deleteLocation(id: String) {
        viewModelScope.launch {
            runCatching { repo.deleteLocation(id) }
                .onSuccess { load() }
                .onFailure { _actionError.value = it.toUserMessage("Couldn't delete location") }
        }
    }

    fun assignPaint(locationId: String, input: LocationPaintInput) {
        viewModelScope.launch {
            runCatching { repo.createLocationPaint(locationId, input) }
                .onSuccess { loadPaint(locationId) }
                .onFailure { _actionError.value = it.toUserMessage("Couldn't assign paint") }
        }
    }

    fun updatePaint(id: String, locationId: String, input: LocationPaintInput) {
        viewModelScope.launch {
            runCatching { repo.updateLocationPaint(id, input) }
                .onSuccess { loadPaint(locationId) }
                .onFailure { _actionError.value = it.toUserMessage("Couldn't update paint") }
        }
    }

    fun deletePaint(id: String, locationId: String) {
        viewModelScope.launch {
            runCatching { repo.deleteLocationPaint(id) }
                .onSuccess { loadPaint(locationId) }
                .onFailure { _actionError.value = it.toUserMessage("Couldn't remove paint") }
        }
    }
}
