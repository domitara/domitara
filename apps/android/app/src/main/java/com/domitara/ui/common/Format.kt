package com.domitara.ui.common

import androidx.compose.ui.graphics.Color
import java.text.NumberFormat
import java.util.Locale
import kotlin.math.abs

/** Formats a nullable amount as USD currency, e.g. 1234.5 -> "$1,234.50". */
fun formatCurrency(value: Double?): String {
    if (value == null) return "—"
    return NumberFormat.getCurrencyInstance(Locale.US).format(value)
}

/** Compact currency for stat tiles, e.g. 12345.0 -> "$12,345". */
fun formatCurrencyWhole(value: Double?): String {
    if (value == null) return "$0"
    val nf = NumberFormat.getCurrencyInstance(Locale.US)
    nf.maximumFractionDigits = 0
    return nf.format(value)
}

private val AVATAR_PALETTE = listOf(
    Color(0xFF4C6EF5), Color(0xFF12B886), Color(0xFFF59F00), Color(0xFFE64980),
    Color(0xFF7950F2), Color(0xFF15AABF), Color(0xFFFA5252), Color(0xFF82C91E),
)

/** Deterministic avatar color derived from an item/entity id (mirrors RN). */
fun avatarColor(id: String): Color {
    if (id.isEmpty()) return AVATAR_PALETTE[0]
    val hash = id.fold(0) { acc, c -> (acc * 31 + c.code) and 0x7FFFFFFF }
    return AVATAR_PALETTE[abs(hash) % AVATAR_PALETTE.size]
}

/** Two-letter initials from a name for avatars. */
fun initials(name: String): String {
    val parts = name.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }
    return when {
        parts.isEmpty() -> "?"
        parts.size == 1 -> parts[0].take(2).uppercase()
        else -> (parts[0].take(1) + parts[1].take(1)).uppercase()
    }
}

/** Parses a "#RRGGBB" / "#AARRGGBB" hex string into a Compose Color. */
fun parseHexColor(hex: String?, fallback: Color = Color(0xFF888888)): Color {
    if (hex.isNullOrBlank()) return fallback
    val cleaned = hex.removePrefix("#")
    return try {
        when (cleaned.length) {
            6 -> Color(("FF$cleaned").toLong(16))
            8 -> Color(cleaned.toLong(16))
            else -> fallback
        }
    } catch (_: NumberFormatException) {
        fallback
    }
}

/** Trims an ISO timestamp to its date portion (YYYY-MM-DD) for display. */
fun shortDate(iso: String?): String {
    if (iso.isNullOrBlank()) return "—"
    return iso.take(10)
}

/** Human-readable file size, e.g. 512 -> "512 B", 1536 -> "1.5 KB", 5e6 -> "4.8 MB". */
fun formatBytes(bytes: Long): String {
    if (bytes < 1024) return "$bytes B"
    val kb = bytes / 1024.0
    if (kb < 1024) return "%.1f KB".format(kb)
    val mb = kb / 1024.0
    if (mb < 1024) return "%.1f MB".format(mb)
    return "%.1f GB".format(mb / 1024.0)
}
