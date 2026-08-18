package com.domitara

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.domitara.di.LocalAppContainer
import com.domitara.ui.AppRoot
import com.domitara.ui.theme.DomitaraTheme

/** Matches domitara://items/{itemId}, the scheme QR codes on printed item labels encode. */
private fun deepLinkItemId(intent: Intent?): String? {
    val uri = intent?.data ?: return null
    if (uri.scheme != "domitara" || uri.host != "items") return null
    return uri.lastPathSegment
}

class MainActivity : ComponentActivity() {
    private var pendingItemId by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        pendingItemId = deepLinkItemId(intent)
        val container = (application as DomitaraApp).container
        setContent {
            CompositionLocalProvider(LocalAppContainer provides container) {
                DomitaraTheme {
                    AppRoot(
                        pendingItemId = pendingItemId,
                        onDeepLinkConsumed = { pendingItemId = null },
                    )
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        deepLinkItemId(intent)?.let { pendingItemId = it }
    }
}
