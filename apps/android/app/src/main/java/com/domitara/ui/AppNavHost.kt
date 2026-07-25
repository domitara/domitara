package com.domitara.ui

import androidx.compose.runtime.Composable
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.domitara.ui.screens.assetids.AssetIdsScreen
import com.domitara.ui.screens.dashboard.DashboardScreen
import com.domitara.ui.screens.home.HomeDetailScreen
import com.domitara.ui.screens.items.AddItemScreen
import com.domitara.ui.screens.items.AllItemsScreen
import com.domitara.ui.screens.items.EditItemScreen
import com.domitara.ui.screens.items.ItemDetailScreen
import com.domitara.ui.screens.labels.LabelsScreen
import com.domitara.ui.screens.locations.LocationsScreen
import com.domitara.ui.screens.maintenance.MaintenanceScreen
import com.domitara.ui.screens.panels.ElectricalPanelsScreen
import com.domitara.ui.screens.profile.ProfileScreen
import com.domitara.ui.screens.search.SearchScreen

@Composable
fun AppNavHost(navController: NavHostController) {
    val openItem: (String) -> Unit = { id -> navController.navigate(Routes.itemDetail(id)) }

    // Mirrors the bottom nav bar's tab-switch semantics (see AppRoot.goTo) so that
    // jumping to a tab from the dashboard behaves the same as tapping it directly.
    val goToTab: (String) -> Unit = { route ->
        navController.navigate(route) {
            popUpTo(navController.graph.findStartDestination().id) { inclusive = false }
            launchSingleTop = true
        }
    }

    NavHost(navController = navController, startDestination = Routes.DASHBOARD) {
        composable(Routes.DASHBOARD) {
            DashboardScreen(
                onOpenItem = openItem,
                onOpenItems = { goToTab(Routes.ITEMS) },
                onOpenLocations = { goToTab(Routes.LOCATIONS) },
                onOpenLabels = { goToTab(Routes.LABELS) },
            )
        }
        composable(Routes.ITEMS) {
            AllItemsScreen(onOpenItem = openItem, onAddItem = { navController.navigate(Routes.ITEM_NEW) })
        }
        composable(Routes.SEARCH) { SearchScreen(onOpenItem = openItem) }
        composable(Routes.LOCATIONS) { LocationsScreen() }
        composable(Routes.LABELS) { LabelsScreen(onOpenItem = openItem) }

        composable(Routes.HOME_DETAIL) { HomeDetailScreen() }
        composable(Routes.PANELS) { ElectricalPanelsScreen() }
        composable(Routes.MAINTENANCE) { MaintenanceScreen() }
        composable(Routes.ASSET_IDS) { AssetIdsScreen() }
        composable(Routes.PROFILE) { ProfileScreen() }

        composable(
            route = Routes.ITEM_DETAIL,
            arguments = listOf(navArgument("itemId") { type = NavType.StringType }),
        ) { entry ->
            val itemId = entry.arguments?.getString("itemId").orEmpty()
            ItemDetailScreen(
                itemId = itemId,
                onBack = { navController.popBackStack() },
                onEdit = { navController.navigate(Routes.itemEdit(it)) },
            )
        }

        composable(
            route = Routes.ITEM_EDIT,
            arguments = listOf(navArgument("itemId") { type = NavType.StringType }),
        ) { entry ->
            val itemId = entry.arguments?.getString("itemId").orEmpty()
            EditItemScreen(
                itemId = itemId,
                onBack = { navController.popBackStack() },
                onSaved = { id ->
                    // Pop both the edit screen and the (now-stale) detail screen it was
                    // opened from, so the fresh detail screen replaces it rather than stacking.
                    navController.navigate(Routes.itemDetail(id)) {
                        popUpTo(Routes.ITEM_DETAIL) { inclusive = true }
                    }
                },
            )
        }

        composable(Routes.ITEM_NEW) {
            AddItemScreen(
                onBack = { navController.popBackStack() },
                onCreated = { id ->
                    navController.navigate(Routes.itemDetail(id)) {
                        popUpTo(Routes.ITEM_NEW) { inclusive = true }
                    }
                },
            )
        }
    }
}
