package com.domitara.data.api

import com.domitara.data.repository.AuthRepository
import com.domitara.data.repository.TokenHolder
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route

/**
 * Responds to a 401 by silently exchanging the refresh token for a new
 * access token and retrying the request, instead of forcing the user back to
 * the login screen. This is what makes the mobile session persistent: the
 * 24h access token expiring no longer matters as long as the ~90-day refresh
 * token (rotated on every use) is still valid.
 *
 * A [lock] serializes refresh attempts: if several requests 401 at once, only
 * the first actually calls the server (refresh tokens are single-use/rotated,
 * so two concurrent refresh calls would have the second one reusing an
 * already-rotated-out token and getting treated as a replay attack). Callers
 * that lose the race just retry with whatever token the winner installed.
 */
class TokenAuthenticator(
    private val tokenHolder: TokenHolder,
    private val authRepository: AuthRepository,
) : Authenticator {

    private val lock = Any()

    override fun authenticate(route: Route?, response: Response): Request? {
        val failedAuthHeader = response.request.header("Authorization") ?: return null
        if (responseCount(response) >= 2) return null // already retried once; give up

        synchronized(lock) {
            val currentToken = tokenHolder.session?.token
            if (currentToken != null && "Bearer $currentToken" != failedAuthHeader) {
                // Another thread already refreshed while we were waiting on the lock.
                return response.request.newBuilder()
                    .header("Authorization", "Bearer $currentToken")
                    .build()
            }
            val newSession = runBlocking { authRepository.refresh() }.getOrNull() ?: return null
            return response.request.newBuilder()
                .header("Authorization", "Bearer ${newSession.token}")
                .build()
        }
    }

    private fun responseCount(response: Response): Int {
        var count = 1
        var prior = response.priorResponse
        while (prior != null) {
            count++
            prior = prior.priorResponse
        }
        return count
    }
}
