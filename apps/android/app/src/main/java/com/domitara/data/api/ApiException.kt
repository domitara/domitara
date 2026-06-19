package com.domitara.data.api

/**
 * Normalized API failure. [unauthorized] is true for HTTP 401 so callers can
 * trigger a sign-out. The message prefers the API's `{ "error": ... }` body.
 */
class ApiException(
    message: String,
    val status: Int? = null,
    val unauthorized: Boolean = false,
) : Exception(message)

/**
 * User-facing message for a thrown failure: prefers an [ApiException]'s server
 * message, otherwise the provided [default]. Centralizes the
 * `(t as? ApiException)?.message ?: "…"` idiom shared across ViewModels.
 */
fun Throwable.toUserMessage(default: String = "Something went wrong"): String =
    (this as? ApiException)?.message ?: default
