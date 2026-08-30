package com.domitara.ui.screens.locations

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.domitara.data.dto.Item
import com.domitara.data.dto.Location
import com.domitara.data.dto.LocationPaint
import com.domitara.data.dto.LocationPaintInput
import com.domitara.data.dto.LocationType
import com.domitara.data.dto.PaintColor
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
import com.domitara.ui.screens.paint.PaintColorDialog

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
                LocationDialog(
                    initial = null,
                    locations = allLocations,
                    onDismiss = { showAdd = false },
                    onSubmit = { name, parentId, description, type, rows, cols ->
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
    val paintColors by vm.paintColors.collectAsStateWithLifecycle()
    val locationsState by vm.locations.collectAsStateWithLifecycle()
    val allLocations = (locationsState as? Async.Success)?.data ?: emptyList()
    val subLocations = allLocations.filter { it.parentId == location.id }

    var showEdit by remember(location.id) { mutableStateOf(false) }
    var confirmDelete by remember(location.id) { mutableStateOf(false) }
    var showAssignPaint by remember(location.id) { mutableStateOf(false) }
    var editingPaint by remember(location.id) { mutableStateOf<LocationPaint?>(null) }
    var deletingPaint by remember(location.id) { mutableStateOf<LocationPaint?>(null) }
    var showNewColor by remember(location.id) { mutableStateOf(false) }

    Column(Modifier.fillMaxSize()) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(start = 8.dp, end = 4.dp, top = 8.dp, bottom = 8.dp),
        ) {
            IconButton(onClick = vm::clearSelection) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
            }
            Text(
                location.name,
                style = MaterialTheme.typography.titleLarge,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )
            TextButton(onClick = { showEdit = true }) { Text("Edit") }
            IconButton(onClick = { confirmDelete = true }) {
                Icon(Icons.Filled.Delete, contentDescription = "Delete location")
            }
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
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 16.dp, end = 4.dp, top = 8.dp, bottom = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        "Paint",
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.weight(1f),
                    )
                    TextButton(onClick = { showAssignPaint = true }) { Text("Assign") }
                }
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
                            PaintAssignmentRow(
                                row = row,
                                onEdit = { editingPaint = row },
                                onDelete = { deletingPaint = row },
                            )
                            HorizontalDivider()
                        }
                    }
            }
        }
    }

    if (showEdit) {
        LocationDialog(
            initial = location,
            locations = allLocations,
            onDismiss = { showEdit = false },
            onSubmit = { name, parentId, description, type, rows, cols ->
                vm.updateLocation(location.id, name, parentId, description, type, rows, cols)
                showEdit = false
            },
        )
    }

    if (confirmDelete) {
        val childCount = subLocations.size
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text("Delete location?") },
            text = {
                Text(
                    buildString {
                        append("\"${location.name}\" will be deleted. ")
                        if (location.itemCount > 0) {
                            append("${location.itemCount} item")
                            append(if (location.itemCount == 1) " " else "s ")
                            append("here will become unassigned. ")
                        }
                        if (childCount > 0) {
                            append("$childCount child location")
                            append(if (childCount == 1) " " else "s ")
                            append("will move to the top level. ")
                        }
                        append("This cannot be undone.")
                    },
                )
            },
            confirmButton = {
                TextButton(onClick = { confirmDelete = false; vm.deleteLocation(location.id) }) {
                    Text("Delete", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Cancel") } },
        )
    }

    if (showAssignPaint) {
        LocationPaintDialog(
            initial = null,
            paintColors = paintColors,
            onDismiss = { showAssignPaint = false },
            onCreateColor = { showNewColor = true },
            onSubmit = { input ->
                vm.assignPaint(location.id, input)
                showAssignPaint = false
            },
        )
    }

    editingPaint?.let { row ->
        LocationPaintDialog(
            initial = row,
            paintColors = paintColors,
            onDismiss = { editingPaint = null },
            onCreateColor = { showNewColor = true },
            onSubmit = { input ->
                vm.updatePaint(row.id, location.id, input)
                editingPaint = null
            },
        )
    }

    deletingPaint?.let { row ->
        AlertDialog(
            onDismissRequest = { deletingPaint = null },
            title = { Text("Remove paint?") },
            text = {
                Text(
                    "Remove ${row.paintName} from " +
                        "${surfaceLabel(row.surface).lowercase()} on \"${location.name}\"?",
                )
            },
            confirmButton = {
                TextButton(onClick = { vm.deletePaint(row.id, location.id); deletingPaint = null }) {
                    Text("Remove", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = { TextButton(onClick = { deletingPaint = null }) { Text("Cancel") } },
        )
    }

    if (showNewColor) {
        PaintColorDialog(
            initial = null,
            onDismiss = { showNewColor = false },
            onSubmit = { name, hex, brand, code, sheen, notes ->
                vm.createPaintColor(name, hex, brand, code, sheen, notes)
                showNewColor = false
            },
        )
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
private fun PaintAssignmentRow(
    row: LocationPaint,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onEdit)
            .padding(start = 16.dp, end = 4.dp, top = 12.dp, bottom = 12.dp),
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
        IconButton(onClick = onDelete) {
            Icon(
                Icons.Filled.Delete,
                contentDescription = "Remove ${surfaceLabel(row.surface).lowercase()} paint",
                tint = MaterialTheme.colorScheme.error,
            )
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
private fun LocationDialog(
    initial: Location?,
    locations: List<Location>,
    onDismiss: () -> Unit,
    onSubmit: (
        name: String,
        parentId: String?,
        description: String?,
        type: LocationType,
        gridRows: Int?,
        gridCols: Int?,
    ) -> Unit,
) {
    val isEdit = initial != null
    var name by remember { mutableStateOf(initial?.name ?: "") }
    var description by remember { mutableStateOf(initial?.description ?: "") }
    var type by remember { mutableStateOf(initial?.locationType ?: LocationType.ROOM) }
    var gridRows by remember { mutableStateOf(initial?.gridRows?.toString() ?: "") }
    var gridCols by remember { mutableStateOf(initial?.gridCols?.toString() ?: "") }
    var parentId by remember { mutableStateOf(initial?.parentId) }
    var parentMenuExpanded by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (isEdit) "Edit location" else "Add location") },
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
                            .filter { (loc, _) ->
                                loc.locationType == LocationType.ROOM && loc.id != initial?.id
                            }
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
                    onSubmit(
                        name.ifBlank { "New location" },
                        parentId,
                        description.ifBlank { null },
                        type,
                        if (type == LocationType.CONTAINER) gridRows.toIntOrNull() else null,
                        if (type == LocationType.CONTAINER) gridCols.toIntOrNull() else null,
                    )
                },
            ) { Text(if (isEdit) "Save" else "Create") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

private val PAINT_SURFACES = listOf(
    PaintSurface.WALLS,
    PaintSurface.CEILING,
    PaintSurface.TRIM,
    PaintSurface.DOORS,
    PaintSurface.ACCENT,
)

/**
 * Assign / edit dialog for a location's paint on one surface. `initial` non-null
 * puts it in edit mode. Mirrors the web `AssignLocationPaintModal`.
 */
@Composable
private fun LocationPaintDialog(
    initial: LocationPaint?,
    paintColors: List<PaintColor>,
    onDismiss: () -> Unit,
    onCreateColor: () -> Unit,
    onSubmit: (LocationPaintInput) -> Unit,
) {
    val isEdit = initial != null
    var paintColorId by remember { mutableStateOf(initial?.paintColorId) }
    var surface by remember { mutableStateOf(initial?.surface ?: PaintSurface.WALLS) }
    var surfaceNote by remember { mutableStateOf(initial?.surfaceNote ?: "") }
    var paintedOn by remember { mutableStateOf(initial?.paintedOn ?: "") }
    var coats by remember { mutableStateOf(initial?.coats?.toString() ?: "") }
    var notes by remember { mutableStateOf(initial?.notes ?: "") }
    var colorMenuExpanded by remember { mutableStateOf(false) }
    var surfaceMenuExpanded by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (isEdit) "Edit paint" else "Assign paint") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Paint color", style = MaterialTheme.typography.labelMedium)
                Box {
                    FilterChip(
                        selected = paintColorId != null,
                        onClick = { colorMenuExpanded = true },
                        label = {
                            Text(paintColors.find { it.id == paintColorId }?.name ?: "Pick a color")
                        },
                        trailingIcon = { Icon(Icons.Filled.ArrowDropDown, contentDescription = null) },
                    )
                    DropdownMenu(
                        expanded = colorMenuExpanded,
                        onDismissRequest = { colorMenuExpanded = false },
                    ) {
                        paintColors.forEach { color ->
                            DropdownMenuItem(
                                text = { Text(color.name) },
                                onClick = { paintColorId = color.id; colorMenuExpanded = false },
                                trailingIcon = if (paintColorId == color.id) {
                                    { Icon(Icons.Filled.Check, contentDescription = "Selected") }
                                } else null,
                            )
                        }
                        if (paintColors.isEmpty()) {
                            DropdownMenuItem(
                                text = { Text("No paint colors yet") },
                                onClick = { colorMenuExpanded = false },
                                enabled = false,
                            )
                        }
                    }
                }
                TextButton(
                    onClick = { colorMenuExpanded = false; onCreateColor() },
                    contentPadding = PaddingValues(0.dp),
                ) { Text("+ New paint color") }

                Text("Surface", style = MaterialTheme.typography.labelMedium)
                Box {
                    FilterChip(
                        selected = true,
                        onClick = { surfaceMenuExpanded = true },
                        label = { Text(surfaceLabel(surface)) },
                        trailingIcon = { Icon(Icons.Filled.ArrowDropDown, contentDescription = null) },
                    )
                    DropdownMenu(
                        expanded = surfaceMenuExpanded,
                        onDismissRequest = { surfaceMenuExpanded = false },
                    ) {
                        PAINT_SURFACES.forEach { s ->
                            DropdownMenuItem(
                                text = { Text(surfaceLabel(s)) },
                                onClick = { surface = s; surfaceMenuExpanded = false },
                                trailingIcon = if (surface == s) {
                                    { Icon(Icons.Filled.Check, contentDescription = "Selected") }
                                } else null,
                            )
                        }
                    }
                }
                if (surface == PaintSurface.ACCENT) {
                    OutlinedTextField(
                        value = surfaceNote,
                        onValueChange = { surfaceNote = it },
                        label = { Text("Accent note (e.g. east wall)") },
                        singleLine = true,
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = paintedOn,
                        onValueChange = { paintedOn = it },
                        label = { Text("Painted on (YYYY-MM-DD)") },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                    )
                    OutlinedTextField(
                        value = coats,
                        onValueChange = { coats = it.filter(Char::isDigit) },
                        label = { Text("Coats") },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                    )
                }
                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text("Notes (optional)") },
                )
            }
        },
        confirmButton = {
            TextButton(
                enabled = paintColorId != null,
                onClick = {
                    val id = paintColorId ?: return@TextButton
                    onSubmit(
                        LocationPaintInput(
                            paintColorId = id,
                            surface = surface,
                            surfaceNote = if (surface == PaintSurface.ACCENT) {
                                surfaceNote.ifBlank { null }
                            } else {
                                null
                            },
                            paintedOn = paintedOn.ifBlank { null },
                            coats = coats.toIntOrNull(),
                            notes = notes.ifBlank { null },
                        ),
                    )
                },
            ) { Text(if (isEdit) "Save" else "Assign") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}
