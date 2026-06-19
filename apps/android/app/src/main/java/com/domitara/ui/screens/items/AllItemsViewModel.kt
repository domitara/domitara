package com.domitara.ui.screens.items

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.domitara.data.api.toUserMessage
import com.domitara.data.dto.Item
import com.domitara.data.dto.Label
import com.domitara.data.dto.Location
import com.domitara.data.repository.DataRepository
import com.domitara.ui.common.Async
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.temporal.ChronoUnit

/** Whether the item list renders as a vertical list or a grid of cards. */
enum class ViewMode { LIST, GRID }

/** Ordering applied to the (filtered) item list. */
enum class SortOrder(val label: String) {
    RECENT("Recently added"),
    OLDEST("Oldest first"),
    NAME_ASC("Name (A–Z)"),
    NAME_DESC("Name (Z–A)"),
}

/** "Added within" date window, applied client-side against `createdAt`. */
enum class DateFilter(val label: String, val days: Long?) {
    ANY("Any time", null),
    WEEK("Last 7 days", 7),
    MONTH("Last 30 days", 30),
    YEAR("Last year", 365),
}

class AllItemsViewModel(
    private val repo: DataRepository,
    private val activeHome: StateFlow<String?>,
) : ViewModel() {

    val query = MutableStateFlow("")
    val selectedLabels = MutableStateFlow<Set<String>>(emptySet())
    val selectedLocation = MutableStateFlow<String?>(null)
    val dateFilter = MutableStateFlow(DateFilter.ANY)
    val sortOrder = MutableStateFlow(SortOrder.RECENT)
    val viewMode = MutableStateFlow(ViewMode.LIST)

    private val _items = MutableStateFlow<Async<List<Item>>>(Async.Loading)

    private val _labels = MutableStateFlow<List<Label>>(emptyList())
    val labels: StateFlow<List<Label>> = _labels.asStateFlow()

    private val _locations = MutableStateFlow<List<Location>>(emptyList())
    val locations: StateFlow<List<Location>> = _locations.asStateFlow()

    /**
     * Items with label + date filters applied and the chosen sort order. Search
     * and location are filtered server-side (see [reload]); labels, date window,
     * and sort are applied here so toggling them doesn't refetch.
     */
    val displayedItems: StateFlow<Async<List<Item>>> =
        combine(_items, selectedLabels, dateFilter, sortOrder) { items, labels, date, sort ->
            if (items is Async.Success) Async.Success(applyFilters(items.data, labels, date, sort))
            else items
        }.stateIn(viewModelScope, SharingStarted.Eagerly, Async.Loading)

    @OptIn(FlowPreview::class)
    fun start() {
        if (_started) return
        _started = true
        loadSupporting()
        viewModelScope.launch {
            combine(query.debounce(300), selectedLocation) { q, loc -> q to loc }
                .collectLatest { (q, loc) -> reload(q, loc) }
        }
        // Re-scope to the new home when the active home changes.
        viewModelScope.launch {
            activeHome.drop(1).collectLatest {
                loadSupporting()
                reload(query.value, selectedLocation.value)
            }
        }
    }

    private var _started = false

    private fun loadSupporting() {
        viewModelScope.launch {
            runCatching { repo.listLabels() }.onSuccess { _labels.value = it }
        }
        viewModelScope.launch {
            runCatching { repo.listLocations() }.onSuccess { _locations.value = it }
        }
    }

    fun setQuery(q: String) { query.value = q }

    fun toggleLabel(id: String) {
        val cur = selectedLabels.value
        selectedLabels.value = if (id in cur) cur - id else cur + id
    }

    fun setLocation(id: String?) { selectedLocation.value = id }
    fun setDateFilter(f: DateFilter) { dateFilter.value = f }
    fun setSortOrder(s: SortOrder) { sortOrder.value = s }
    fun setViewMode(m: ViewMode) { viewMode.value = m }

    /** Resets every filter (search, location, labels, date) to its default. */
    fun clearFilters() {
        query.value = ""
        selectedLocation.value = null
        selectedLabels.value = emptySet()
        dateFilter.value = DateFilter.ANY
    }

    val hasActiveFilters: Boolean
        get() = query.value.isNotBlank() || selectedLocation.value != null ||
            selectedLabels.value.isNotEmpty() || dateFilter.value != DateFilter.ANY

    fun reloadNow() {
        viewModelScope.launch { reload(query.value, selectedLocation.value) }
    }

    private suspend fun reload(q: String, locationId: String?) {
        _items.value = Async.Loading
        runCatching { repo.listItems(q = q.ifBlank { null }, locationId = locationId) }
            .onSuccess { _items.value = Async.Success(it) }
            .onFailure {
                _items.value = Async.Failure(it.toUserMessage("Failed to load items"))
            }
    }

    private fun applyFilters(
        items: List<Item>,
        labels: Set<String>,
        date: DateFilter,
        sort: SortOrder,
    ): List<Item> {
        val cutoff = date.days?.let { Instant.now().minus(it, ChronoUnit.DAYS) }
        val filtered = items.filter { item ->
            (labels.isEmpty() || item.labelIds.any { it in labels }) &&
                (cutoff == null ||
                    runCatching { Instant.parse(item.createdAt).isAfter(cutoff) }.getOrDefault(false))
        }
        return when (sort) {
            SortOrder.RECENT -> filtered.sortedByDescending { it.createdAt }
            SortOrder.OLDEST -> filtered.sortedBy { it.createdAt }
            SortOrder.NAME_ASC -> filtered.sortedBy { it.name.lowercase() }
            SortOrder.NAME_DESC -> filtered.sortedByDescending { it.name.lowercase() }
        }
    }
}
