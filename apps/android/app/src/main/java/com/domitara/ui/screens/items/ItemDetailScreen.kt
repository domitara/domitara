package com.domitara.ui.screens.items

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.domitara.data.dto.Item
import com.domitara.di.appViewModel
import com.domitara.ui.common.Async
import com.domitara.ui.common.Avatar
import com.domitara.ui.common.ErrorState
import com.domitara.ui.common.LabelValue
import com.domitara.ui.common.LoadingState
import com.domitara.ui.common.StatusBadge
import com.domitara.ui.common.formatCurrency
import com.domitara.ui.common.shortDate

@Composable
fun ItemDetailScreen(itemId: String, onBack: () -> Unit) {
    val vm = appViewModel { ItemDetailViewModel(it.dataRepository, itemId) }
    val state by vm.state.collectAsStateWithLifecycle()

    Column(Modifier.fillMaxSize()) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(8.dp)) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
            }
            Text("Item Details", style = MaterialTheme.typography.titleLarge)
        }

        when (val s = state) {
            Async.Loading -> LoadingState()
            is Async.Failure -> ErrorState(s.message, onRetry = vm::load)
            is Async.Success -> ItemDetailContent(s.data)
        }
    }
}

@Composable
private fun ItemDetailContent(item: Item) {
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Avatar(item.id, item.name, size = 56)
            Spacer(Modifier.width(16.dp))
            Column(Modifier.weight(1f)) {
                Text(item.name, style = MaterialTheme.typography.headlineMedium)
                Spacer(Modifier.padding(top = 4.dp))
                StatusBadge(item.status)
            }
        }
        Spacer(Modifier.padding(top = 16.dp))

        item.description?.let { LabelValue("Description", it) }
        LabelValue("Manufacturer", item.manufacturer ?: "—")
        LabelValue("Model", item.model ?: "—")
        LabelValue("Serial", item.serial ?: "—")
        LabelValue("Asset ID", item.assetId ?: "—")
        LabelValue("Purchase Price", formatCurrency(item.purchasePrice))
        LabelValue("Purchased", shortDate(item.purchasedAt))
    }
}
