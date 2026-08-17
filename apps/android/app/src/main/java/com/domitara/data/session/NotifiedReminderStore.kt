package com.domitara.data.session

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first

private val Context.notifiedReminderDataStore by preferencesDataStore(name = "domitara_notified_reminders")

/**
 * Tracks which reminder ids the background check has already posted a system
 * notification for, so [com.domitara.notifications.ReminderCheckWorker] doesn't
 * re-notify for the same reminder on every periodic run. An id dropping out of
 * the current active set (dismissed, snoozed, resolved) is forgotten so the
 * reminder notifies again if it becomes active later.
 */
class NotifiedReminderStore(private val context: Context) {

    private val keyNotifiedIds = stringSetPreferencesKey("notified_ids")

    suspend fun notifiedIds(): Set<String> =
        context.notifiedReminderDataStore.data.first()[keyNotifiedIds] ?: emptySet()

    suspend fun setNotifiedIds(ids: Set<String>) {
        context.notifiedReminderDataStore.edit { prefs -> prefs[keyNotifiedIds] = ids }
    }
}
