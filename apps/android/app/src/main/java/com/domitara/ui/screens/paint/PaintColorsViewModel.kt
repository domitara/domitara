package com.domitara.ui.screens.paint

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.domitara.data.api.toUserMessage
import com.domitara.data.dto.CreatePaintColorInput
import com.domitara.data.dto.PaintColor
import com.domitara.data.dto.UpdatePaintColorInput
import com.domitara.data.repository.DataRepository
import com.domitara.ui.common.Async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class PaintColorsViewModel(
    private val repo: DataRepository,
    private val activeHome: StateFlow<String?>,
) : ViewModel() {

    private val _colors = MutableStateFlow<Async<List<PaintColor>>>(Async.Loading)
    val colors: StateFlow<Async<List<PaintColor>>> = _colors.asStateFlow()

    private val _actionError = MutableStateFlow<String?>(null)
    val actionError: StateFlow<String?> = _actionError.asStateFlow()

    fun clearActionError() { _actionError.value = null }

    init {
        viewModelScope.launch { activeHome.collect { load() } }
    }

    fun load() {
        viewModelScope.launch {
            _colors.value = Async.Loading
            runCatching { repo.listPaintColors() }
                .onSuccess { _colors.value = Async.Success(it.sortedBy { c -> c.name }) }
                .onFailure { _colors.value = Async.Failure(it.toUserMessage("Failed to load paint colors")) }
        }
    }

    fun createPaintColor(
        name: String,
        color: String,
        brand: String?,
        colorCode: String?,
        sheen: String?,
        notes: String?,
    ) {
        viewModelScope.launch {
            runCatching {
                repo.createPaintColor(
                    CreatePaintColorInput(
                        name = name,
                        color = color,
                        brand = brand?.ifBlank { null },
                        colorCode = colorCode?.ifBlank { null },
                        sheen = sheen?.ifBlank { null },
                        notes = notes?.ifBlank { null },
                    ),
                )
            }
                .onSuccess { load() }
                .onFailure { _actionError.value = it.toUserMessage("Couldn't create paint color") }
        }
    }

    fun updatePaintColor(
        id: String,
        name: String,
        color: String,
        brand: String?,
        colorCode: String?,
        sheen: String?,
        notes: String?,
    ) {
        viewModelScope.launch {
            runCatching {
                repo.updatePaintColor(
                    id,
                    UpdatePaintColorInput(
                        name = name,
                        color = color,
                        brand = brand?.ifBlank { null },
                        colorCode = colorCode?.ifBlank { null },
                        sheen = sheen?.ifBlank { null },
                        notes = notes?.ifBlank { null },
                    ),
                )
            }
                .onSuccess { load() }
                .onFailure { _actionError.value = it.toUserMessage("Couldn't update paint color") }
        }
    }

    fun deletePaintColor(id: String) {
        viewModelScope.launch {
            runCatching { repo.deletePaintColor(id) }
                .onSuccess { load() }
                .onFailure { _actionError.value = it.toUserMessage("Couldn't delete paint color") }
        }
    }
}
