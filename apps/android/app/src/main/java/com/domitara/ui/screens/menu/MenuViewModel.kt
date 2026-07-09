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
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

/**
 * Backs the drawer footer: the current user (avatar/name/email, shared via
 * [com.domitara.di.AppContainer.currentUser] so it survives login and reflects
 * profile edits) and the server version shown beneath the logout button. Both
 * are best-effort.
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
            // Re-fetch on every session change, not just the first one: this
            // ViewModel can outlive a single login, so a stale/unreachable
            // session (or a transient failure) must not permanently stick the
            // footer on "…" once a working session comes along.
            session.collectLatest { s ->
                _version.value = null
                if (s != null) {
                    _version.value = runCatching { repo.getServerVersion() }.getOrNull()?.version
                }
            }
        }
    }
}
