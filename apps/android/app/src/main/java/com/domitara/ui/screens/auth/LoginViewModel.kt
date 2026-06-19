package com.domitara.ui.screens.auth

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.domitara.data.repository.AuthRepository
import kotlinx.coroutines.launch

class LoginViewModel(private val auth: AuthRepository) : ViewModel() {
    var serverUrl by mutableStateOf("")
    var email by mutableStateOf("")
    var password by mutableStateOf("")

    var loading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

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
