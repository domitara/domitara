package com.domitara.ui.screens.menu

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.domitara.data.dto.User
import com.domitara.di.LocalAppContainer
import com.domitara.di.appViewModel
import com.domitara.ui.Routes
import com.domitara.ui.common.Avatar
import com.domitara.ui.common.BoltIcon
import com.domitara.ui.common.BuildingIcon
import com.domitara.ui.common.ClipboardIcon
import com.domitara.ui.common.QrCodeIcon

private data class MenuEntry(val label: String, val route: String, val icon: ImageVector)

private val entries = listOf(
    MenuEntry("Home", Routes.HOME_DETAIL, BuildingIcon),
    MenuEntry("Maintenance", Routes.MAINTENANCE, ClipboardIcon),
    MenuEntry("Electrical Panels", Routes.PANELS, BoltIcon),
    MenuEntry("Asset IDs", Routes.ASSET_IDS, QrCodeIcon),
)

@Composable
fun MenuDrawer(
    onNavigate: (String) -> Unit,
    onClose: () -> Unit,
) {
    val container = LocalAppContainer.current
    val vm = appViewModel { MenuViewModel(it.currentUser, it.session, it.dataRepository) }
    val user by vm.user.collectAsState()
    val version by vm.version.collectAsState()

    ModalDrawerSheet(modifier = Modifier.fillMaxHeight()) {
        Column(Modifier.fillMaxHeight()) {
            Column(Modifier.fillMaxWidth().padding(16.dp)) {
                Text("Domitara", style = MaterialTheme.typography.headlineMedium)
                Text(
                    "Home Inventory",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            HorizontalDivider()
            Spacer(Modifier.height(8.dp))

            entries.forEach { entry ->
                NavigationDrawerItem(
                    label = { Text(entry.label) },
                    icon = { Icon(entry.icon, contentDescription = entry.label) },
                    selected = false,
                    onClick = { onNavigate(entry.route) },
                    modifier = Modifier.padding(horizontal = 12.dp),
                )
            }

            // Push the account/logout/version footer to the very bottom.
            Spacer(Modifier.weight(1f))

            HorizontalDivider()
            Spacer(Modifier.height(8.dp))

            // User info, mirroring the web sidebar (avatar + name + email).
            // Tapping it opens the profile/settings screen, like the web app.
            UserInfo(user, onClick = { onNavigate(Routes.PROFILE) })

            NavigationDrawerItem(
                label = { Text("Logout") },
                icon = { Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = "Logout") },
                selected = false,
                onClick = {
                    onClose()
                    // Run on the app scope: clearing the session tears down this drawer
                    // (and its composition scope) before logout finishes otherwise.
                    container.logout()
                },
                modifier = Modifier.padding(horizontal = 12.dp),
            )

            // Server version sits right below logout.
            Text(
                text = version?.let { "Server v$it" } ?: "Server …",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
        }
    }
}

@Composable
private fun UserInfo(user: User?, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Avatar(id = user?.id?.toString() ?: "?", name = user?.name ?: "?", size = 36)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(
                text = user?.name ?: "You",
                style = MaterialTheme.typography.bodyMedium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = user?.email ?: "",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}
