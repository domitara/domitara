package com.domitara.ui.screens.dashboard

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.domitara.data.dto.DashboardStats
import com.domitara.data.dto.Item
import com.domitara.data.dto.Reminder
import com.domitara.data.dto.ReminderTone
import com.domitara.di.LocalAppContainer
import com.domitara.di.appViewModel
import com.domitara.ui.common.ActionErrorHost
import com.domitara.ui.common.Async
import com.domitara.ui.common.Avatar
import com.domitara.ui.common.ErrorState
import com.domitara.ui.common.LoadingState
import com.domitara.ui.common.SectionHeader
import com.domitara.ui.common.SnoozeButton
import com.domitara.ui.common.formatCurrencyWhole
import com.domitara.ui.theme.DangerRed
import com.domitara.ui.theme.InfoBlue
import com.domitara.ui.theme.WarnAmber

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    onOpenItem: (String) -> Unit,
    onOpenItems: () -> Unit = {},
    onOpenLocations: () -> Unit = {},
    onOpenLabels: () -> Unit = {},
) {
    val vm = appViewModel { DashboardViewModel(it.dataRepository, it.activeHomeId) }
    val state by vm.state.collectAsStateWithLifecycle()
    val refreshing by vm.refreshing.collectAsStateWithLifecycle()
    val actionError by vm.actionError.collectAsStateWithLifecycle()

    ActionErrorHost(actionError, vm::clearActionError) {
        PullToRefreshBox(isRefreshing = refreshing, onRefresh = vm::refresh) {
            when (val s = state) {
                Async.Loading -> LoadingState()
                is Async.Failure -> ErrorState(s.message, onRetry = vm::load)
                is Async.Success -> DashboardContent(
                    data = s.data,
                    onOpenItem = onOpenItem,
                    onOpenItems = onOpenItems,
                    onOpenLocations = onOpenLocations,
                    onOpenLabels = onOpenLabels,
                    onDismiss = vm::dismiss,
                    onSnooze = { id, days -> vm.snooze(id, days) },
                )
            }
        }
    }
}

@Composable
private fun DashboardContent(
    data: DashboardData,
    onOpenItem: (String) -> Unit,
    onOpenItems: () -> Unit,
    onOpenLocations: () -> Unit,
    onOpenLabels: () -> Unit,
    onDismiss: (String) -> Unit,
    onSnooze: (String, Int) -> Unit,
) {
    LazyColumn(
        contentPadding = PaddingValues(vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        item {
            StatsGrid(
                stats = data.stats,
                onOpenItems = onOpenItems,
                onOpenLocations = onOpenLocations,
                onOpenLabels = onOpenLabels,
            )
        }

        if (data.reminders.isNotEmpty()) {
            item { SectionHeader("Needs Attention") }
            items(data.reminders, key = { it.id }) { reminder ->
                ReminderCard(
                    reminder,
                    onDismiss = { onDismiss(reminder.id) },
                    onSnooze = { days -> onSnooze(reminder.id, days) },
                )
            }
        }

        if (data.recentItems.isNotEmpty()) {
            item { SectionHeader("Recently Added") }
            item {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(data.recentItems, key = { it.id }) { item ->
                        RecentItemCard(item, onClick = { onOpenItem(item.id) })
                    }
                }
            }
        }
    }
}

@Composable
private fun StatsGrid(
    stats: DashboardStats,
    onOpenItems: () -> Unit,
    onOpenLocations: () -> Unit,
    onOpenLabels: () -> Unit,
) {
    Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            StatTile("Items", stats.totalItems.toString(), Modifier.weight(1f), onClick = onOpenItems)
            StatTile("Locations", stats.totalLocations.toString(), Modifier.weight(1f), onClick = onOpenLocations)
        }
        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            StatTile("Labels", stats.totalLabels.toString(), Modifier.weight(1f), onClick = onOpenLabels)
            StatTile("Total Value", formatCurrencyWhole(stats.totalValue), Modifier.weight(1f))
        }
        Spacer(Modifier.height(12.dp))
        StatTile(
            "Warranties Expiring",
            stats.totalExpiringWarranties.toString(),
            Modifier.fillMaxWidth(),
            onClick = onOpenItems,
        )
    }
}

@Composable
private fun StatTile(label: String, value: String, modifier: Modifier = Modifier, onClick: (() -> Unit)? = null) {
    Card(if (onClick != null) modifier.clickable(onClick = onClick) else modifier) {
        Column(Modifier.padding(16.dp)) {
            Text(value, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.ExtraBold)
            Text(
                label,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun ReminderCard(reminder: Reminder, onDismiss: () -> Unit, onSnooze: (Int) -> Unit) {
    val accent = when (reminder.tone) {
        ReminderTone.INFO -> InfoBlue
        ReminderTone.WARN -> WarnAmber
        ReminderTone.DANGER -> DangerRed
    }
    Card(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp)) {
        Column(Modifier.padding(16.dp)) {
            Text(reminder.title, style = MaterialTheme.typography.titleMedium, color = accent)
            Spacer(Modifier.height(4.dp))
            Text(reminder.body, style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SnoozeButton(onSnooze)
                OutlinedButton(onClick = onDismiss) { Text("Dismiss") }
            }
        }
    }
}

@Composable
private fun RecentItemCard(item: Item, onClick: () -> Unit) {
    val container = LocalAppContainer.current
    Card(Modifier.width(140.dp).clickable(onClick = onClick)) {
        Column(Modifier.padding(12.dp)) {
            if (item.coverPhotoUrl != null) {
                AsyncImage(
                    model = container.dataRepository.absoluteUrl(item.coverPhotoUrl),
                    imageLoader = container.imageLoader,
                    contentDescription = item.name,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.size(36.dp).clip(CircleShape),
                )
            } else {
                Avatar(item.id, item.name, size = 36)
            }
            Spacer(Modifier.height(8.dp))
            Text(
                item.name,
                style = MaterialTheme.typography.titleMedium,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}
