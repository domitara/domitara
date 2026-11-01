package com.domitara.notifications

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import com.domitara.di.LocalAppContainer

/**
 * Requests the POST_NOTIFICATIONS runtime permission once, on first
 * composition, so [ReminderCheckWorker] can actually surface a notification.
 * No-ops below API 33, where the permission doesn't exist. If declined, the
 * background check still runs harmlessly — it just won't display anything.
 */
@Composable
fun RequestNotificationPermission() {
    val context = LocalContext.current
    val container = LocalAppContainer.current
    // The first periodic run usually fires before the user answers the prompt, so check again on grant.
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) container.checkRemindersNow()
    }

    LaunchedEffect(Unit) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted = ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
                PackageManager.PERMISSION_GRANTED
            if (!granted) launcher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }
}
