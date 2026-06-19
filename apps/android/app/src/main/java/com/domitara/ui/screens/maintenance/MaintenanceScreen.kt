package com.domitara.ui.screens.maintenance

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.domitara.data.dto.MaintenanceLog
import com.domitara.data.dto.MaintenanceSchedule
import com.domitara.data.dto.Reminder
import com.domitara.data.dto.ReminderTone
import com.domitara.di.appViewModel
import com.domitara.ui.common.ActionErrorHost
import com.domitara.ui.common.Async
import com.domitara.ui.common.ErrorState
import com.domitara.ui.common.LoadingState
import com.domitara.ui.common.SectionHeader
import com.domitara.ui.common.SnoozeButton
import com.domitara.ui.common.formatCurrency
import com.domitara.ui.common.shortDate
import com.domitara.ui.theme.DangerRed
import com.domitara.ui.theme.InfoBlue
import com.domitara.ui.theme.TextMuted
import com.domitara.ui.theme.WarnAmber
import java.time.LocalDate
import java.time.temporal.ChronoUnit

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MaintenanceScreen() {
    val vm = appViewModel { MaintenanceViewModel(it.dataRepository, it.activeHomeId) }
    val state by vm.state.collectAsStateWithLifecycle()
    val refreshing by vm.refreshing.collectAsStateWithLifecycle()
    val actionError by vm.actionError.collectAsStateWithLifecycle()

    // Sheet state: a non-null value means the corresponding sheet is open.
    var logDefaults by remember { mutableStateOf<LogDefaults?>(null) }
    var scheduleSheet by remember { mutableStateOf<ScheduleSheetState?>(null) }

    ActionErrorHost(actionError, vm::clearActionError) {
    PullToRefreshBox(isRefreshing = refreshing, onRefresh = vm::refresh) {
        when (val s = state) {
            Async.Loading -> LoadingState()
            is Async.Failure -> ErrorState(s.message, onRetry = vm::load)
            is Async.Success -> {
                val data = s.data
                MaintenanceContent(
                    data = data,
                    onLog = { logDefaults = LogDefaults() },
                    onAddSchedule = { scheduleSheet = ScheduleSheetState(null) },
                    onMarkDone = { logDefaults = it.toLogDefaults() },
                    onEditSchedule = { scheduleSheet = ScheduleSheetState(it) },
                    onDeleteSchedule = vm::deleteSchedule,
                    onDeleteLog = vm::deleteLog,
                    onDismissReminder = vm::dismissReminder,
                    onSnoozeReminder = vm::snoozeReminder,
                )

                logDefaults?.let { defaults ->
                    LogMaintenanceSheet(
                        items = data.items,
                        defaultTitle = defaults.title,
                        defaultItemId = defaults.itemId,
                        scheduleId = defaults.scheduleId,
                        onSave = { input -> vm.createLog(input) { logDefaults = null } },
                        onDismiss = { logDefaults = null },
                    )
                }

                scheduleSheet?.let { sheet ->
                    ScheduleEditorSheet(
                        items = data.items,
                        editing = sheet.editing,
                        onCreate = { input -> vm.createSchedule(input) { scheduleSheet = null } },
                        onUpdate = { id, input -> vm.updateSchedule(id, input) { scheduleSheet = null } },
                        onDismiss = { scheduleSheet = null },
                    )
                }
            }
        }
    }
    }
}

private data class LogDefaults(
    val title: String? = null,
    val itemId: String? = null,
    val scheduleId: String? = null,
)

private data class ScheduleSheetState(val editing: MaintenanceSchedule?)

private fun MaintenanceSchedule.toLogDefaults() =
    LogDefaults(title = title, itemId = itemId, scheduleId = id)

