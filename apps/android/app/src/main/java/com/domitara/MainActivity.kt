package com.domitara

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.CompositionLocalProvider
import com.domitara.di.LocalAppContainer
import com.domitara.ui.AppRoot
import com.domitara.ui.theme.DomitaraTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val container = (application as DomitaraApp).container
        setContent {
            CompositionLocalProvider(LocalAppContainer provides container) {
                DomitaraTheme {
                    AppRoot()
                }
            }
        }
    }
}
