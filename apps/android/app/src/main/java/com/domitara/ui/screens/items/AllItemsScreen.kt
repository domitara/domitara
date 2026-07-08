package com.domitara.ui.screens.items

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.domitara.di.appViewModel
import com.domitara.ui.common.Async
import com.domitara.ui.common.GridViewIcon
import com.domitara.ui.common.SortIcon
import com.domitara.ui.common.EmptyState
import com.domitara.ui.common.ErrorState
import com.domitara.ui.common.LoadingState
import com.domitara.ui.common.indentedLocationLabel
import com.domitara.ui.common.sortedWithDepth

@Composable
fun AllItemsScreen(onOpenItem: (String) -> Unit, onAddItem: () -> Unit = {}) {
    val vm = appViewModel { AllItemsViewModel(it.dataRepository, it.activeHomeId) }
    LaunchedEffect(Unit) {
        vm.start()
        vm.reloadNow()
    }

    val query by vm.query.collectAsStateWithLifecycle()
    val itemsState by vm.displayedItems.collectAsStateWithLifecycle()
    val labels by vm.labels.collectAsStateWithLifecycle()
    val selectedLabels by vm.selectedLabels.collectAsStateWithLifecycle()
    val locations by vm.locations.collectAsStateWithLifecycle()
    val selectedLocation by vm.selectedLocation.collectAsStateWithLifecycle()
    val dateFilter by vm.dateFilter.collectAsStateWithLifecycle()
    val sortOrder by vm.sortOrder.collectAsStateWithLifecycle()
    val viewMode by vm.viewMode.collectAsStateWithLifecycle()
    val includeQuick by vm.includeQuick.collectAsStateWithLifecycle()

    val labelsById = remember(labels) { labels.associateBy { it.id } }
    val locationNames = remember(locations) { locations.associate { it.id to it.name } }

    Column(Modifier.fillMaxSize()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(
                value = query,
                onValueChange = vm::setQuery,
                placeholder = { Text("Search items…") },
                leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                singleLine = true,
                modifier = Modifier.weight(1f).padding(horizontal = 16.dp, vertical = 8.dp),
            )
            IconButton(onClick = onAddItem) {
                Icon(Icons.Filled.Add, contentDescription = "Add item")
            }
        }

        // Filter / sort toolbar (scrollable) + grid/list toggle (fixed).
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                modifier = Modifier.weight(1f).horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                DropdownFilter(
                    label = selectedLocation?.let { locationNames[it] } ?: "All locations",
                    leadingIcon = Icons.Filled.Place,
                    active = selectedLocation != null,
                    options = buildList {
                        add("All locations" to null)
                        locations.sortedWithDepth().forEach { (loc, depth) ->
                            add(indentedLocationLabel(loc.name, depth) to loc.id)
                        }
                    },
                    selectedValue = selectedLocation,
                    onSelect = vm::setLocation,
                )
                DropdownFilter(
                    label = if (dateFilter == DateFilter.ANY) "Date" else dateFilter.label,
                    leadingIcon = Icons.Filled.DateRange,
                    active = dateFilter != DateFilter.ANY,
                    options = DateFilter.entries.map { it.label to it },
                    selectedValue = dateFilter,
                    onSelect = vm::setDateFilter,
                )
                DropdownFilter(
                    label = sortOrder.label,
                    leadingIcon = SortIcon,
                    active = sortOrder != SortOrder.RECENT,
                    options = SortOrder.entries.map { it.label to it },
                    selectedValue = sortOrder,
                    onSelect = vm::setSortOrder,
                )
                FilterChip(
                    selected = includeQuick,
                    onClick = { vm.setIncludeQuick(!includeQuick) },
                    label = { Text("Quick items") },
                )
            }
            IconButton(
                onClick = {
                    vm.setViewMode(if (viewMode == ViewMode.LIST) ViewMode.GRID else ViewMode.LIST)
                },
            ) {
                if (viewMode == ViewMode.LIST) {
                    Icon(GridViewIcon, contentDescription = "Grid view")
                } else {
                    Icon(Icons.AutoMirrored.Filled.List, contentDescription = "List view")
                }
            }
        }

        if (labels.isNotEmpty()) {
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(labels, key = { it.id }) { label ->
                    FilterChip(
                        selected = label.id in selectedLabels,
                        onClick = { vm.toggleLabel(label.id) },
                        label = { Text(label.name) },
                    )
                }
            }
        }

        if (vm.hasActiveFilters) {
            TextButton(
                onClick = vm::clearFilters,
                modifier = Modifier.padding(horizontal = 8.dp),
            ) {
                Text("Clear filters")
            }
        }

        when (val s = itemsState) {
            Async.Loading -> LoadingState()
            is Async.Failure -> ErrorState(s.message, onRetry = vm::reloadNow)
            is Async.Success -> {
                if (s.data.isEmpty()) {
                    EmptyState("No items found", "Try a different search or filter.")
                } else if (viewMode == ViewMode.GRID) {
                    LazyVerticalGrid(
                        columns = GridCells.Adaptive(minSize = 160.dp),
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        items(s.data, key = { it.id }) { item ->
                            ItemGridCard(
                                item = item,
                                labelsById = labelsById,
                                locationName = item.locationId?.let { locationNames[it] },
                                onClick = { onOpenItem(item.id) },
                            )
                        }
                    }
                } else {
                    LazyColumn(Modifier.fillMaxSize()) {
                        items(s.data, key = { it.id }) { item ->
                            ItemRow(
                                item = item,
                                labelsById = labelsById,
                                locationName = item.locationId?.let { locationNames[it] },
                                onClick = { onOpenItem(item.id) },
                            )
                            HorizontalDivider()
                        }
                    }
                }
            }
        }
    }
}

/**
 * A [FilterChip] that opens a single-select dropdown. [active] highlights the
 * chip when a non-default value is chosen; a check marks the current selection.
 */
@Composable
private fun <T> DropdownFilter(
    label: String,
    leadingIcon: ImageVector,
    active: Boolean,
    options: List<Pair<String, T>>,
    selectedValue: T,
    onSelect: (T) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    Box {
        FilterChip(
            selected = active,
            onClick = { expanded = true },
            label = { Text(label) },
            leadingIcon = {
                Icon(
                    leadingIcon,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                )
            },
            trailingIcon = {
                Icon(Icons.Filled.ArrowDropDown, contentDescription = null)
            },
        )
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { (text, value) ->
                DropdownMenuItem(
                    text = { Text(text) },
                    onClick = {
                        onSelect(value)
                        expanded = false
                    },
                    trailingIcon = if (value == selectedValue) {
                        { Icon(Icons.Filled.Check, contentDescription = "Selected") }
                    } else null,
                )
            }
        }
    }
}
