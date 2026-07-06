package com.domitara.ui.screens.labels

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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.AlertDialog
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.domitara.data.dto.Label
import com.domitara.di.appViewModel
import com.domitara.ui.common.ActionErrorHost
import com.domitara.ui.common.Async
import com.domitara.ui.common.ColorDot
import com.domitara.ui.common.EmptyState
import com.domitara.ui.common.ErrorState
import com.domitara.ui.common.LoadingState
import com.domitara.ui.common.parseHexColor
import com.domitara.ui.screens.items.ItemRow

private val LABEL_COLORS = listOf(
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#64748b",
)

@Composable
fun LabelsScreen(onOpenItem: (String) -> Unit) {
    val vm = appViewModel { LabelsViewModel(it.dataRepository, it.activeHomeId) }
    val labelsState by vm.labels.collectAsStateWithLifecycle()
    val selected by vm.selected.collectAsStateWithLifecycle()
    val actionError by vm.actionError.collectAsStateWithLifecycle()
    var showAdd by remember { mutableStateOf(false) }

    ActionErrorHost(actionError, vm::clearActionError) {
        if (selected == null) {
            Column(Modifier.fillMaxSize()) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
                ) {
                    Text(
                        "Labels",
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.weight(1f).padding(start = 8.dp),
                    )
                    IconButton(onClick = { showAdd = true }) {
                        Icon(Icons.Filled.Add, contentDescription = "Add label")
                    }
                }
                when (val s = labelsState) {
                    Async.Loading -> LoadingState()
                    is Async.Failure -> ErrorState(s.message, onRetry = vm::load)
                    is Async.Success ->
                        if (s.data.isEmpty()) {
                            EmptyState("No labels yet")
                        } else {
                            LazyColumn(Modifier.fillMaxSize()) {
                                items(s.data, key = { it.id }) { label ->
                                    LabelRow(label, onClick = { vm.select(label) })
                                    HorizontalDivider()
                                }
                            }
                        }
                }
            }
        } else {
            LabelItems(label = selected!!, vm = vm, onOpenItem = onOpenItem)
        }
    }

    if (showAdd) {
        AddLabelDialog(
            onDismiss = { showAdd = false },
            onCreate = { name, color ->
                vm.createLabel(name, color)
                showAdd = false
            },
        )
    }
}

@Composable
private fun AddLabelDialog(
    onDismiss: () -> Unit,
    onCreate: (name: String, color: String) -> Unit,
) {
    var name by remember { mutableStateOf("") }
    var color by remember { mutableStateOf(LABEL_COLORS[0]) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add label") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Name") },
                    singleLine = true,
                )
                Text("Color", style = MaterialTheme.typography.labelMedium)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    LABEL_COLORS.forEach { hex ->
                        val swatch = parseHexColor(hex)
                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .clip(CircleShape)
                                .background(swatch)
                                .border(
                                    width = if (color == hex) 2.dp else 0.dp,
                                    color = if (color == hex) MaterialTheme.colorScheme.onSurface else Color.Transparent,
                                    shape = CircleShape,
                                )
                                .clickable { color = hex },
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = { onCreate(name.ifBlank { "New label" }, color) }) { Text("Create") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun LabelRow(label: Label, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        ColorDot(parseHexColor(label.color), size = 16)
        Spacer(Modifier.width(12.dp))
        Text(label.name, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
        Text(
            "${label.itemCount}",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun LabelItems(label: Label, vm: LabelsViewModel, onOpenItem: (String) -> Unit) {
    val itemsState by vm.items.collectAsStateWithLifecycle()
    val labelsState by vm.labels.collectAsStateWithLifecycle()
    val locationNames by vm.locationNames.collectAsStateWithLifecycle()
    val labelsById = (labelsState as? Async.Success)?.data?.associateBy { it.id } ?: emptyMap()

    Column(Modifier.fillMaxSize()) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 8.dp),
        ) {
            IconButton(onClick = vm::clearSelection) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
            }
            ColorDot(parseHexColor(label.color), size = 14)
            Spacer(Modifier.width(8.dp))
            Text(label.name, style = MaterialTheme.typography.titleLarge)
        }
        HorizontalDivider()

        when (val s = itemsState) {
            Async.Loading -> LoadingState()
            is Async.Failure -> ErrorState(s.message, onRetry = { vm.select(label) })
            is Async.Success ->
                if (s.data.isEmpty()) {
                    EmptyState("No items with this label")
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
