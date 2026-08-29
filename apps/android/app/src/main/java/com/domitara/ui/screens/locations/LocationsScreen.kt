package com.domitara.ui.screens.locations

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.domitara.data.dto.Item
import com.domitara.data.dto.Location
import com.domitara.data.dto.LocationPaint
import com.domitara.data.dto.LocationType
import com.domitara.data.dto.PaintSurface
import com.domitara.di.appViewModel
import com.domitara.ui.common.ActionErrorHost
import com.domitara.ui.common.Async
import com.domitara.ui.common.EmptyState
import com.domitara.ui.common.ErrorState
import com.domitara.ui.common.LoadingState
import com.domitara.ui.common.indentedLocationLabel
import com.domitara.ui.common.parseHexColor
import com.domitara.ui.common.sortedWithDepth
import com.domitara.ui.screens.items.ItemRow

private data class TreeRow(val location: Location, val depth: Int, val hasChildren: Boolean)

@Composable
fun LocationsScreen() {
    val vm = appViewModel { LocationsViewModel(it.dataRepository, it.activeHomeId) }
    val locationsState by vm.locations.collectAsStateWithLifecycle()
    val selected by vm.selected.collectAsStateWithLifecycle()
    val actionError by vm.actionError.collectAsStateWithLifecycle()
    var showAdd by remember { mutableStateOf(false) }

    ActionErrorHost(actionError, vm::clearActionError) {
        if (selected != null) {
            LocationDetail(location = selected!!, vm = vm)
        } else {
            val query by vm.query.collectAsStateWithLifecycle()
            val expanded by vm.expanded.collectAsStateWithLifecycle()
            val allLocations = (locationsState as? Async.Success)?.data ?: emptyList()

            Column(Modifier.fillMaxSize()) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = query,
                        onValueChange = vm::setQuery,
                        placeholder = { Text("Search locations…") },
                        leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                        singleLine = true,
                        modifier = Modifier.weight(1f).padding(horizontal = 16.dp, vertical = 8.dp),
                    )
                    IconButton(onClick = { showAdd = true }) {
                        Icon(Icons.Filled.Add, contentDescription = "Add location")
                    }
                }

                when (val s = locationsState) {
                    Async.Loading -> LoadingState()
                    is Async.Failure -> ErrorState(s.message, onRetry = vm::load)
                    is Async.Success -> {
                        val rows = buildRows(s.data, expanded, query)
                        if (rows.isEmpty()) {
                            EmptyState("No locations found")
                        } else {
                            LazyColumn(Modifier.fillMaxSize()) {
                                items(rows, key = { it.location.id }) { row ->
                                    LocationRow(
                                        row = row,
                                        isExpanded = row.location.id in expanded,
                                        onToggle = { vm.toggleExpand(row.location.id) },
                                        onSelect = { vm.select(row.location) },
                                    )
                                    HorizontalDivider()
                                }
                            }
                        }
                    }
                }
            }

            if (showAdd) {
                AddLocationDialog(
                    locations = allLocations,
                    onDismiss = { showAdd = false },
                    onCreate = { name, parentId, description, type, rows, cols ->
                        vm.createLocation(name, parentId, description, type, rows, cols)
                        showAdd = false
                    },
                )
            }
        }
    }
}

private fun buildRows(
    all: List<Location>,
    expanded: Set<String>,
    query: String,
): List<TreeRow> {
    if (query.isNotBlank()) {
        return all.filter { it.name.contains(query, ignoreCase = true) }
            .sortedBy { it.name }
            .map { TreeRow(it, depth = 0, hasChildren = false) }
    }
    val byParent = all.groupBy { it.parentId }
    fun flatten(parentId: String?, depth: Int): List<TreeRow> =
        (byParent[parentId] ?: emptyList()).sortedBy { it.name }.flatMap { loc ->
            val children = byParent[loc.id].orEmpty()
            val self = TreeRow(loc, depth, children.isNotEmpty())
            if (loc.id in expanded) listOf(self) + flatten(loc.id, depth + 1) else listOf(self)
        }
    return flatten(null, 0)
}

