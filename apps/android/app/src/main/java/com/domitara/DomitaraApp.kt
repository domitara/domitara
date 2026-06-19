package com.domitara

import android.app.Application
import com.domitara.di.AppContainer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob

class DomitaraApp : Application() {

    private val appScope = CoroutineScope(SupervisorJob())

    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this, appScope)
    }
}
