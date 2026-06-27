package com.domitara.di

import android.content.Context
import coil.ImageLoader
import com.domitara.data.api.ActiveHomeInterceptor
import com.domitara.data.api.ApiProvider
import com.domitara.data.api.AuthInterceptor
import com.domitara.data.repository.ActiveHomeHolder
import com.domitara.data.repository.AuthRepository
import com.domitara.data.repository.DataRepository
import com.domitara.data.repository.TokenHolder
import com.domitara.data.dto.User
import com.domitara.data.session.ActiveHomeStore
import com.domitara.data.session.Session
import com.domitara.data.session.SessionStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import java.util.concurrent.TimeUnit

/**
 * Manual dependency container (in place of Hilt — keeps the build free of
 * annotation processors). Created once by [com.domitara.DomitaraApp] and shared
 * with ViewModels via [LocalAppContainer].
 */
class AppContainer(context: Context, private val appScope: CoroutineScope) {

    val sessionStore = SessionStore(context.applicationContext)
    val activeHomeStore = ActiveHomeStore(context.applicationContext)
    private val tokenHolder = TokenHolder()
    private val activeHomeHolder = ActiveHomeHolder()

    private val client: OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(AuthInterceptor { tokenHolder.session?.token })
        .addInterceptor(ActiveHomeInterceptor { activeHomeHolder.homeId })
        // Any authenticated request that comes back 401 means the session is no
        // longer valid (expired/revoked token); sign out so the auth gate routes
        // back to login instead of trapping the user behind endless retries.
        .addInterceptor { chain ->
            val response = chain.proceed(chain.request())
            if (response.code == 401 && chain.request().header("Authorization") != null) {
                logout()
            }
            response
        }
        .addInterceptor(HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        })
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    private val apiProvider = ApiProvider(client)

    val authRepository = AuthRepository(client, sessionStore, tokenHolder, activeHomeStore)
    val dataRepository = DataRepository(apiProvider, tokenHolder, context.applicationContext)

    /** Coil loader that reuses the auth'd OkHttp client so protected media (home
     *  photos/documents) is fetched with the bearer token. */
    val imageLoader: ImageLoader = ImageLoader.Builder(context.applicationContext)
        .okHttpClient(client)
        .build()

    /** Live session, drives the auth gate in the navigation root. */
    val session: Flow<Session?> = sessionStore.session

    /** Current authenticated user, shared by the drawer footer and profile screen.
     *  Refreshed on sign-in and after the user edits their profile. */
    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    /** Re-fetches the current user (best-effort) and publishes it to observers. */
    suspend fun refreshUser() {
        runCatching { dataRepository.getMe() }.getOrNull()?.let { _currentUser.value = it }
    }

    /** Globally selected home id. Scopes home-aware API calls and drives the home
     *  switcher; home-scoped ViewModels observe this to reload on change. */
    val activeHomeId: StateFlow<String?> =
        activeHomeStore.homeId.stateIn(appScope, SharingStarted.Eagerly, null)

    /** Switches the active home (persisted); the interceptor and observers follow. */
    suspend fun setActiveHome(id: String) = activeHomeStore.set(id)

    /**
     * Clears the session on the application scope. Safe to call from a composable
     * (e.g. the drawer's logout button): clearing the session tears down the
     * authenticated UI, which would cancel a composition-scoped coroutine before
     * it finishes wiping the active home and in-memory token — [appScope] outlives
     * that teardown so the full sign-out always completes.
     */
    fun logout() {
        appScope.launch { authRepository.logout() }
    }

    init {
        // Keep the in-memory active home in sync so the interceptor always sees it.
        activeHomeStore.homeId
            .onEach { activeHomeHolder.homeId = it }
            .launchIn(appScope)

        // Keep the in-memory token in sync with the persisted session and, once
        // signed in, default the active home to the first home so home-scoped
        // endpoints (maintenance, schedules) work without an explicit selection.
        sessionStore.session
            .onEach { session ->
                tokenHolder.session = session
                if (session != null) {
                    if (activeHomeStore.current() == null) {
                        runCatching { dataRepository.listHomes() }
                            .getOrNull()?.firstOrNull()?.let { activeHomeStore.set(it.id) }
                    }
                    refreshUser()
                } else {
                    _currentUser.value = null
                }
            }
            .launchIn(appScope)
    }
}