@Composable
private fun LocationRow(
    row: TreeRow,
    isExpanded: Boolean,
    onToggle: () -> Unit,
    onSelect: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onSelect)
            .padding(start = (16 + row.depth * 20).dp, top = 12.dp, bottom = 12.dp, end = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (row.hasChildren) {
            IconButton(onClick = onToggle, modifier = Modifier.size(28.dp)) {
                Icon(
                    if (isExpanded) Icons.Filled.KeyboardArrowDown else Icons.AutoMirrored.Filled.KeyboardArrowRight,
                    contentDescription = if (isExpanded) "Collapse" else "Expand",
                )
            }
        } else {
            Box(Modifier.size(28.dp)) {
                Icon(
                    Icons.Filled.Place,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp).padding(start = 4.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        Spacer(Modifier.width(8.dp))
        Text(row.location.name, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
        Text(
            "${row.location.itemCount}",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun LocationDetail(location: Location, vm: LocationsViewModel) {
    val itemsState by vm.items.collectAsStateWithLifecycle()
    val paintState by vm.paint.collectAsStateWithLifecycle()
    val locationsState by vm.locations.collectAsStateWithLifecycle()
    val allLocations = (locationsState as? Async.Success)?.data ?: emptyList()
    val subLocations = allLocations.filter { it.parentId == location.id }

    Column(Modifier.fillMaxSize()) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 8.dp),
        ) {
            IconButton(onClick = vm::clearSelection) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
            }
            Text(location.name, style = MaterialTheme.typography.titleLarge)
        }
        HorizontalDivider()

        LazyColumn(Modifier.fillMaxSize()) {
            location.description?.let { desc ->
                item {
                    Text(
                        desc,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(16.dp),
                    )
                }
            }
            item {
                Text(
                    "${location.itemCount} items · ${subLocations.size} sub-locations",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                )
            }

            if (subLocations.isNotEmpty()) {
                item {
                    Text(
                        "Sub-locations",
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    )
                }
                items(subLocations, key = { "sub-${it.id}" }) { sub ->
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .clickable { vm.select(sub) }
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Filled.Place, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(sub.name, modifier = Modifier.weight(1f))
                        Text("${sub.itemCount}", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    HorizontalDivider()
                }
            }

            if (location.locationType == LocationType.CONTAINER) {
                item {
                    Text(
                        "Cabinet grid",
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    )
                }
                val gridRows = location.gridRows
                val gridCols = location.gridCols
                when (val s = itemsState) {
                    Async.Loading -> item { Box(Modifier.fillMaxWidth().padding(24.dp)) { LoadingState() } }
                    is Async.Failure -> item { ErrorState(s.message) }
                    is Async.Success -> {
                        if (gridRows == null || gridCols == null) {
                            item {
                                Text(
                                    "This container doesn't have a grid defined yet.",
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(16.dp),
                                )
                            }
                        } else {
                            val itemsByCell = s.data
                                .filter { it.gridRow != null && it.gridCol != null }
                                .groupBy { it.gridRow to it.gridCol }
                            items((0 until gridRows).toList(), key = { "grid-row-$it" }) { r ->
                                CabinetGridRow(row = r, cols = gridCols, itemsByCell = itemsByCell)
                            }
                        }
                    }
                }
            } else {
                item {
                    Text(
                        "Items",
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    )
                }
                when (val s = itemsState) {
                    Async.Loading -> item { Box(Modifier.fillMaxWidth().padding(24.dp)) { LoadingState() } }
                    is Async.Failure -> item { ErrorState(s.message) }
                    is Async.Success ->
                        if (s.data.isEmpty()) {
                            item {
                                Text(
                                    "No items in this location.",
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(16.dp),
                                )
                            }
                        } else {
                            items(s.data, key = { it.id }) { item ->
                                ItemRow(
                                    item = item,
                                    labelsById = emptyMap(),
                                    locationName = null,
                                    onClick = {},
                                )
                                HorizontalDivider()
                            }
                        }
                }
            }

            item {
                Text(
                    "Paint",
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                )
            }
            when (val s = paintState) {
                Async.Loading -> item { Box(Modifier.fillMaxWidth().padding(24.dp)) { LoadingState() } }
                is Async.Failure -> item { ErrorState(s.message) }
                is Async.Success ->
                    if (s.data.isEmpty()) {
                        item {
                            Text(
                                "No paint recorded for this location.",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(16.dp),
                            )
                        }
                    } else {
                        items(s.data, key = { "paint-${it.id}" }) { row ->
                            PaintAssignmentRow(row)
                            HorizontalDivider()
                        }
                    }
            }
        }
    }
}

private fun surfaceLabel(surface: PaintSurface): String = when (surface) {
    PaintSurface.WALLS -> "Walls"
    PaintSurface.CEILING -> "Ceiling"
    PaintSurface.TRIM -> "Trim"
    PaintSurface.DOORS -> "Doors"
    PaintSurface.ACCENT -> "Accent"
}

@Composable
private fun PaintAssignmentRow(row: LocationPaint) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .size(20.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(parseHexColor(row.paintColor))
                .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(4.dp)),
        )
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            val head = buildString {
                append(surfaceLabel(row.surface))
                if (row.surface == PaintSurface.ACCENT && !row.surfaceNote.isNullOrBlank()) {
                    append(" · ")
                    append(row.surfaceNote)
                }
            }
            Text(head, style = MaterialTheme.typography.titleMedium)
            val sub = listOfNotNull(
                row.paintName,
                row.paintBrand,
                row.paintColorCode,
                row.paintSheen,
                row.paintedOn?.let { "painted $it" },
                row.coats?.let { "$it coat${if (it == 1) "" else "s"}" },
            ).joinToString(" · ")
            Text(
                sub,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (!row.notes.isNullOrBlank()) {
                Text(
                    row.notes,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun CabinetGridRow(
    row: Int,
    cols: Int,
    itemsByCell: Map<Pair<Int?, Int?>, List<Item>>,
) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp)) {
        for (c in 0 until cols) {
            val cellItems = itemsByCell[row to c].orEmpty()
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(4.dp)
                    .border(1.dp, MaterialTheme.colorScheme.outlineVariant)
                    .padding(8.dp),
            ) {
                Text(
                    "R${row + 1}C${c + 1}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (cellItems.isEmpty()) {
                    Text(
                        "—",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                } else {
                    cellItems.forEach { it2 ->
                        Text(it2.name, style = MaterialTheme.typography.bodySmall, maxLines = 1)
                    }
                }
            }
        }
    }
}

@Composable
private fun AddLocationDialog(
    locations: List<Location>,
    onDismiss: () -> Unit,
    onCreate: (
        name: String,
        parentId: String?,
        description: String?,
        type: LocationType,
        gridRows: Int?,
        gridCols: Int?,
    ) -> Unit,
) {
    var name by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var type by remember { mutableStateOf(LocationType.ROOM) }
    var gridRows by remember { mutableStateOf("") }
    var gridCols by remember { mutableStateOf("") }
    var parentId by remember { mutableStateOf<String?>(null) }
    var parentMenuExpanded by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add location") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Name") },
                    singleLine = true,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(
                        selected = type == LocationType.ROOM,
                        onClick = { type = LocationType.ROOM },
                        label = { Text("Room") },
                    )
                    FilterChip(
                        selected = type == LocationType.CONTAINER,
                        onClick = { type = LocationType.CONTAINER },
                        label = { Text("Container") },
                    )
                }
                if (type == LocationType.CONTAINER) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = gridRows,
                            onValueChange = { gridRows = it.filter(Char::isDigit) },
                            label = { Text("Grid rows") },
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                        )
                        OutlinedTextField(
                            value = gridCols,
                            onValueChange = { gridCols = it.filter(Char::isDigit) },
                            label = { Text("Grid cols") },
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
                Box {
                    FilterChip(
                        selected = parentId != null,
                        onClick = { parentMenuExpanded = true },
                        label = { Text(locations.find { it.id == parentId }?.name ?: "No parent") },
                        trailingIcon = { Icon(Icons.Filled.ArrowDropDown, contentDescription = null) },
                    )
                    DropdownMenu(expanded = parentMenuExpanded, onDismissRequest = { parentMenuExpanded = false }) {
                        DropdownMenuItem(
                            text = { Text("No parent") },
                            onClick = { parentId = null; parentMenuExpanded = false },
                            trailingIcon = if (parentId == null) {
                                { Icon(Icons.Filled.Check, contentDescription = "Selected") }
                            } else null,
                        )
                        locations.sortedWithDepth()
                            .filter { (loc, _) -> loc.locationType == LocationType.ROOM }
                            .forEach { (loc, depth) ->
                                DropdownMenuItem(
                                    text = { Text(indentedLocationLabel(loc.name, depth)) },
                                    onClick = { parentId = loc.id; parentMenuExpanded = false },
                                    trailingIcon = if (parentId == loc.id) {
                                        { Icon(Icons.Filled.Check, contentDescription = "Selected") }
                                    } else null,
                                )
                            }
                    }
                }
                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Description (optional)") },
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    onCreate(
                        name.ifBlank { "New location" },
                        parentId,
                        description.ifBlank { null },
                        type,
                        if (type == LocationType.CONTAINER) gridRows.toIntOrNull() else null,
                        if (type == LocationType.CONTAINER) gridCols.toIntOrNull() else null,
                    )
                },
            ) { Text("Create") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}
