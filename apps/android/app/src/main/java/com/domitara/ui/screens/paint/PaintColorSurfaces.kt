package com.domitara.ui.screens.paint

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.domitara.data.api.toUserMessage
import com.domitara.data.dto.Location
import com.domitara.data.dto.LocationPaintInput
import com.domitara.data.dto.PaintColorAssignment
import com.domitara.data.dto.PaintSurface
import com.domitara.di.LocalAppContainer
import kotlinx.coroutines.launch

internal fun surfaceLabel(surface: PaintSurface, note: String?): String {
    val label = surface.name.lowercase().replaceFirstChar { it.uppercase() }
    return if (surface == PaintSurface.ACCENT && !note.isNullOrBlank()) "$label ($note)" else label
}

/**
 * Lists the location surfaces a paint color is used on and lets the user assign it
 * to more or remove existing ones. Changes apply immediately (independent of the
 * surrounding dialog's Save), mirroring the web edit modal.
 */
@Composable
fun PaintColorSurfaces(paintColorId: String) {
    val repo = LocalAppContainer.current.dataRepository
    val scope = rememberCoroutineScope()
    var assignments by remember { mutableStateOf<List<PaintColorAssignment>>(emptyList()) }
    var locations by remember { mutableStateOf<List<Location>>(emptyList()) }
    var location by remember { mutableStateOf<Location?>(null) }
    var surface by remember { mutableStateOf(PaintSurface.WALLS) }
    var note by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var locMenu by remember { mutableStateOf(false) }
    var surfaceMenu by remember { mutableStateOf(false) }

    suspend fun reload() {
        runCatching { repo.listPaintColorAssignments(paintColorId) }
            .onSuccess { assignments = it }
            .onFailure { error = it.toUserMessage("Couldn't load assignments") }
    }

    LaunchedEffect(paintColorId) {
        reload()
        locations = runCatching { repo.listLocations() }.getOrDefault(emptyList()).sortedBy { it.name }
    }

    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text("Location surfaces", style = MaterialTheme.typography.labelMedium)
        if (assignments.isEmpty()) {
            Text(
                "Not assigned to any location yet.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        assignments.forEach { a ->
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "${a.locationName} · ${surfaceLabel(a.surface, a.surfaceNote)}",
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.weight(1f),
                )
                IconButton(
                    enabled = !busy,
                    onClick = {
                        scope.launch {
                            busy = true
                            error = null
                            runCatching { repo.deleteLocationPaint(a.id) }
                                .onFailure { error = it.toUserMessage("Couldn't remove assignment") }
                            reload()
                            busy = false
                        }
                    },
                ) { Icon(Icons.Filled.Close, contentDescription = "Remove assignment") }
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.weight(1f)) {
                OutlinedButton(onClick = { locMenu = true }, modifier = Modifier.fillMaxWidth()) {
                    Text(location?.name ?: "Location", maxLines = 1)
                }
                DropdownMenu(expanded = locMenu, onDismissRequest = { locMenu = false }) {
                    locations.forEach { l ->
                        DropdownMenuItem(text = { Text(l.name) }, onClick = { location = l; locMenu = false })
                    }
                }
            }
            Column(Modifier.weight(1f)) {
                OutlinedButton(onClick = { surfaceMenu = true }, modifier = Modifier.fillMaxWidth()) {
                    Text(surfaceLabel(surface, null))
                }
                DropdownMenu(expanded = surfaceMenu, onDismissRequest = { surfaceMenu = false }) {
                    PaintSurface.entries.forEach { s ->
                        DropdownMenuItem(
                            text = { Text(surfaceLabel(s, null)) },
                            onClick = { surface = s; surfaceMenu = false },
                        )
                    }
                }
            }
        }
        if (surface == PaintSurface.ACCENT) {
            OutlinedTextField(
                value = note,
                onValueChange = { note = it },
                label = { Text("Accent note (e.g. east wall)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
        }
        error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
        TextButton(
            enabled = location != null && !busy,
            onClick = {
                val target = location ?: return@TextButton
                scope.launch {
                    busy = true
                    error = null
                    runCatching {
                        repo.createLocationPaint(
                            target.id,
                            LocationPaintInput(
                                paintColorId = paintColorId,
                                surface = surface,
                                surfaceNote = note.trim().takeIf { surface == PaintSurface.ACCENT && it.isNotEmpty() },
                            ),
                        )
                    }
                        .onSuccess { location = null; note = "" }
                        .onFailure { error = it.toUserMessage("Couldn't assign paint") }
                    reload()
                    busy = false
                }
            },
        ) { Text("Assign") }
    }
}
