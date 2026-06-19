package com.domitara.ui.screens.items

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.domitara.data.api.toUserMessage
import com.domitara.data.dto.Item
import com.domitara.data.repository.DataRepository
import com.domitara.ui.common.Async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class ItemDetailViewModel(
    private val repo: DataRepository,
    private val itemId: String,
) : ViewModel() {

    private val _state = MutableStateFlow<Async<Item>>(Async.Loading)
    val state: StateFlow<Async<Item>> = _state.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.value = Async.Loading
            runCatching { repo.getItem(itemId) }
                .onSuccess { _state.value = Async.Success(it) }
                .onFailure { _state.value = Async.Failure(it.toUserMessage("Failed to load item")) }
        }
    }
}
