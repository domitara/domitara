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
        if (sessionStore.current() == null) return Result.success()

        val reminders = try {
            dataRepository.listReminders()
        } catch (e: ApiException) {
            return if (e.unauthorized) Result.success() else Result.retry()
        } catch (e: Exception) {
            return Result.retry()
        }

        val activeIds = reminders.map { it.id }.toSet()
        val alreadyNotified = notifiedReminderStore.notifiedIds()

        reminders.filter { it.id !in alreadyNotified }
            .forEach { ReminderNotifier.notify(applicationContext, it) }

        // The active set becomes the new notified set: still-active ids stay
        // marked notified, and ids that dropped out (dismissed/snoozed/resolved)
        // are forgotten so the reminder notifies again if it resurfaces later.
        notifiedReminderStore.setNotifiedIds(activeIds)

        return Result.success()
    }
}