@Composable
private fun MaintenanceContent(
    data: MaintenanceData,
    onLog: () -> Unit,
    onAddSchedule: () -> Unit,
    onMarkDone: (MaintenanceSchedule) -> Unit,
    onEditSchedule: (MaintenanceSchedule) -> Unit,
    onDeleteSchedule: (String) -> Unit,
    onDeleteLog: (String) -> Unit,
    onDismissReminder: (String) -> Unit,
    onSnoozeReminder: (String, Int) -> Unit,
) {
    LazyColumn(
        contentPadding = PaddingValues(vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        item {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                OutlinedButton(onClick = onAddSchedule, modifier = Modifier.weight(1f)) {
                    Text("Add schedule")
                }
                Button(onClick = onLog, modifier = Modifier.weight(1f)) {
                    Text("Log maintenance")
                }
            }
        }

        if (data.reminders.isNotEmpty()) {
            item { SectionHeader("Reminders") }
            items(data.reminders, key = { it.id }) { reminder ->
                ReminderCard(
                    reminder = reminder,
                    onDismiss = { onDismissReminder(reminder.id) },
                    onSnooze = { days -> onSnoozeReminder(reminder.id, days) },
                )
            }
        }

        item { SectionHeader("Schedules") }
        if (data.schedules.isEmpty()) {
            item { SectionHint("No schedules yet. Add one to track recurring tasks.") }
        } else {
            items(data.schedules, key = { it.id }) { schedule ->
                ScheduleCard(
                    schedule = schedule,
                    onMarkDone = { onMarkDone(schedule) },
                    onEdit = { onEditSchedule(schedule) },
                    onDelete = { onDeleteSchedule(schedule.id) },
                )
            }
        }

        item { SectionHeader("Recent logs") }
        if (data.logs.isEmpty()) {
            item { SectionHint("No maintenance logged yet.") }
        } else {
            items(data.logs, key = { it.id }) { log ->
                LogCard(log = log, onDelete = { onDeleteLog(log.id) })
            }
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
private fun ScheduleCard(
    schedule: MaintenanceSchedule,
    onMarkDone: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
) {
    val status = dueStatus(schedule.nextDueAt)
    Card(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp)) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                StatusPill(status.label, status.color)
                Spacer(Modifier.weight(1f))
                Text(
                    "Due ${schedule.nextDueAt}",
                    style = MaterialTheme.typography.labelMedium,
                    color = TextMuted,
                )
            }
            Spacer(Modifier.height(8.dp))
            Text(
                schedule.title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                buildString {
                    append(formatFrequency(schedule.frequencyValue, schedule.frequencyUnit))
                    schedule.itemName?.let { append(" · "); append(it) }
                },
                style = MaterialTheme.typography.bodyMedium,
                color = TextMuted,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(4.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                TextButton(onClick = onMarkDone) { Text("Done") }
                TextButton(onClick = onEdit) { Text("Edit") }
                TextButton(onClick = onDelete) { Text("Delete", color = DangerRed) }
            }
        }
    }
}

@Composable
private fun LogCard(log: MaintenanceLog, onDelete: () -> Unit) {
    Card(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp)) {
        Row(
            Modifier.padding(start = 16.dp, top = 12.dp, bottom = 12.dp, end = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    log.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    buildString {
                        append(shortDate(log.performedAt))
                        log.itemName?.let { append(" · "); append(it) }
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextMuted,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            if (log.cost != null) {
                Text(
                    formatCurrency(log.cost),
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.SemiBold,
                )
            }
            TextButton(onClick = onDelete) { Text("Delete", color = DangerRed) }
        }
    }
}

@Composable
private fun StatusPill(label: String, color: Color) {
    Box(
        Modifier
            .background(color.copy(alpha = 0.15f), RoundedCornerShape(6.dp))
            .padding(horizontal = 8.dp, vertical = 2.dp),
    ) {
        Text(label, color = color, style = MaterialTheme.typography.labelSmall)
    }
}

@Composable
private fun SectionHint(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.bodyMedium,
        color = TextMuted,
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
    )
}

private data class DueStatus(val label: String, val color: Color)

private fun dueStatus(nextDueAt: String): DueStatus {
    val due = runCatching { LocalDate.parse(nextDueAt.take(10)) }.getOrNull()
        ?: return DueStatus("Upcoming", InfoBlue)
    val days = ChronoUnit.DAYS.between(LocalDate.now(), due)
    return when {
        days < 0 -> DueStatus("Overdue", DangerRed)
        days <= 7 -> DueStatus("Due soon", WarnAmber)
        else -> DueStatus("Upcoming", InfoBlue)
    }
}

private fun formatFrequency(value: Int, unit: String): String {
    val u = if (value == 1) unit.removeSuffix("s") else unit
    return "Every $value $u"
}
