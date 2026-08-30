package com.domitara.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.rememberDrawerState
import androidx.compose.material3.DrawerValue
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.domitara.data.session.Session
import com.domitara.di.LocalAppContainer
import com.domitara.notifications.RequestNotificationPermission
import com.domitara.ui.common.BoxIcon
import com.domitara.ui.common.LoadingState
import com.domitara.ui.common.TagIcon
import com.domitara.ui.screens.auth.LoginScreen
import com.domitara.ui.screens.menu.MenuDrawer
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch

private sealed interface SessionState {
    data object Loading : SessionState
    data class Ready(val session: Session?) : SessionState
}

@Composable
fun AppRoot(pendingItemId: String? = null, onDeepLinkConsumed: () -> Unit = {}) {
    val container = LocalAppContainer.current
    val state by remember {
        container.session.map<Session?, SessionState> { SessionState.Ready(it) }
    }.collectAsState(initial = SessionState.Loading)

    when (val s = state) {
        SessionState.Loading -> Box(Modifier.fillMaxSize()) { LoadingState() }
        is SessionState.Ready ->
            if (s.session == null) LoginScreen()
            else MainScaffold(pendingItemId = pendingItemId, onDeepLinkConsumed = onDeepLinkConsumed)
    }
}

private data class Tab(val route: String, val label: String, val icon: ImageVector)

private val tabs = listOf(
    Tab(Routes.DASHBOARD, "Dashboard", Icons.Filled.Home),
    Tab(Routes.ITEMS, "Items", BoxIcon),
    Tab(Routes.SEARCH, "Search", Icons.Filled.Search),
    Tab(Routes.LOCATIONS, "Locations", Icons.Filled.Place),
    Tab(Routes.LABELS, "Labels", TagIcon),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MainScaffold(pendingItemId: String? = null, onDeepLinkConsumed: () -> Unit = {}) {
    RequestNotificationPermission()

    val navController = rememberNavController()
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    LaunchedEffect(pendingItemId) {
        if (pendingItemId != null) {
            navController.navigate(Routes.itemDetail(pendingItemId)) {
                popUpTo(navController.graph.findStartDestination().id) { inclusive = false }
            }
            onDeepLinkConsumed()
        }
    }

    // Single entry point for every top-level destination (bottom bar + drawer).
    // Popping to the start destination keeps these screens as siblings rather than
    // stacking them, so switching between them always swaps the visible screen.
    val goTo: (String) -> Unit = { route ->
        navController.navigate(route) {
            popUpTo(navController.graph.findStartDestination().id) { inclusive = false }
            launchSingleTop = true
        }
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            MenuDrawer(
                onNavigate = { route ->
                    scope.launch { drawerState.close() }
                    goTo(route)
                },
                onClose = { scope.launch { drawerState.close() } },
            )
        },
    ) {
        Scaffold(
            topBar = {
                CenterAlignedTopAppBar(
                    title = { Text(titleFor(currentRoute)) },
                    navigationIcon = {
                        IconButton(onClick = { scope.launch { drawerState.open() } }) {
                            Icon(Icons.Filled.Menu, contentDescription = "Menu")
                        }
                    },
                )
            },
            bottomBar = {
                NavigationBar {
                    tabs.forEach { tab ->
                        val selected = backStackEntry?.destination?.hierarchy
                            ?.any { it.route == tab.route } == true
                        NavigationBarItem(
                            selected = selected,
                            onClick = { goTo(tab.route) },
                            icon = { Icon(tab.icon, contentDescription = tab.label) },
                            label = { Text(tab.label) },
                        )
                    }
                }
            },
        ) { padding ->
            Box(Modifier.padding(padding)) {
                AppNavHost(navController)
            }
        }
    }
}

private fun titleFor(route: String?): String = when (route) {
    Routes.DASHBOARD -> "Domitara"
    Routes.ITEMS -> "All Items"
    Routes.SEARCH -> "Search"
    Routes.LOCATIONS -> "Locations"
    Routes.LABELS -> "Labels"
    Routes.HOME_DETAIL -> "Home"
    Routes.PANELS -> "Electrical Panels"
    Routes.PAINT_COLORS -> "Paint Colors"
    Routes.MAINTENANCE -> "Maintenance"
    Routes.ASSET_IDS -> "Asset IDs"
    Routes.PROFILE -> "Profile & Settings"
    Routes.ITEM_NEW -> "Add Item"
    Routes.ITEM_EDIT -> "Edit Item"
    else -> "Domitara"
}
