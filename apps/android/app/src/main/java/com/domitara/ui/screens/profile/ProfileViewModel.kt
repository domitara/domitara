package com.domitara.ui.screens.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.domitara.data.api.toUserMessage
import com.domitara.data.dto.User
import com.domitara.data.repository.DataRepository
import com.domitara.ui.common.Async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Backs the profile/settings screen: loads the current user and saves name and
 * password changes via PATCH /auth/me. Mirrors the web ProfileScreen. [onSaved]
 * lets the app container refresh the shared user so the drawer footer updates.
 */
class ProfileViewModel(
    private val repo: DataRepository,
    private val onSaved: suspend () -> Unit,
) : ViewModel() {

    private val _state = MutableStateFlow<Async<User>>(Async.Loading)
    val state: StateFlow<Async<User>> = _state.asStateFlow()

    private val _saving = MutableStateFlow(false)
    val saving: StateFlow<Boolean> = _saving.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _saved = MutableStateFlow(false)
    val saved: StateFlow<Boolean> = _saved.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.value = Async.Loading
            runCatching { repo.getMe() }
                .onSuccess { _state.value = Async.Success(it) }
                .onFailure { _state.value = Async.Failure(it.toUserMessage("Failed to load profile")) }
        }
    }

    fun save(name: String, password: String, confirm: String) {
        _error.value = null
        _saved.value = false
        if (password.isNotEmpty()) {
            if (password != confirm) {
                _error.value = "Passwords do not match."
                return
            }
            if (password.length < 8) {
                _error.value = "Password must be at least 8 characters."
                return
            }
        }
        viewModelScope.launch {
            _saving.value = true
            runCatching {
                repo.updateMe(name.trim().ifEmpty { null }, password.ifEmpty { null })
            }
                .onSuccess {
                    _state.value = Async.Success(it)
                    _saved.value = true
                    onSaved()
                }
                .onFailure { _error.value = it.toUserMessage("Failed to save changes") }
            _saving.value = false
        }
    }

    fun clearSaved() { _saved.value = false }
}
