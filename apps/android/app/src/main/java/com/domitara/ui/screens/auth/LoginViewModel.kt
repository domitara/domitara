package com.domitara.ui.screens.auth

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.domitara.data.repository.AuthRepository
import com.domitara.data.session.SessionStore
import kotlinx.coroutines.launch

class LoginViewModel(
    private val auth: AuthRepository,
    private val sessionStore: SessionStore,
) : ViewModel() {
    var serverUrl by mutableStateOf("")
    var email by mutableStateOf("")
    var password by mutableStateOf("")

    var loading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    init {
        // Pre-fill with the last server the user signed into, so re-logging in
        // (e.g. after the refresh token itself finally expires) doesn't force
        // them to retype it.
        viewModelScope.launch {
            sessionStore.lastServerUrl()?.let { serverUrl = it }
        }
    }

    fun submit() {
        if (serverUrl.isBlank() || email.isBlank() || password.isBlank()) {
            error = "Please fill in all fields."
            return
        }
        loading = true
        error = null
        viewModelScope.launch {
            val result = auth.login(serverUrl, email, password)
            result.onFailure { error = it.message ?: "Login failed" }
            // On success the session flow updates and the root swaps to the app.
            loading = false
        }
    }
}
