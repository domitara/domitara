package com.domitara.ui.screens.search

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.domitara.di.appViewModel
import com.domitara.ui.common.Async
import com.domitara.ui.common.EmptyState
import com.domitara.ui.common.ErrorState
import com.domitara.ui.common.LoadingState
import com.domitara.ui.screens.items.AllItemsViewModel
import com.domitara.ui.screens.items.ItemRow

@Composable
fun SearchScreen(onOpenItem: (String) -> Unit) {
    // Reuses the items view model for server-side `q` search.
    val vm = appViewModel { AllItemsViewModel(it.dataRepository, it.activeHomeId) }
    LaunchedEffect(Unit) { vm.start() }

    val query by vm.query.collectAsStateWithLifecycle()
    val itemsState by vm.displayedItems.collectAsStateWithLifecycle()
    val labels by vm.labels.collectAsStateWithLifecycle()
    val locations by vm.locations.collectAsStateWithLifecycle()
    val labelsById = remember(labels) { labels.associateBy { it.id } }
    val locationNames = remember(locations) { locations.associate { it.id to it.name } }

    Column(Modifier.fillMaxSize()) {
        OutlinedTextField(
            value = query,
            onValueChange = vm::setQuery,
            placeholder = { Text("Search name, serial, model…") },
            leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
        )

        when (val s = itemsState) {
            Async.Loading -> LoadingState()
            is Async.Failure -> ErrorState(s.message, onRetry = vm::reloadNow)
            is Async.Success ->
                if (s.data.isEmpty()) {
                    EmptyState("No results", "Type to search your inventory.")
                } else {
                    LazyColumn(Modifier.fillMaxSize()) {
                        items(s.data, key = { it.id }) { item ->
                            ItemRow(
                                item = item,
                                labelsById = labelsById,
                                locationName = item.locationId?.let { locationNames[it] },
                                onClick = { onOpenItem(item.id) },
                            )
                            HorizontalDivider()
                        }
                    }
                }
        }
    }
}
