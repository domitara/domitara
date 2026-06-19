package com.domitara.data.session

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.activeHomeDataStore by preferencesDataStore(name = "domitara_active_home")

/**
 * Persists the user's currently selected (active) home. The id is sent on every
 * request as the `X-Active-Home` header so the API scopes home-aware data
 * (items, labels, locations, maintenance) to that home.
 */
class ActiveHomeStore(private val context: Context) {

    private val keyHomeId = stringPreferencesKey("active_home_id")

    val homeId: Flow<String?> = context.activeHomeDataStore.data.map { it[keyHomeId] }

    suspend fun current(): String? = homeId.first()

    suspend fun set(id: String) {
        context.activeHomeDataStore.edit { it[keyHomeId] = id }
    }

    suspend fun clear() {
        context.activeHomeDataStore.edit { it.remove(keyHomeId) }
    }
}
