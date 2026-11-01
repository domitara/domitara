package com.domitara.ui.screens.paint

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import com.domitara.data.api.toUserMessage
import com.domitara.data.dto.PaintColor
import com.domitara.data.dto.UpdatePaintColorInput
import com.domitara.data.repository.DataRepository
import com.domitara.di.appViewModel
import com.domitara.ui.common.ActionErrorHost
import com.domitara.ui.common.Async
import com.domitara.ui.common.ErrorState
import com.domitara.ui.common.LoadingState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class PaintColorEditViewModel(
    private val repo: DataRepository,
    private val id: String,
) : ViewModel() {

    private val _color = MutableStateFlow<Async<PaintColor>>(Async.Loading)
    val color: StateFlow<Async<PaintColor>> = _color.asStateFlow()

    private val _saving = MutableStateFlow(false)
    val saving: StateFlow<Boolean> = _saving.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _saved = MutableStateFlow(false)
    val saved: StateFlow<Boolean> = _saved.asStateFlow()

    init { load() }

    fun clearError() { _error.value = null }

    fun load() {
        viewModelScope.launch {
            _color.value = Async.Loading
            runCatching { repo.listPaintColors().first { it.id == id } }
                .onSuccess { _color.value = Async.Success(it) }
                .onFailure { _color.value = Async.Failure(it.toUserMessage("Failed to load paint color")) }
        }
    }

    fun save(form: PaintColorFormState) {
        viewModelScope.launch {
            _saving.value = true
            runCatching {
                repo.updatePaintColor(
                    id,
                    UpdatePaintColorInput(
                        name = form.name.ifBlank { "New paint color" },
                        color = form.hex,
                        brand = form.brand.ifBlank { null },
                        colorCode = form.code.ifBlank { null },
                        sheen = form.sheen.ifBlank { null },
                        notes = form.notes.ifBlank { null },
                    ),
                )
            }
                .onSuccess { _saved.value = true }
                .onFailure { _error.value = it.toUserMessage("Couldn't update paint color") }
            _saving.value = false
        }
    }
}

@Composable
fun PaintColorEditScreen(paintColorId: String, onBack: () -> Unit) {
    val vm = appViewModel { PaintColorEditViewModel(it.dataRepository, paintColorId) }
    val state by vm.color.collectAsStateWithLifecycle()
    val saving by vm.saving.collectAsStateWithLifecycle()
    val error by vm.error.collectAsStateWithLifecycle()
    val saved by vm.saved.collectAsStateWithLifecycle()

    LaunchedEffect(saved) { if (saved) onBack() }

    ActionErrorHost(error, vm::clearError) {
        Column(Modifier.fillMaxSize()) {
            val loaded = state as? Async.Success
            val form = remember(loaded?.data?.id) { loaded?.data?.let { PaintColorFormState(it) } }

            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(8.dp)) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                }
                Text(
                    "Edit paint color",
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.weight(1f),
                )
                if (saving) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp).padding(end = 12.dp))
                } else if (form != null) {
                    TextButton(onClick = { vm.save(form) }) { Text("Save") }
                }
            }
            HorizontalDivider()

            when (val s = state) {
                Async.Loading -> LoadingState()
                is Async.Failure -> ErrorState(s.message, onRetry = vm::load)
                is Async.Success ->
                    if (form != null) {
                        Column(
                            Modifier
                                .fillMaxSize()
                                .verticalScroll(rememberScrollState())
                                .imePadding()
                                .padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(16.dp),
                        ) {
                            PaintColorFormFields(form)
                            HorizontalDivider()
                            PaintColorSurfaces(s.data.id)
                        }
                    }
            }
        }
    }
}
