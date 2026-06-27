package com.domitara.ui.screens.menu

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.domitara.data.dto.User
import com.domitara.data.repository.DataRepository
import com.domitara.data.session.Session
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/**
 * Backs the drawer footer: the current user (avatar/name/email, shared via
 * [com.domitara.di.AppContainer.currentUser] so it survives login and reflects
 * profile edits) and the server version shown beneath the logout button. The
 * version is fetched once a session exists — both are best-effort.
 */
class MenuViewModel(
    val user: StateFlow<User?>,
    session: Flow<Session?>,
    private val repo: DataRepository,
) : ViewModel() {

    private val _version = MutableStateFlow<String?>(null)
    val version: StateFlow<String?> = _version.asStateFlow()

    init {
        viewModelScope.launch {
            // Wait for a signed-in session before calling the API (the request
            // needs a resolved server base URL from the active session).
            session.filterNotNull().first()
            runCatching { repo.getServerVersion() }.getOrNull()?.let { _version.value = it.version }
        }
    }
}
