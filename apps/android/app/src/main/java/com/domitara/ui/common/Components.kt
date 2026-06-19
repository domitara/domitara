package com.domitara.ui.common

import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.domitara.data.dto.ItemStatus
import com.domitara.data.dto.Label
import com.domitara.ui.theme.DangerRed
import com.domitara.ui.theme.TextMuted

/**
 * Wraps screen [content] with a bottom [SnackbarHost] that surfaces transient
 * action failures (failed mutations, pull-to-refresh errors). Whenever [message]
 * becomes non-null it is shown once and then cleared via [onConsume].
 */
@Composable
fun ActionErrorHost(
    message: String?,
    onConsume: () -> Unit,
    content: @Composable () -> Unit,
) {
    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(message) {
        if (message != null) {
            snackbarHostState.showSnackbar(message)
            onConsume()
        }
    }
    Box(Modifier.fillMaxSize()) {
        content()
        SnackbarHost(snackbarHostState, modifier = Modifier.align(Alignment.BottomCenter))
    }
}

@Composable
fun LoadingState(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}

@Composable
fun ErrorState(message: String, onRetry: (() -> Unit)? = null, modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = message,
                color = DangerRed,
                textAlign = TextAlign.Center,
                style = MaterialTheme.typography.bodyMedium,
            )
            if (onRetry != null) {
                Spacer(Modifier.size(16.dp))
                Button(onClick = onRetry) { Text("Retry") }
            }
        }
    }
}

@Composable
fun EmptyState(title: String, subtitle: String? = null, modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(title, style = MaterialTheme.typography.titleMedium, color = TextMuted)
            if (subtitle != null) {
                Spacer(Modifier.size(6.dp))
                Text(
                    subtitle,
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextMuted,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

/** A label above its value, the standard read-only field row used on detail screens. */
@Composable
fun LabelValue(label: String, value: String, modifier: Modifier = Modifier) {
    Column(modifier.fillMaxWidth().padding(vertical = 8.dp)) {
        Text(
            label,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.size(2.dp))
        Text(value, style = MaterialTheme.typography.bodyLarge)
    }
}

/** Horizontal row of up to [max] label chips for an item's labels. */
@Composable
fun LabelChips(labels: List<Label>, max: Int, modifier: Modifier = Modifier) {
    if (labels.isEmpty()) return
    Row(modifier, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        labels.take(max).forEach { label ->
            LabelChip(label.name, parseHexColor(label.color))
        }
    }
}

@Composable
fun SectionHeader(title: String, modifier: Modifier = Modifier) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.Bold,
        modifier = modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
    )
}

@Composable
fun ColorDot(color: Color, size: Int = 12, modifier: Modifier = Modifier) {
    Box(modifier.size(size.dp).clip(CircleShape).background(color))
}

@Composable
fun Avatar(id: String, name: String, size: Int = 40) {
    Box(
        modifier = Modifier.size(size.dp).clip(CircleShape).background(avatarColor(id)),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = initials(name),
            color = Color.White,
            fontWeight = FontWeight.Bold,
            style = MaterialTheme.typography.labelMedium,
        )
    }
}

@Composable
fun StatusBadge(status: ItemStatus) {
    val (label, color) = when (status) {
        ItemStatus.OWNED -> "Owned" to Color(0xFF12B886)
        ItemStatus.LOANED -> "Loaned" to Color(0xFFF59F00)
        ItemStatus.MISSING -> "Missing" to DangerRed
    }
    Box(
        Modifier
            .clip(RoundedCornerShape(6.dp))
            .background(color.copy(alpha = 0.15f))
            .padding(horizontal = 8.dp, vertical = 2.dp),
    ) {
        Text(label, color = color, style = MaterialTheme.typography.labelSmall)
    }
}

/** Snooze action with a 1 day / 3 days / 1 week picker (mirrors the web/RN app). */
@Composable
fun SnoozeButton(onSnooze: (Int) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Box {
        TextButton(onClick = { expanded = true }) { Text("Snooze") }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            listOf("1 day" to 1, "3 days" to 3, "1 week" to 7).forEach { (label, days) ->
                DropdownMenuItem(
                    text = { Text(label) },
                    onClick = { expanded = false; onSnooze(days) },
                )
            }
        }
    }
}

@Composable
fun LabelChip(name: String, color: Color) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(color.copy(alpha = 0.12f))
            .padding(horizontal = 8.dp, vertical = 3.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        ColorDot(color, size = 8)
        Spacer(Modifier.width(5.dp))
        Text(
            name,
            color = MaterialTheme.colorScheme.onSurface,
            style = MaterialTheme.typography.labelSmall,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}
