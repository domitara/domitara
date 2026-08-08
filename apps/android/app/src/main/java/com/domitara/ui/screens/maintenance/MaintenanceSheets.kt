package com.domitara.ui.screens.maintenance

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material3.Button
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuAnchorType
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.domitara.data.dto.CreateMaintenanceInput
import com.domitara.data.dto.CreateScheduleInput
import com.domitara.data.dto.Item
import com.domitara.data.dto.MaintenanceSchedule
import com.domitara.data.dto.UpdateScheduleInput
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

private val FREQUENCY_UNITS = listOf("days", "weeks", "months", "years")

private fun todayIso(): String = LocalDate.now().toString()

/** Bottom sheet for recording a completed maintenance event. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LogMaintenanceSheet(
    items: List<Item>,
    defaultTitle: String? = null,
    defaultItemId: String? = null,
    scheduleId: String? = null,
    onSave: (CreateMaintenanceInput) -> Unit,
    onDismiss: () -> Unit,
) {
    var title by remember { mutableStateOf(defaultTitle ?: "") }
    var itemId by remember { mutableStateOf(defaultItemId) }
    var date by remember { mutableStateOf(todayIso()) }
    var cost by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        SheetColumn {
            Text("Log maintenance", style = MaterialTheme.typography.titleLarge)

            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text("What was done") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )

            ItemDropdown(items, itemId) { itemId = it }

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = date,
                    onValueChange = { date = it },
                    label = { Text("Date (YYYY-MM-DD)") },
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                )
                OutlinedTextField(
                    value = cost,
                    onValueChange = { cost = it },
                    label = { Text("Cost") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.weight(1f),
                )
            }

            OutlinedTextField(
                value = notes,
                onValueChange = { notes = it },
                label = { Text("Notes") },
                modifier = Modifier.fillMaxWidth(),
            )

            Button(
                onClick = {
                    onSave(
                        CreateMaintenanceInput(
                            title = title.trim(),
                            itemId = itemId,
                            scheduleId = scheduleId,
                            notes = notes.trim().ifBlank { null },
                            cost = cost.trim().toDoubleOrNull(),
                            performedAt = date.trim().ifBlank { null },
                        ),
                    )
                },
                enabled = title.isNotBlank(),
                modifier = Modifier.fillMaxWidth(),
            ) { Text("Save log") }
        }
    }
}

/** Bottom sheet for creating or editing a recurring maintenance schedule. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScheduleEditorSheet(
    items: List<Item>,
    editing: MaintenanceSchedule?,
    onCreate: (CreateScheduleInput) -> Unit,
    onUpdate: (String, UpdateScheduleInput) -> Unit,
    onDismiss: () -> Unit,
) {
    var title by remember { mutableStateOf(editing?.title ?: "") }
    var itemId by remember { mutableStateOf(editing?.itemId) }
    var freqValue by remember { mutableStateOf((editing?.frequencyValue ?: 3).toString()) }
    var freqUnit by remember { mutableStateOf(editing?.frequencyUnit ?: "months") }
    var nextDue by remember { mutableStateOf(editing?.nextDueAt ?: todayIso()) }
    var notes by remember { mutableStateOf(editing?.notes ?: "") }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        SheetColumn {
            Text(
                if (editing == null) "Add schedule" else "Edit schedule",
                style = MaterialTheme.typography.titleLarge,
            )

            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text("What needs to be done") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )

            ItemDropdown(items, itemId) { itemId = it }

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = freqValue,
                    onValueChange = { freqValue = it.filter(Char::isDigit) },
                    label = { Text("Every") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f),
                )
                Dropdown(
                    label = "Unit",
                    selectedText = freqUnit,
                    options = FREQUENCY_UNITS.map { it to it },
                    onSelect = { freqUnit = it },
                    modifier = Modifier.weight(1f),
                )
            }

            DatePickerField(
                value = nextDue,
                onValueChange = { nextDue = it },
                label = "Next due (YYYY-MM-DD)",
            )

            OutlinedTextField(
                value = notes,
                onValueChange = { notes = it },
                label = { Text("Notes") },
                modifier = Modifier.fillMaxWidth(),
            )

            val freq = freqValue.toIntOrNull() ?: 0
            Button(
                onClick = {
                    if (editing == null) {
                        onCreate(
                            CreateScheduleInput(
                                title = title.trim(),
                                itemId = itemId,
                                notes = notes.trim().ifBlank { null },
                                frequencyValue = freq,
                                frequencyUnit = freqUnit,
                                nextDueAt = nextDue.trim().ifBlank { null },
                            ),
                        )
                    } else {
                        onUpdate(
                            editing.id,
                            UpdateScheduleInput(
                                title = title.trim(),
                                itemId = itemId,
                                notes = notes.trim().ifBlank { null },
                                frequencyValue = freq,
                                frequencyUnit = freqUnit,
                                nextDueAt = nextDue.trim(),
                            ),
                        )
                    }
                },
                enabled = title.isNotBlank() && freq >= 1,
                modifier = Modifier.fillMaxWidth(),
            ) { Text(if (editing == null) "Add schedule" else "Save changes") }
        }
    }
}

@Composable
private fun SheetColumn(content: @Composable () -> Unit) {
    Column(
        Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(start = 20.dp, end = 20.dp, bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) { content() }
}

private const val NO_ITEM_LABEL = "No specific item"

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ItemDropdown(items: List<Item>, selectedId: String?, onSelect: (String?) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    var query by remember(selectedId, items) {
        mutableStateOf(items.firstOrNull { it.id == selectedId }?.name ?: NO_ITEM_LABEL)
    }
    val filtered = remember(query, items) {
        if (query.isBlank()) items else items.filter { it.name.contains(query, ignoreCase = true) }
    }

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = it },
        modifier = Modifier.fillMaxWidth(),
    ) {
        OutlinedTextField(
            value = query,
            onValueChange = {
                query = it
                expanded = true
            },
            label = { Text("Item") },
            singleLine = true,
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier
                .fillMaxWidth()
                .menuAnchor(ExposedDropdownMenuAnchorType.PrimaryEditable),
        )
        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = {
                expanded = false
                query = items.firstOrNull { it.id == selectedId }?.name ?: NO_ITEM_LABEL
            },
        ) {
            DropdownMenuItem(
                text = { Text(NO_ITEM_LABEL) },
                onClick = {
                    onSelect(null)
                    query = NO_ITEM_LABEL
                    expanded = false
                },
            )
            filtered.forEach { item ->
                DropdownMenuItem(
                    text = { Text(item.name) },
                    onClick = {
                        onSelect(item.id)
                        query = item.name
                        expanded = false
                    },
                )
            }
            if (filtered.isEmpty()) {
                DropdownMenuItem(text = { Text("No matches") }, onClick = {}, enabled = false)
            }
        }
    }
}

/** Text field for an ISO date (YYYY-MM-DD) with a trailing button to pick the date from a calendar. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DatePickerField(value: String, onValueChange: (String) -> Unit, label: String) {
    var showPicker by remember { mutableStateOf(false) }

    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        singleLine = true,
        trailingIcon = {
            IconButton(onClick = { showPicker = true }) {
                Icon(Icons.Filled.DateRange, contentDescription = "Pick date")
            }
        },
        modifier = Modifier.fillMaxWidth(),
    )

    if (showPicker) {
        val initialMillis = runCatching { LocalDate.parse(value.trim()) }.getOrNull()
            ?.atStartOfDay(ZoneOffset.UTC)
            ?.toInstant()
            ?.toEpochMilli()
        val pickerState = rememberDatePickerState(initialSelectedDateMillis = initialMillis)

        DatePickerDialog(
            onDismissRequest = { showPicker = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        pickerState.selectedDateMillis?.let { millis ->
                            val picked = Instant.ofEpochMilli(millis)
                                .atZone(ZoneOffset.UTC)
                                .toLocalDate()
                            onValueChange(picked.toString())
                        }
                        showPicker = false
                    },
                ) { Text("OK") }
            },
            dismissButton = {
                TextButton(onClick = { showPicker = false }) { Text("Cancel") }
            },
        ) {
            DatePicker(state = pickerState)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun <T> Dropdown(
    label: String,
    selectedText: String,
    options: List<Pair<String, T>>,
    onSelect: (T) -> Unit,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }
    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = it },
        modifier = modifier,
    ) {
        OutlinedTextField(
            value = selectedText,
            onValueChange = {},
            readOnly = true,
            label = { Text(label) },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier
                .fillMaxWidth()
                .menuAnchor(ExposedDropdownMenuAnchorType.PrimaryNotEditable),
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
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
