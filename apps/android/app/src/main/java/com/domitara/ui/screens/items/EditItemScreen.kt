package com.domitara.ui.screens.items

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.domitara.di.appViewModel
import com.domitara.ui.common.ActionErrorHost
import com.domitara.ui.common.Async
import com.domitara.ui.common.ErrorState
import com.domitara.ui.common.LoadingState

@Composable
fun EditItemScreen(itemId: String, onBack: () -> Unit, onSaved: (String) -> Unit) {
    val vm = appViewModel { EditItemViewModel(it.dataRepository, itemId) }
    val loadState by vm.loadState.collectAsStateWithLifecycle()
    val locations by vm.locations.collectAsStateWithLifecycle()
    val labels by vm.labels.collectAsStateWithLifecycle()
    val saving by vm.saving.collectAsStateWithLifecycle()
    val error by vm.error.collectAsStateWithLifecycle()
    val saved by vm.saved.collectAsStateWithLifecycle()

    LaunchedEffect(saved) {
        saved?.let { onSaved(it.id) }
    }

    ActionErrorHost(error, vm::clearError) {
        Column(Modifier.fillMaxSize()) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(8.dp)) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                }
                Text("Edit item", style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                if (saving) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp).padding(end = 12.dp))
                } else if (loadState is Async.Success) {
                    TextButton(onClick = vm::submit) { Text("Save") }
                }
            }
            HorizontalDivider()

            when (val s = loadState) {
                Async.Loading -> LoadingState()
                is Async.Failure -> ErrorState(s.message, onRetry = vm::load)
                is Async.Success ->
                    Column(
                        Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                            .imePadding()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        ItemFormFields(vm = vm, locations = locations, labels = labels)

                        Spacer(Modifier.padding(top = 8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(onClick = vm::submit, enabled = !saving) { Text("Save changes") }
                            OutlinedButton(onClick = onBack) { Text("Cancel") }
                        }
                        Spacer(Modifier.padding(bottom = 24.dp))
                    }
            }
        }
    }
}
