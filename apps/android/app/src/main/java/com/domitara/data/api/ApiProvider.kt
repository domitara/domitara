package com.domitara.data.api

import com.domitara.data.dto.ApiError
import kotlinx.serialization.decodeFromString
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.HttpException
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.ConcurrentHashMap

/**
 * Builds and caches a Retrofit-backed [ApiService] per server URL. The server
 * URL is dynamic (chosen at login), so we key the cache on the normalized base.
 */
class ApiProvider(private val client: OkHttpClient) {

    private val cache = ConcurrentHashMap<String, ApiService>()
    private val contentType = "application/json".toMediaType()

    fun service(serverUrl: String): ApiService {
        val base = serverUrl.trim().trimEnd('/')
        return cache.getOrPut(base) { build(base) }
    }

    private fun build(base: String): ApiService =
        Retrofit.Builder()
            .baseUrl("$base/api/v1/")
            .client(client)
            .addConverterFactory(AppJson.asConverterFactory(contentType))
            .build()
            .create(ApiService::class.java)
}

/** Converts a Retrofit [HttpException] into a normalized [ApiException]. */
fun HttpException.toApiException(): ApiException {
    val raw = response()?.errorBody()?.string()
    val message = raw?.let {
        runCatching { AppJson.decodeFromString<ApiError>(it) }.getOrNull()
            ?.let { e -> e.detail ?: e.error ?: e.title }
    } ?: message()
    return ApiException(
        message = message ?: "Request failed (${code()})",
        status = code(),
        unauthorized = code() == 401,
    )
}
