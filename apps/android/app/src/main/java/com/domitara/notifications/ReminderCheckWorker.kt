package com.domitara.notifications

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.domitara.data.api.ApiException
import com.domitara.data.repository.DataRepository
import com.domitara.data.session.NotifiedReminderStore
import com.domitara.data.session.SessionStore

/**
 * Periodic background check (see [com.domitara.di.AppContainer], which enqueues
 * this on sign-in and cancels it on sign-out) that polls `GET /reminders` —
 * already filtered server-side to currently active/due reminders — and posts a
 * local notification for anything not already notified this "active" cycle.
 */
class ReminderCheckWorker(
    context: Context,
    params: WorkerParameters,
    private val sessionStore: SessionStore,
    private val dataRepository: DataRepository,
    private val notifiedReminderStore: NotifiedReminderStore,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        // A cold worker start can run before AppContainer's session collector has
        // populated the in-memory token, which would surface as a bogus "unauthorized".
        val session = sessionStore.current() ?: return Result.success()
        dataRepository.ensureSession(session)

        val reminders = try {
            dataRepository.listReminders()
        } catch (e: ApiException) {
            return if (e.unauthorized) Result.success() else Result.retry()
        } catch (e: Exception) {
            return Result.retry()
        }

        val alreadyNotified = notifiedReminderStore.notifiedIds()

        // Only ids we actually posted (or posted before) count as notified. If
        // notifications are blocked, nothing is recorded, so the reminder still
        // fires on a later run once the user grants permission.
        val delivered = reminders.filter { it.id in alreadyNotified }.map { it.id }.toMutableSet()
        reminders.filter { it.id !in alreadyNotified }.forEach {
            if (ReminderNotifier.notify(applicationContext, it)) delivered += it.id
        }

        // Ids that dropped out of the active set (dismissed/snoozed/resolved) are
        // forgotten so the reminder notifies again if it resurfaces later.
        notifiedReminderStore.setNotifiedIds(delivered)

        return Result.success()
    }
}
