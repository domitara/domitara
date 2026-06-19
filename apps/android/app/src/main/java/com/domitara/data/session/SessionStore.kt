package com.domitara.data.session

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

/** Persisted login session: the chosen server URL and the bearer token. */
data class Session(val serverUrl: String, val token: String)

private val Context.dataStore by preferencesDataStore(name = "domitara_session")

/**
 * Persists the session in DataStore so the user stays signed in across app
 * restarts (the old RN app kept the token in memory only).
 */
class SessionStore(private val context: Context) {

    private val keyServerUrl = stringPreferencesKey("server_url")
    private val keyToken = stringPreferencesKey("token")

    val session: Flow<Session?> = context.dataStore.data.map { prefs ->
        val url = prefs[keyServerUrl]
        val token = prefs[keyToken]
        if (url != null && token != null) Session(url, token) else null
    }

    suspend fun current(): Session? = session.first()

    suspend fun save(session: Session) {
        context.dataStore.edit { prefs ->
            prefs[keyServerUrl] = session.serverUrl
            prefs[keyToken] = session.token
        }
    }

    suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }
}
