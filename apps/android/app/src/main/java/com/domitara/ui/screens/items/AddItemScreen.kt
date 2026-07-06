package com.domitara.ui.screens.items

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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.domitara.data.dto.ItemStatus
import com.domitara.data.dto.ItemTier
import com.domitara.data.dto.Label
import com.domitara.data.dto.Location
import com.domitara.data.dto.LocationType
import com.domitara.di.appViewModel
import com.domitara.ui.common.ActionErrorHost
import com.domitara.ui.common.ColorDot
import com.domitara.ui.common.parseHexColor

@Composable
fun AddItemScreen(onBack: () -> Unit, onCreated: (String) -> Unit) {
    val vm = appViewModel { AddItemViewModel(it.dataRepository) }
    val locations by vm.locations.collectAsStateWithLifecycle()
    val labels by vm.labels.collectAsStateWithLifecycle()
    val name by vm.name.collectAsStateWithLifecycle()
    val description by vm.description.collectAsStateWithLifecycle()
    val locationId by vm.locationId.collectAsStateWithLifecycle()
    val gridRow by vm.gridRow.collectAsStateWithLifecycle()
    val gridCol by vm.gridCol.collectAsStateWithLifecycle()
    val labelIds by vm.labelIds.collectAsStateWithLifecycle()
    val status by vm.status.collectAsStateWithLifecycle()
    val tier by vm.tier.collectAsStateWithLifecycle()
    val manufacturer by vm.manufacturer.collectAsStateWithLifecycle()
    val model by vm.model.collectAsStateWithLifecycle()
    val serial by vm.serial.collectAsStateWithLifecycle()
    val purchasePrice by vm.purchasePrice.collectAsStateWithLifecycle()
    val purchasedAt by vm.purchasedAt.collectAsStateWithLifecycle()
    val warranty by vm.warranty.collectAsStateWithLifecycle()
    val insured by vm.insured.collectAsStateWithLifecycle()
    val notes by vm.notes.collectAsStateWithLifecycle()
    val assetId by vm.assetId.collectAsStateWithLifecycle()
    val saving by vm.saving.collectAsStateWithLifecycle()
    val error by vm.error.collectAsStateWithLifecycle()
    val created by vm.created.collectAsStateWithLifecycle()

    LaunchedEffect(created) {
        created?.let { onCreated(it.id) }
    }

    val selectedLocation = locations.find { it.id == locationId }
    val gridContainer = selectedLocation?.takeIf {
        it.locationType == LocationType.CONTAINER && it.gridRows != null && it.gridCols != null
    }

    ActionErrorHost(error, vm::clearError) {
        Column(Modifier.fillMaxSize()) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(8.dp)) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                }
                Text("Add item", style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                if (saving) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp).padding(end = 12.dp))
                } else {
                    TextButton(onClick = vm::submit) { Text("Save") }
                }
            }
            HorizontalDivider()

            Column(
                Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                SectionLabel("Basics")
                OutlinedTextField(
                    value = name,
                    onValueChange = { vm.name.value = it },
                    label = { Text("Name") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = description,
                    onValueChange = { vm.description.value = it },
                    label = { Text("Description") },
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = assetId,
                    onValueChange = { vm.assetId.value = it },
                    label = { Text("Asset ID") },
                    singleLine = true,
                    trailingIcon = {
                        IconButton(onClick = vm::regenerateAssetId) {
                            Icon(Icons.Filled.Refresh, contentDescription = "Regenerate asset ID")
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                )

                SectionLabel("Organization")
                LocationPicker(
                    locations = locations,
                    selectedId = locationId,
                    onSelect = vm::setLocation,
                )
                gridContainer?.let { loc ->
                    GridCellPicker(
                        rows = loc.gridRows!!,
                        cols = loc.gridCols!!,
                        row = gridRow,
                        col = gridCol,
                        onSelect = vm::setGridCell,
                    )
                }
                NewLocationForm(locations = locations, onCreate = vm::createLocation)

                LabelPicker(labels = labels, selected = labelIds, onToggle = vm::toggleLabel)
                NewLabelForm(onCreate = vm::createLabel)

                Text("Status", style = MaterialTheme.typography.labelMedium)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    ItemStatus.entries.forEach { s ->
                        FilterChip(
                            selected = status == s,
                            onClick = { vm.status.value = s },
                            label = { Text(s.name.lowercase().replaceFirstChar { c -> c.uppercase() }) },
                        )
                    }
                }

                Text("Tier", style = MaterialTheme.typography.labelMedium)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(
                        selected = tier == ItemTier.FULL,
                        onClick = { vm.tier.value = ItemTier.FULL },
                        label = { Text("Full") },
                    )
                    FilterChip(
                        selected = tier == ItemTier.QUICK,
                        onClick = { vm.tier.value = ItemTier.QUICK },
                        label = { Text("Quick") },
                    )
                }
                Text(
                    "Quick items are hidden from the item list by default.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )

                SectionLabel("Product details")
                OutlinedTextField(
                    value = manufacturer,
                    onValueChange = { vm.manufacturer.value = it },
                    label = { Text("Manufacturer") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = model,
                    onValueChange = { vm.model.value = it },
                    label = { Text("Model") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = serial,
                    onValueChange = { vm.serial.value = it },
                    label = { Text("Serial number") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )

                SectionLabel("Purchase & value")
                OutlinedTextField(
                    value = purchasePrice,
                    onValueChange = { vm.purchasePrice.value = it.filter { c -> c.isDigit() || c == '.' } },
                    label = { Text("Purchase price") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = purchasedAt,
                    onValueChange = { vm.purchasedAt.value = it },
                    label = { Text("Purchase date (YYYY-MM-DD)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = warranty,
                    onValueChange = { vm.warranty.value = it },
                    label = { Text("Warranty") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Insured", modifier = Modifier.weight(1f))
                    Switch(checked = insured, onCheckedChange = { vm.insured.value = it })
                }

                SectionLabel("Notes")
                OutlinedTextField(
                    value = notes,
                    onValueChange = { vm.notes.value = it },
                    label = { Text("Notes") },
                    modifier = Modifier.fillMaxWidth(),
                )

                Spacer(Modifier.padding(top = 8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = vm::submit, enabled = !saving) { Text("Save item") }
                    OutlinedButton(onClick = onBack) { Text("Cancel") }
                }
                Spacer(Modifier.padding(bottom = 24.dp))
            }
        }
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.titleMedium,
        modifier = Modifier.padding(top = 4.dp),
    )
}

@Composable
private fun LocationPicker(
    locations: List<Location>,
    selectedId: String?,
    onSelect: (String?) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val byId = locations.associateBy { it.id }
    val selectedName = selectedId?.let { byId[it]?.name } ?: "No location"

    Box {
        DropdownFieldChip(
            label = selectedName,
            onClick = { expanded = true },
        )
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            DropdownMenuItem(
                text = { Text("No location") },
                onClick = { onSelect(null); expanded = false },
                trailingIcon = if (selectedId == null) {
                    { Icon(Icons.Filled.Check, contentDescription = "Selected") }
                } else null,
            )
            locations.sortedBy { it.name }.forEach { loc ->
                DropdownMenuItem(
                    text = { Text(loc.name) },
                    onClick = { onSelect(loc.id); expanded = false },
                    trailingIcon = if (selectedId == loc.id) {
                        { Icon(Icons.Filled.Check, contentDescription = "Selected") }
                    } else null,
                )
            }
        }
    }
}

@Composable
private fun GridCellPicker(
    rows: Int,
    cols: Int,
    row: Int?,
    col: Int?,
    onSelect: (Int?, Int?) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val label = if (row != null && col != null) "R${row + 1}C${col + 1}" else "Choose a cell (optional)"

    Box {
        DropdownFieldChip(label = label, onClick = { expanded = true })
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            DropdownMenuItem(
                text = { Text("No cell") },
                onClick = { onSelect(null, null); expanded = false },
            )
            for (r in 0 until rows) {
                for (c in 0 until cols) {
                    DropdownMenuItem(
                        text = { Text("R${r + 1}C${c + 1}") },
                        onClick = { onSelect(r, c); expanded = false },
                    )
                }
            }
        }
    }
}

@Composable
private fun DropdownFieldChip(label: String, onClick: () -> Unit) {
    FilterChip(
        selected = false,
        onClick = onClick,
        label = { Text(label) },
        trailingIcon = { Icon(Icons.Filled.ArrowDropDown, contentDescription = null) },
    )
}

@Composable
private fun NewLocationForm(locations: List<Location>, onCreate: (name: String, parentId: String?) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    if (!expanded) {
        TextButton(onClick = { expanded = true }) { Text("+ New location") }
        return
    }
    var name by remember { mutableStateOf("") }
    var parentId by remember { mutableStateOf<String?>(null) }
    var parentExpanded by remember { mutableStateOf(false) }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("New location", style = MaterialTheme.typography.labelMedium)
        OutlinedTextField(
            value = name,
            onValueChange = { name = it },
            label = { Text("Name") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        Box {
            DropdownFieldChip(
                label = locations.find { it.id == parentId }?.name ?: "Top-level",
                onClick = { parentExpanded = true },
            )
            DropdownMenu(expanded = parentExpanded, onDismissRequest = { parentExpanded = false }) {
                DropdownMenuItem(
                    text = { Text("Top-level") },
                    onClick = { parentId = null; parentExpanded = false },
                )
                locations.sortedBy { it.name }.forEach { loc ->
                    DropdownMenuItem(
                        text = { Text(loc.name) },
                        onClick = { parentId = loc.id; parentExpanded = false },
                    )
                }
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = {
                if (name.isNotBlank()) {
                    onCreate(name.trim(), parentId)
                    expanded = false
                    name = ""
                    parentId = null
                }
            }) { Text("Create") }
            OutlinedButton(onClick = { expanded = false }) { Text("Cancel") }
        }
    }
}

@Composable
private fun LabelPicker(labels: List<Label>, selected: Set<String>, onToggle: (String) -> Unit) {
    Text("Labels", style = MaterialTheme.typography.labelMedium)
    if (labels.isEmpty()) {
        Text(
            "No labels yet.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    } else {
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(labels, key = { it.id }) { label ->
                FilterChip(
                    selected = label.id in selected,
                    onClick = { onToggle(label.id) },
                    label = { Text(label.name) },
                    leadingIcon = { ColorDot(parseHexColor(label.color), size = 10) },
                )
            }
        }
    }
}

@Composable
private fun NewLabelForm(onCreate: (name: String, color: String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    if (!expanded) {
        TextButton(onClick = { expanded = true }) { Text("+ New label") }
        return
    }
    var name by remember { mutableStateOf("") }
    var color by remember { mutableStateOf(LABEL_COLOR_PRESETS[0]) }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("New label", style = MaterialTheme.typography.labelMedium)
        OutlinedTextField(
            value = name,
            onValueChange = { name = it },
            label = { Text("Name") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            LABEL_COLOR_PRESETS.forEach { hex ->
                val swatch = parseHexColor(hex)
                Box(
                    modifier = Modifier
                        .size(24.dp)
                        .background(swatch, CircleShape)
                        .border(
                            width = if (color == hex) 2.dp else 0.dp,
                            color = if (color == hex) MaterialTheme.colorScheme.onSurface else Color.Transparent,
                            shape = CircleShape,
                        )
                        .clickable { color = hex },
                )
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = {
                if (name.isNotBlank()) {
                    onCreate(name.trim(), color)
                    expanded = false
                    name = ""
                    color = LABEL_COLOR_PRESETS[0]
                }
            }) { Text("Create") }
            OutlinedButton(onClick = { expanded = false }) { Text("Cancel") }
        }
    }
}
