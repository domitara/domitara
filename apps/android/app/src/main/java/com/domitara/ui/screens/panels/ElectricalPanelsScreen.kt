package com.domitara.ui.screens.panels

import android.content.Intent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilterChip
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.domitara.data.dto.ElectricalBreaker
import com.domitara.data.dto.ElectricalPanel
import com.domitara.di.appViewModel
import com.domitara.ui.common.ActionErrorHost
import com.domitara.ui.common.Async
import com.domitara.ui.common.EmptyState
import com.domitara.ui.common.ErrorState
import com.domitara.ui.common.LoadingState
import com.domitara.ui.common.parseHexColor

@Composable
fun ElectricalPanelsScreen() {
    val vm = appViewModel { ElectricalPanelsViewModel(it) }
    val homesState by vm.homes.collectAsStateWithLifecycle()
    val selectedHome by vm.selectedHome.collectAsStateWithLifecycle()
    val panelsState by vm.panels.collectAsStateWithLifecycle()
    val selectedPanel by vm.selectedPanel.collectAsStateWithLifecycle()
    val actionError by vm.actionError.collectAsStateWithLifecycle()

    ActionErrorHost(actionError, vm::clearActionError) {
        when (val s = homesState) {
            Async.Loading -> LoadingState()
            is Async.Failure -> ErrorState(s.message, onRetry = vm::loadHomes)
            is Async.Success ->
                if (s.data.isEmpty()) {
                    EmptyState("No homes")
                } else {
                    Column(Modifier.fillMaxSize()) {
                        // Home selector
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            items(s.data, key = { it.id }) { home ->
                                FilterChip(
                                    selected = home.id == selectedHome?.id,
                                    onClick = { vm.selectHome(home) },
                                    label = { Text(home.name) },
                                )
                            }
                        }

                        PanelsSection(
                            vm = vm,
                            panelsState = panelsState,
                            selectedPanel = selectedPanel,
                        )
                    }
                }
        }
    }
}

@Composable
private fun PanelsSection(
    vm: ElectricalPanelsViewModel,
    panelsState: Async<List<ElectricalPanel>>,
    selectedPanel: ElectricalPanel?,
) {
    var showAdd by remember { mutableStateOf(false) }

    when (val s = panelsState) {
        Async.Loading -> LoadingState()
        is Async.Failure -> ErrorState(s.message)
        is Async.Success -> {
            val sortedPanels = remember(s.data) { s.data.sortedBy { it.sortOrder } }
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                LazyRow(
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(horizontal = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(sortedPanels, key = { it.id }) { panel ->
                        FilterChip(
                            selected = panel.id == selectedPanel?.id,
                            onClick = { vm.selectPanel(panel) },
                            label = { Text(panel.name) },
                        )
                    }
                }
                IconButton(onClick = { showAdd = true }) {
                    Icon(Icons.Filled.Add, contentDescription = "Add panel")
                }
            }

            if (selectedPanel == null) {
                EmptyState("No panel selected", "Add a panel to start mapping breakers.")
            } else {
                PanelDetail(vm, selectedPanel)
            }
        }
    }

    if (showAdd) {
        AddPanelDialog(
            onDismiss = { showAdd = false },
            onCreate = { name, amps, slots, note ->
                vm.createPanel(name, amps, slots, note)
                showAdd = false
            },
        )
    }
}

@Composable
private fun PanelDetail(vm: ElectricalPanelsViewModel, panel: ElectricalPanel) {
    val breakersState by vm.breakers.collectAsStateWithLifecycle()
    val areas by vm.areas.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var editing by remember { mutableStateOf<Pair<Int, ElectricalBreaker?>?>(null) }

    val areaColors: Map<String, Color> =
        remember(areas) { areas.associate { it.id to parseHexColor(it.color) } }

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(panel.name, style = MaterialTheme.typography.titleLarge)
                val meta = listOfNotNull(
                    "${panel.totalAmps}A",
                    "${panel.totalSlots} slots",
                    panel.locationNote?.takeIf { it.isNotBlank() },
                ).joinToString(" · ")
                Text(meta, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            IconButton(onClick = {
                val breakers = (breakersState as? Async.Success)?.data ?: emptyList()
                sharePanelDirectory(context, panel, breakers)
            }) {
                Icon(Icons.Filled.Share, contentDescription = "Share directory")
            }
            IconButton(onClick = { vm.deletePanel(panel.id) }) {
                Icon(Icons.Filled.Delete, contentDescription = "Delete panel")
            }
        }

        when (val s = breakersState) {
            Async.Loading -> LoadingState()
            is Async.Failure -> ErrorState(s.message)
            is Async.Success -> {
                PanelCanvas(
                    totalSlots = panel.totalSlots,
                    breakers = s.data,
                    areaColors = areaColors,
                    onSlotClick = { slot, breaker -> editing = slot to breaker },
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                )
                Spacer(Modifier.padding(8.dp))
            }
        }
    }

    editing?.let { (slot, breaker) ->
        BreakerEditorSheet(
            slot = slot,
            breaker = breaker,
            areas = areas,
            onSave = { form ->
                vm.saveBreaker(breaker, slot, form)
                editing = null
            },
            onDelete = {
                breaker?.let { vm.deleteBreaker(it.id) }
                editing = null
            },
            onDismiss = { editing = null },
        )
    }
}

@Composable
private fun AddPanelDialog(
    onDismiss: () -> Unit,
    onCreate: (name: String, amps: Int, slots: Int?, note: String?) -> Unit,
) {
    var name by remember { mutableStateOf("") }
    var amps by remember { mutableStateOf("200") }
    var slots by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add panel") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Name") }, singleLine = true)
                OutlinedTextField(value = amps, onValueChange = { amps = it.filter(Char::isDigit) }, label = { Text("Total amps") }, singleLine = true)
                OutlinedTextField(value = slots, onValueChange = { slots = it.filter(Char::isDigit) }, label = { Text("Total slots (optional)") }, singleLine = true)
                OutlinedTextField(value = note, onValueChange = { note = it }, label = { Text("Location note (optional)") }, singleLine = true)
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val a = amps.toIntOrNull() ?: 200
                    onCreate(name.ifBlank { "Panel" }, a, slots.toIntOrNull(), note.ifBlank { null })
                },
            ) { Text("Create") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

private fun sharePanelDirectory(
    context: android.content.Context,
    panel: ElectricalPanel,
    breakers: List<ElectricalBreaker>,
) {
    val lines = buildString {
        appendLine("Panel: ${panel.name} (${panel.totalAmps}A, ${panel.totalSlots} slots)")
        panel.locationNote?.takeIf { it.isNotBlank() }?.let { appendLine("Location: $it") }
        appendLine()
        breakers.sortedBy { it.slot }.forEach { b ->
            val parts = listOfNotNull(
                "Slot ${b.slot}",
                b.label?.takeIf { it.isNotBlank() } ?: "(unlabeled)",
                b.amps?.let { "${it}A" },
                if (b.isGfci) "GFCI" else null,
                if (b.isAfci) "AFCI" else null,
            )
            appendLine(parts.joinToString(" · "))
        }
    }
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_SUBJECT, "Breaker directory · ${panel.name}")
        putExtra(Intent.EXTRA_TEXT, lines)
    }
    context.startActivity(Intent.createChooser(intent, "Share breaker directory"))
}
