package com.domitara.ui.common

import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.IntSize

/** Pinch-zoom / pan state for [Modifier.zoomable]. Pan is clamped so the content can't leave the viewport. */
class ZoomState(private val maxScale: Float = 8f) {
    var scale by mutableFloatStateOf(1f)
        private set
    var offset by mutableStateOf(Offset.Zero)
        private set
    internal var viewport = IntSize.Zero

    fun transform(pan: Offset, zoom: Float) {
        scale = (scale * zoom).coerceIn(1f, maxScale)
        offset = clamp(offset + pan)
    }

    fun toggle() {
        if (scale > 1f) reset() else scale = 2.5f
    }

    fun reset() {
        scale = 1f
        offset = Offset.Zero
    }

    private fun clamp(o: Offset): Offset {
        val maxX = viewport.width * (scale - 1f) / 2f
        val maxY = viewport.height * (scale - 1f) / 2f
        return Offset(o.x.coerceIn(-maxX, maxX), o.y.coerceIn(-maxY, maxY))
    }
}

@Composable
fun rememberZoomState(key: Any? = null): ZoomState = remember(key) { ZoomState() }

/**
 * Pinch to zoom, drag to pan (only while zoomed in, so parent scrolling and
 * dialog gestures still work at 1x), double-tap to toggle zoom.
 */
fun Modifier.zoomable(state: ZoomState): Modifier = this
    .pointerInput(state) {
        detectTapGestures(onDoubleTap = { state.toggle() })
    }
    .pointerInput(state) {
        state.viewport = size
        detectTransformGestures { _, pan, zoom, _ ->
            state.viewport = size
            state.transform(pan, zoom)
        }
    }
    .graphicsLayer {
        scaleX = state.scale
        scaleY = state.scale
        translationX = state.offset.x
        translationY = state.offset.y
    }
