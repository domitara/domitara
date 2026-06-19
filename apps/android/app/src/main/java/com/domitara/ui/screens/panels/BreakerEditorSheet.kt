package com.domitara.ui.screens.panels

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.ExposedDropdownMenuAnchorType
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.text.KeyboardOptions
import com.domitara.data.dto.ElectricalBreaker
import com.domitara.data.dto.FloorPlanArea
import com.domitara.ui.theme.DangerRed

private val AMPS_OPTIONS = listOf(15, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 125, 150, 200)
private val TYPE_OPTIONS = listOf("standard", "double_pole", "tandem", "main", "blank")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BreakerEditorSheet(
    slot: Int,
    breaker: ElectricalBreaker?,
    areas: List<FloorPlanArea>,
    onSave: (BreakerForm) -> Unit,
    onDelete: () -> Unit,
    onDismiss: () -> Unit,
) {
    var label by remember { mutableStateOf(breaker?.label ?: "") }
    var amps by remember { mutableStateOf(breaker?.amps) }
    var type by remember { mutableStateOf(breaker?.breakerType?.name?.lowercase() ?: "standard") }
    var gfci by remember { mutableStateOf(breaker?.isGfci ?: false) }
    var afci by remember { mutableStateOf(breaker?.isAfci ?: false) }
    var notes by remember { mutableStateOf(breaker?.notes ?: "") }
    var areaId by remember { mutableStateOf(breaker?.floorPlanAreaId) }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(start = 20.dp, end = 20.dp, bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                if (breaker == null) "Add breaker · slot $slot" else "Edit breaker · slot $slot",
                style = MaterialTheme.typography.titleLarge,
            )

            OutlinedTextField(
                value = label,
                onValueChange = { label = it },
                label = { Text("Label") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )

            Dropdown(
                label = "Amps",
                selectedText = amps?.toString() ?: "—",
                options = AMPS_OPTIONS.map { it.toString() to it },
                onSelect = { amps = it },
            )

            Dropdown(
                label = "Type",
                selectedText = type,
                options = TYPE_OPTIONS.map { it to it },
                onSelect = { type = it },
            )

            Dropdown(
                label = "Floor plan area",
                selectedText = areas.firstOrNull { it.id == areaId }?.name ?: "None",
                options = listOf("None" to null) + areas.map { it.name to it.id },
                onSelect = { areaId = it },
            )

            SwitchRow("GFCI", gfci) { gfci = it }
            SwitchRow("AFCI", afci) { afci = it }

            OutlinedTextField(
                value = notes,
                onValueChange = { notes = it },
                label = { Text("Notes") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
                modifier = Modifier.fillMaxWidth(),
            )

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Button(
                    onClick = {
                        onSave(
                            BreakerForm(
                                label = label,
                                amps = amps,
                                breakerType = type,
                                isGfci = gfci,
                                isAfci = afci,
                                notes = notes,
                                floorPlanAreaId = areaId,
                            ),
                        )
                    },
                    modifier = Modifier.weight(1f),
                ) { Text("Save") }

                if (breaker != null) {
                    OutlinedButton(onClick = onDelete, modifier = Modifier.weight(1f)) {
                        Text("Delete", color = DangerRed)
                    }
                }
            }
        }
    }
}

@Composable
private fun SwitchRow(label: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
        Text(label, modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodyLarge)
        Switch(checked = checked, onCheckedChange = onChange)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun <T> Dropdown(
    label: String,
    selectedText: String,
    options: List<Pair<String, T>>,
    onSelect: (T) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
        OutlinedTextField(
            value = selectedText,
            onValueChange = {},
            readOnly = true,
            label = { Text(label) },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier.fillMaxWidth().menuAnchor(ExposedDropdownMenuAnchorType.PrimaryNotEditable),
        )
        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
        ) {
            options.forEach { (text, value) ->
                DropdownMenuItem(
                    text = { Text(text) },
                    onClick = {
                        onSelect(value)
                        expanded = false
                    },
                )
            }
        }
    }
}
