package com.domitara.ui.screens.menu

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.domitara.di.LocalAppContainer
import com.domitara.ui.Routes
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

    ModalDrawerSheet(modifier = Modifier.fillMaxHeight()) {
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

        Spacer(Modifier.height(8.dp))
        HorizontalDivider()
        Spacer(Modifier.height(8.dp))

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
    }
}
