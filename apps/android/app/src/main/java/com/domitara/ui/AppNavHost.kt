package com.domitara.ui

import androidx.compose.runtime.Composable
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

    NavHost(navController = navController, startDestination = Routes.DASHBOARD) {
        composable(Routes.DASHBOARD) { DashboardScreen(onOpenItem = openItem) }
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
            ItemDetailScreen(itemId = itemId, onBack = { navController.popBackStack() })
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
