package com.domitara

import android.app.Application
import androidx.work.Configuration
import com.domitara.di.AppContainer
import com.domitara.notifications.ReminderNotifier
import com.domitara.notifications.ReminderWorkerFactory
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob

class DomitaraApp : Application(), Configuration.Provider {

    private val appScope = CoroutineScope(SupervisorJob())

    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this, appScope)
        ReminderNotifier.createChannel(this)
    }

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(
                ReminderWorkerFactory(container.sessionStore, container.dataRepository)
            )
            .build()
}
