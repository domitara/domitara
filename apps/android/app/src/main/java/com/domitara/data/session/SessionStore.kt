package com.domitara.data.session

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

/** Persisted login session: the chosen server URL, the access token, and the
 *  long-lived refresh token used to silently mint new access tokens. */
data class Session(val serverUrl: String, val token: String, val refreshToken: String)

private val Context.dataStore by preferencesDataStore(name = "domitara_session")

/**
 * Persists the session in DataStore so the user stays signed in across app
 * restarts (the old RN app kept the token in memory only).
 *
 * The last-used server URL is kept separately from the rest of the session so
 * it survives [clear] (sign-out, or a session invalidated by an expired
 * refresh token) and can pre-fill the login screen instead of forcing the
 * user to retype it every time they're prompted to sign back in.
 */
class SessionStore(private val context: Context) {

    private val keyServerUrl = stringPreferencesKey("server_url")
    private val keyToken = stringPreferencesKey("token")
    private val keyRefreshToken = stringPreferencesKey("refresh_token")
    private val keyLastServerUrl = stringPreferencesKey("last_server_url")

    val session: Flow<Session?> = context.dataStore.data.map { prefs ->
        val url = prefs[keyServerUrl]
        val token = prefs[keyToken]
        val refreshToken = prefs[keyRefreshToken]
        if (url != null && token != null && refreshToken != null) {
            Session(url, token, refreshToken)
        } else {
            null
        }
    }

    val lastServerUrl: Flow<String?> = context.dataStore.data.map { it[keyLastServerUrl] }

    suspend fun current(): Session? = session.first()

    suspend fun lastServerUrl(): String? = lastServerUrl.first()

    suspend fun save(session: Session) {
        context.dataStore.edit { prefs ->
            prefs[keyServerUrl] = session.serverUrl
            prefs[keyToken] = session.token
            prefs[keyRefreshToken] = session.refreshToken
            prefs[keyLastServerUrl] = session.serverUrl
        }
    }

    /** Remembers a server URL the user typed, even if login with it hasn't
     *  succeeded yet, so it's there to pre-fill next time. */
    suspend fun rememberServerUrl(url: String) {
        context.dataStore.edit { prefs -> prefs[keyLastServerUrl] = url }
    }

    /** Clears the active session but keeps the last-used server URL. */
    suspend fun clear() {
        context.dataStore.edit { prefs ->
            prefs.remove(keyServerUrl)
            prefs.remove(keyToken)
            prefs.remove(keyRefreshToken)
        }
    }
}
