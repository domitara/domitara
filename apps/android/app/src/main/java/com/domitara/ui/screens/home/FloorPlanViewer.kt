package com.domitara.ui.screens.home

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.ui.draw.clip
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.domitara.ui.common.FullscreenIcon
import com.domitara.ui.common.rememberZoomState
import com.domitara.ui.common.zoomable
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.domitara.data.dto.FloorPlanArea
import com.domitara.data.dto.FloorPlanGeometry
import com.domitara.data.dto.FloorPlanShape
import com.domitara.data.dto.HomeDocument
import com.domitara.di.LocalAppContainer
import com.domitara.ui.common.parseHexColor

private fun floorLabel(level: Int?): String = when (level) {
    null -> "Unassigned"
    0 -> "Basement"
    else -> "Floor $level"
}

/**
 * Read-only floor plan viewer: floor selector, the plan image with electrical zones
 * and home-layout shapes drawn over it (pinch to zoom, drag to pan).
 */
@Composable
fun FloorPlanViewer(
    plans: List<HomeDocument>,
    areas: List<FloorPlanArea>,
    shapes: List<FloorPlanShape>,
    onSetFloor: (docId: String, level: Int?) -> Unit,
) {
    val container = LocalAppContainer.current
    val sorted = remember(plans) { plans.sortedWith(compareBy(nullsLast()) { it.floorLevel }) }
    var selectedId by remember { mutableStateOf<String?>(null) }
    val active = sorted.firstOrNull { it.id == selectedId } ?: sorted.first()
    var showZones by remember { mutableStateOf(true) }
    var showShapes by remember { mutableStateOf(true) }
    var aspect by remember(active.id) { mutableFloatStateOf(1f) }

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        Row(
            Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            sorted.forEach { doc ->
                FilterChip(
                    selected = doc.id == active.id,
                    onClick = { selectedId = doc.id },
                    label = { Text(floorLabel(doc.floorLevel)) },
                )
            }
        }
        var floorMenu by remember { mutableStateOf(false) }
        Row(Modifier.padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("This plan shows:", style = MaterialTheme.typography.bodySmall)
            Box(Modifier.padding(start = 8.dp)) {
                OutlinedButton(onClick = { floorMenu = true }) { Text(floorLabel(active.floorLevel)) }
                DropdownMenu(expanded = floorMenu, onDismissRequest = { floorMenu = false }) {
                    (listOf<Int?>(null) + (0..4).toList()).forEach { level ->
                        DropdownMenuItem(
                            text = { Text(floorLabel(level)) },
                            onClick = { floorMenu = false; onSetFloor(active.id, level) },
                        )
                    }
                }
            }
        }
        Row(Modifier.padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Switch(checked = showZones, onCheckedChange = { showZones = it })
            Text("  Electrical zones   ", style = MaterialTheme.typography.bodySmall)
            Switch(checked = showShapes, onCheckedChange = { showShapes = it })
            Text("  Layout", style = MaterialTheme.typography.bodySmall)
        }

        val zoom = rememberZoomState(active.id)
        val zones = areas.filter { it.documentId == active.id && it.geometry != null }
        val layout = shapes.filter { it.documentId == active.id && it.geometry != null }
        val planUrl = container.dataRepository.absoluteUrl(active.url)
        var fullscreen by remember { mutableStateOf(false) }

        Box(
            Modifier
                .fillMaxWidth()
                .aspectRatio(aspect)
                .clipToBounds()
                .zoomable(zoom),
        ) {
            PlanContent(planUrl, active.filename, zones, layout, showZones, showShapes, zoom.scale) { aspect = it }
            IconButton(
                onClick = { fullscreen = true },
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(4.dp)
                    .clip(CircleShape)
                    .background(Color.Black.copy(alpha = 0.4f)),
            ) {
                Icon(FullscreenIcon, contentDescription = "Full screen", tint = Color.White)
            }
        }

        if (fullscreen) {
            FullscreenPlan(
                url = planUrl,
                filename = active.filename,
                aspect = aspect,
                zones = zones,
                layout = layout,
                showZones = showZones,
                showShapes = showShapes,
                onToggleZones = { showZones = it },
                onToggleShapes = { showShapes = it },
                onDismiss = { fullscreen = false },
            )
        }
    }
}

