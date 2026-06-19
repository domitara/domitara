package com.domitara.ui.common

/** Minimal async wrapper for screen state. */
sealed interface Async<out T> {
    data object Loading : Async<Nothing>
    data class Success<T>(val data: T) : Async<T>
    data class Failure(val message: String) : Async<Nothing>
}
