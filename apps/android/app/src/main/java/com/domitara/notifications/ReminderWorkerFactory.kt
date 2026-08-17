package com.domitara.notifications

import android.content.Context
import androidx.work.ListenableWorker
import androidx.work.WorkerFactory
import androidx.work.WorkerParameters
import com.domitara.data.repository.DataRepository
import com.domitara.data.session.NotifiedReminderStore
import com.domitara.data.session.SessionStore

/**
 * Constructs [ReminderCheckWorker] with its dependencies pulled from
 * [com.domitara.di.AppContainer]. Needed because the app has no Hilt/Koin —
 * WorkManager's default [WorkerFactory] can only build workers with a no-arg
 * constructor.
 */
class ReminderWorkerFactory(
    private val sessionStore: SessionStore,
    private val dataRepository: DataRepository,
) : WorkerFactory() {
    override fun createWorker(
        appContext: Context,
        workerClassName: String,
        workerParameters: WorkerParameters,
    ): ListenableWorker? = when (workerClassName) {
        ReminderCheckWorker::class.java.name -> ReminderCheckWorker(
            appContext,
            workerParameters,
            sessionStore,
            dataRepository,
            NotifiedReminderStore(appContext),
        )
        else -> null
    }
}