@Composable
private fun FullscreenPlan(
    url: String,
    filename: String,
    aspect: Float,
    zones: List<FloorPlanArea>,
    layout: List<FloorPlanShape>,
    showZones: Boolean,
    showShapes: Boolean,
    onToggleZones: (Boolean) -> Unit,
    onToggleShapes: (Boolean) -> Unit,
    onDismiss: () -> Unit,
) {
    val zoom = rememberZoomState(url)
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
    ) {
        Box(Modifier.fillMaxSize().background(Color.Black)) {
            Box(Modifier.fillMaxSize().clipToBounds().zoomable(zoom), contentAlignment = Alignment.Center) {
                Box(Modifier.aspectRatio(aspect)) {
                    PlanContent(url, filename, zones, layout, showZones, showShapes, zoom.scale) {}
                }
            }
            Row(
                Modifier
                    .align(Alignment.TopStart)
                    .statusBarsPadding()
                    .padding(8.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color.Black.copy(alpha = 0.5f))
                    .padding(horizontal = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Switch(checked = showZones, onCheckedChange = onToggleZones)
                Text("  Zones   ", color = Color.White, style = MaterialTheme.typography.bodySmall)
                Switch(checked = showShapes, onCheckedChange = onToggleShapes)
                Text("  Layout", color = Color.White, style = MaterialTheme.typography.bodySmall)
            }
            IconButton(
                onClick = onDismiss,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .statusBarsPadding()
                    .padding(8.dp)
                    .clip(CircleShape)
                    .background(Color.Black.copy(alpha = 0.5f)),
            ) {
                Icon(Icons.Filled.Close, contentDescription = "Close", tint = Color.White)
            }
        }
    }
}

/** The plan image with zone/shape overlays; [scale] keeps strokes and labels a constant on-screen size. */
@Composable
private fun PlanContent(
    url: String,
    filename: String,
    zones: List<FloorPlanArea>,
    layout: List<FloorPlanShape>,
    showZones: Boolean,
    showShapes: Boolean,
    scale: Float,
    onAspect: (Float) -> Unit,
) {
    val container = LocalAppContainer.current
    val measurer = rememberTextMeasurer()
    Box(Modifier.fillMaxSize()) {
        AsyncImage(
            model = url,
            imageLoader = container.imageLoader,
            contentDescription = filename,
            contentScale = ContentScale.FillBounds,
            onSuccess = { state ->
                val d = state.result.drawable
                if (d.intrinsicWidth > 0 && d.intrinsicHeight > 0) {
                    onAspect(d.intrinsicWidth.toFloat() / d.intrinsicHeight)
                }
            },
            modifier = Modifier.fillMaxSize(),
        )
        Canvas(Modifier.fillMaxSize()) {
            fun draw(geometry: FloorPlanGeometry?, color: Color, fillAlpha: Float, label: String?) {
                val pts = geometry?.coordinates?.filter { it.size >= 2 } ?: return
                if (pts.size < 3) return
                val px = pts.map { Offset(it[0].toFloat() * size.width, it[1].toFloat() * size.height) }
                val path = Path().apply {
                    moveTo(px[0].x, px[0].y)
                    px.drop(1).forEach { lineTo(it.x, it.y) }
                    close()
                }
                drawPath(path, color.copy(alpha = fillAlpha))
                drawPath(path, color, style = Stroke(width = 2.dp.toPx() / scale))
                if (!label.isNullOrBlank()) {
                    val center = Offset(px.map { it.x }.average().toFloat(), px.map { it.y }.average().toFloat())
                    val text = measurer.measure(
                        label,
                        TextStyle(color = Color.White, fontSize = (12 / scale).sp),
                    )
                    drawText(text, topLeft = Offset(center.x - text.size.width / 2f, center.y - text.size.height / 2f))
                }
            }
            if (showZones) zones.forEach { draw(it.geometry, parseHexColor(it.color), 0.33f, it.name) }
            if (showShapes) layout.forEach { draw(it.geometry, parseHexColor(it.color), 0.4f, it.label) }
        }
    }
}
