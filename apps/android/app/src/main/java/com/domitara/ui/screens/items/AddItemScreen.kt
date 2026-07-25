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

@Composable
fun AddItemScreen(onBack: () -> Unit, onCreated: (String) -> Unit) {
    val vm = appViewModel { AddItemViewModel(it.dataRepository) }
    val locations by vm.locations.collectAsStateWithLifecycle()
    val labels by vm.labels.collectAsStateWithLifecycle()
    val saving by vm.saving.collectAsStateWithLifecycle()
    val error by vm.error.collectAsStateWithLifecycle()
    val created by vm.created.collectAsStateWithLifecycle()

    LaunchedEffect(created) {
        created?.let { onCreated(it.id) }
    }

    ActionErrorHost(error, vm::clearError) {
        Column(Modifier.fillMaxSize()) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(8.dp)) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                }
                Text("Add item", style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                if (saving) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp).padding(end = 12.dp))
                } else {
                    TextButton(onClick = vm::submit) { Text("Save") }
                }
            }
            HorizontalDivider()

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
                    Button(onClick = vm::submit, enabled = !saving) { Text("Save item") }
                    OutlinedButton(onClick = onBack) { Text("Cancel") }
                }
                Spacer(Modifier.padding(bottom = 24.dp))
            }
        }
    }
}
