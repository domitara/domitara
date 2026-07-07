package com.domitara.ui.screens.items

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.domitara.data.dto.CustomField
import com.domitara.data.dto.ItemStatus
import com.domitara.data.dto.ItemTier
import com.domitara.data.dto.Label
import com.domitara.data.dto.Location
import com.domitara.data.dto.LocationType
import com.domitara.ui.common.ColorDot
import com.domitara.ui.common.parseHexColor
import kotlinx.coroutines.flow.MutableStateFlow

/** Preset label colors offered when creating a label inline, mirroring the web app. */
val LABEL_COLOR_PRESETS = listOf(
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#64748b",
)

/** Random asset ID in the server's `DT-XXXXXX` format. */
fun generateAssetId(): String {
    val chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    return "DT-" + (1..6).map { chars.random() }.joinToString("")
}

/** Turns a user-entered custom field name into a stable, unique-ish storage key. */
fun slugify(label: String): String =
    label.trim().lowercase().replace(Regex("[^a-z0-9]+"), "_").trim('_').ifBlank { "field" }

/**
 * The editable fields shared by [AddItemScreen] and [EditItemScreen]. Both
 * screens' ViewModels implement this so [ItemFormFields] can render the same
 * form for creating and editing an item.
 */
interface ItemFormState {
    val name: MutableStateFlow<String>
    val description: MutableStateFlow<String>
    val locationId: MutableStateFlow<String?>
    val gridRow: MutableStateFlow<Int?>
    val gridCol: MutableStateFlow<Int?>
    val labelIds: MutableStateFlow<Set<String>>
    val status: MutableStateFlow<ItemStatus>
    val tier: MutableStateFlow<ItemTier>
    val manufacturer: MutableStateFlow<String>
    val model: MutableStateFlow<String>
    val serial: MutableStateFlow<String>
    val purchasePrice: MutableStateFlow<String>
    val purchasedAt: MutableStateFlow<String>
    val warranty: MutableStateFlow<String>
    val insured: MutableStateFlow<Boolean>
    val notes: MutableStateFlow<String>
    val assetId: MutableStateFlow<String>
    val customFields: MutableStateFlow<List<CustomField>>

    fun regenerateAssetId()
    fun toggleLabel(id: String)

    /** Selects a location, clearing the grid cell unless it's a grid-enabled container. */
    fun setLocation(id: String?)
    fun setGridCell(row: Int?, col: Int?)
    fun createLocation(name: String, parentId: String?)
    fun createLabel(name: String, color: String)
}

/**
 * Renders the full item form (basics, organization, product details, purchase
 * & value, notes) as a flat sequence of composables — callers place this
 * inside their own scrollable `Column` so its children share that column's
 * spacing/padding.
 */
@Composable
fun ItemFormFields(
    vm: ItemFormState,
    locations: List<Location>,
    labels: List<Label>,
) {
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
    val customFields by vm.customFields.collectAsStateWithLifecycle()

    val selectedLocation = locations.find { it.id == locationId }
    val gridContainer = selectedLocation?.takeIf {
        it.locationType == LocationType.CONTAINER && it.gridRows != null && it.gridCols != null
    }

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

    SectionLabel("Custom fields")
    CustomFieldsEditor(
        fields = customFields,
        onChange = { vm.customFields.value = it },
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
        label = { Text("Free-form notes about this item") },
        minLines = 3,
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
fun SectionLabel(text: String) {
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
private fun CustomFieldsEditor(fields: List<CustomField>, onChange: (List<CustomField>) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        fields.forEachIndexed { index, field ->
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = field.value ?: "",
                    onValueChange = { newValue ->
                        onChange(fields.toMutableList().also { it[index] = field.copy(value = newValue) })
                    },
                    label = { Text(field.unit?.let { "${field.label} ($it)" } ?: field.label) },
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                )
                IconButton(onClick = { onChange(fields.filterIndexed { i, _ -> i != index }) }) {
                    Icon(Icons.Filled.Close, contentDescription = "Remove ${field.label}")
                }
            }
        }
        NewCustomFieldForm(onAdd = { label, value ->
            onChange(fields + CustomField(key = slugify(label), label = label, value = value.ifBlank { null }))
        })
    }
}

@Composable
private fun NewCustomFieldForm(onAdd: (label: String, value: String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    if (!expanded) {
        TextButton(onClick = { expanded = true }) { Text("+ Add custom field") }
        return
    }
    var label by remember { mutableStateOf("") }
    var value by remember { mutableStateOf("") }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = label,
                onValueChange = { label = it },
                label = { Text("Field name") },
                singleLine = true,
                modifier = Modifier.weight(1f),
            )
            OutlinedTextField(
                value = value,
                onValueChange = { value = it },
                label = { Text("Value") },
                singleLine = true,
                modifier = Modifier.weight(1f),
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = {
                if (label.isNotBlank()) {
                    onAdd(label.trim(), value.trim())
                    expanded = false
                    label = ""
                    value = ""
                }
            }) { Text("Add") }
            OutlinedButton(onClick = { expanded = false }) { Text("Cancel") }
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
