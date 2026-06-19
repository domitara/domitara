package com.domitara.ui.screens.panels

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.domitara.data.dto.ElectricalBreaker
import com.domitara.domain.SlotCol
import com.domitara.domain.SlotGeometry
import com.domitara.domain.SlotState
import com.domitara.domain.computeSlots
import com.domitara.ui.theme.Accent

private class SlotRect(
    val geom: SlotGeometry,
    val left: Float,
    val top: Float,
    val right: Float,
    val bottom: Float,
) {
    fun contains(o: Offset) = o.x in left..right && o.y in top..bottom
}

/**
 * Renders an electrical panel as a two-column breaker grid using the ported
 * [computeSlots] geometry. Tapping any slot (occupied or blank) invokes
 * [onSlotClick] with the slot number and its breaker (null for a blank slot).
 */
@Composable
fun PanelCanvas(
    totalSlots: Int,
    breakers: List<ElectricalBreaker>,
    areaColors: Map<String, Color>,
    onSlotClick: (slot: Int, breaker: ElectricalBreaker?) -> Unit,
    modifier: Modifier = Modifier,
) {
    val measurer = rememberTextMeasurer()
    val density = LocalDensity.current
    val rowHeightPx = with(density) { 52.dp.toPx() }
    val gapPx = with(density) { 4.dp.toPx() }

    val slots = remember(totalSlots, breakers) { computeSlots(totalSlots, breakers) }
    val maxRow = remember(slots) { slots.maxOfOrNull { it.row + it.rowSpan - 1 } ?: 1 }
    val totalHeightDp = with(density) { (maxRow * rowHeightPx).toDp() }

    BoxWithConstraints(modifier.fillMaxWidth()) {
        val widthPx = with(density) { maxWidth.toPx() }
        val halfWidth = widthPx / 2f

        val rects = remember(slots, widthPx, rowHeightPx) {
            slots.map { g ->
                val left = when (g.col) {
                    SlotCol.LEFT, SlotCol.FULL -> 0f
                    SlotCol.RIGHT -> halfWidth
                }
                val right = when (g.col) {
                    SlotCol.FULL -> widthPx
                    SlotCol.LEFT -> halfWidth
                    SlotCol.RIGHT -> widthPx
                }
                val top = (g.row - 1) * rowHeightPx
                val bottom = top + g.rowSpan * rowHeightPx
                SlotRect(g, left, top, right, bottom)
            }
        }

        Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .height(totalHeightDp)
                .pointerInput(rects) {
                    detectTapGestures { offset ->
                        rects.firstOrNull { it.contains(offset) }?.let {
                            onSlotClick(it.geom.slot, it.geom.breaker)
                        }
                    }
                },
        ) {
            rects.forEach { r ->
                val fill = fillFor(r.geom, areaColors)
                drawRect(
                    color = fill,
                    topLeft = Offset(r.left + gapPx / 2, r.top + gapPx / 2),
                    size = Size(r.right - r.left - gapPx, r.bottom - r.top - gapPx),
                )
                drawRect(
                    color = Color(0x33000000),
                    topLeft = Offset(r.left + gapPx / 2, r.top + gapPx / 2),
                    size = Size(r.right - r.left - gapPx, r.bottom - r.top - gapPx),
                    style = androidx.compose.ui.graphics.drawscope.Stroke(width = 2f),
                )
                drawSlotText(measurer, r)
            }
        }
    }
}

private fun androidx.compose.ui.graphics.drawscope.DrawScope.drawSlotText(
    measurer: TextMeasurer,
    r: SlotRect,
) {
    val g = r.geom
    val title = when {
        g.state == SlotState.MAIN -> "MAIN"
        g.state == SlotState.BLANK -> "${g.slot}"
        g.breaker?.label?.isNotBlank() == true -> "${g.slot} · ${g.breaker.label}"
        else -> "${g.slot} · (unlabeled)"
    }
    val onColor = if (g.state == SlotState.BLANK) Color(0xFF999999) else Color(0xFF1A1A1A)
    val layout = measurer.measure(
        text = title,
        style = TextStyle(fontSize = 12.sp, color = onColor),
    )
    drawText(
        textLayoutResult = layout,
        topLeft = Offset(r.left + 12f, r.top + (r.bottom - r.top) / 2f - layout.size.height / 2f),
    )
}

private fun fillFor(g: SlotGeometry, areaColors: Map<String, Color>): Color = when (g.state) {
    SlotState.BLANK -> Color(0xFFF1F1F1)
    SlotState.MAIN -> Accent.copy(alpha = 0.25f)
    else -> {
        val areaId = g.breaker?.floorPlanAreaId
        if (areaId != null) areaColors[areaId]?.copy(alpha = 0.30f) ?: Color(0xFFDDEBF7)
        else Color(0xFFDDEBF7)
    }
}
