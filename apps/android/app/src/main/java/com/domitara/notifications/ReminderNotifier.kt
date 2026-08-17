package com.domitara.notifications

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.core.content.getSystemService
import com.domitara.MainActivity
import com.domitara.R
import com.domitara.data.dto.Reminder

private const val CHANNEL_ID = "maintenance_reminders"

/** Posts local system notifications for reminders due on this device. */
object ReminderNotifier {

    /** Registers the notification channel. Safe to call repeatedly (e.g. every app start). */
    fun createChannel(context: Context) {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Maintenance Reminders",
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply {
            description = "Overdue and upcoming maintenance, warranty, and setup reminders"
        }
        context.getSystemService<NotificationManager>()?.createNotificationChannel(channel)
    }

    /** Posts a notification for [reminder]. Silently no-ops if the POST_NOTIFICATIONS
     *  permission hasn't been granted (Android 13+). */
    fun notify(context: Context, reminder: Reminder) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            return
        }

        val openIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            reminder.id.hashCode(),
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_launcher_monochrome)
            .setContentTitle(reminder.title)
            .setContentText(reminder.body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(reminder.body))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        NotificationManagerCompat.from(context).notify(reminder.id.hashCode(), notification)
    }
}
