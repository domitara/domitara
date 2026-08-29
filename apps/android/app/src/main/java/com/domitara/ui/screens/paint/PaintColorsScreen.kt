package com.domitara.ui.screens.paint

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
import com.domitara.data.dto.PaintColor
import com.domitara.di.appViewModel
import com.domitara.ui.common.ActionErrorHost
import com.domitara.ui.common.Async
import com.domitara.ui.common.ColorDot
import com.domitara.ui.common.EmptyState
import com.domitara.ui.common.ErrorState
import com.domitara.ui.common.LoadingState
import com.domitara.ui.common.parseHexColor

private val PAINT_SWATCHES = listOf(
    "#e7e5e4", "#d6d3cd", "#c9c6bd", "#b7b0a3", "#a8a29e",
    "#8d8478", "#6b7280", "#4b5563", "#f5f5f4", "#1f2937",
)

@Composable
fun PaintColorsScreen() {
    val vm = appViewModel { PaintColorsViewModel(it.dataRepository, it.activeHomeId) }
    val state by vm.colors.collectAsStateWithLifecycle()
    val actionError by vm.actionError.collectAsStateWithLifecycle()
    var showAdd by remember { mutableStateOf(false) }

    ActionErrorHost(actionError, vm::clearActionError) {
        Column(Modifier.fillMaxSize()) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
            ) {
                Text(
                    "Paint colors",
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.weight(1f).padding(start = 8.dp),
                )
                IconButton(onClick = { showAdd = true }) {
                    Icon(Icons.Filled.Add, contentDescription = "Add paint color")
                }
            }
            when (val s = state) {
                Async.Loading -> LoadingState()
                is Async.Failure -> ErrorState(s.message, onRetry = vm::load)
                is Async.Success ->
                    if (s.data.isEmpty()) {
                        EmptyState("No paint colors yet")
                    } else {
                        LazyColumn(Modifier.fillMaxSize()) {
                            items(s.data, key = { it.id }) { color ->
                                PaintColorRow(color)
                                HorizontalDivider()
                            }
                        }
                    }
            }
        }
    }

    if (showAdd) {
        AddPaintColorDialog(
            onDismiss = { showAdd = false },
            onCreate = { name, hex, brand, code, sheen, notes ->
                vm.createPaintColor(name, hex, brand, code, sheen, notes)
                showAdd = false
            },
        )
    }
}

@Composable
private fun PaintColorRow(color: PaintColor) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .size(20.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(parseHexColor(color.color))
                .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(4.dp)),
        )
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(color.name, style = MaterialTheme.typography.titleMedium)
            val sub = listOfNotNull(color.brand, color.colorCode, color.sheen).joinToString(" · ")
            if (sub.isNotEmpty()) {
                Text(
                    sub,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        Text(
            "${color.locationCount}",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun AddPaintColorDialog(
    onDismiss: () -> Unit,
    onCreate: (
        name: String,
        hex: String,
        brand: String,
        code: String,
        sheen: String,
        notes: String,
    ) -> Unit,
) {
    var name by remember { mutableStateOf("") }
    var hex by remember { mutableStateOf(PAINT_SWATCHES[0]) }
    var brand by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var sheen by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add paint color") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Name") },
                    singleLine = true,
                )
                Text("Swatch color", style = MaterialTheme.typography.labelMedium)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    PAINT_SWATCHES.forEach { swatch ->
                        Box(
                            modifier = Modifier
                                .size(26.dp)
                                .clip(RoundedCornerShape(4.dp))
                                .background(parseHexColor(swatch))
                                .border(
                                    width = if (hex == swatch) 2.dp else 1.dp,
                                    color = if (hex == swatch) {
                                        MaterialTheme.colorScheme.onSurface
                                    } else {
                                        Color.Transparent
                                    },
                                    shape = RoundedCornerShape(4.dp),
                                )
                                .clickable { hex = swatch },
                        )
                    }
                }
                OutlinedTextField(
                    value = hex,
                    onValueChange = { hex = it },
                    label = { Text("Hex") },
                    singleLine = true,
                )
                OutlinedTextField(
                    value = brand,
                    onValueChange = { brand = it },
                    label = { Text("Brand") },
                    singleLine = true,
                )
                OutlinedTextField(
                    value = code,
                    onValueChange = { code = it },
                    label = { Text("Color code") },
                    singleLine = true,
                )
                OutlinedTextField(
                    value = sheen,
                    onValueChange = { sheen = it },
                    label = { Text("Sheen / finish") },
                    singleLine = true,
                )
                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text("Notes") },
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onCreate(name.ifBlank { "New paint color" }, hex, brand, code, sheen, notes) },
            ) { Text("Create") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}
