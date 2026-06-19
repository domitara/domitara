package com.domitara.data.api

import okhttp3.Interceptor
import okhttp3.Response

/**
 * Adds `X-Active-Home: <id>` to every request when a home is selected. The id is
 * read from a live supplier so it always reflects the current active home without
 * rebuilding the OkHttp client. When no home is selected the header is omitted and
 * the API falls back to cross-home data.
 */
class ActiveHomeInterceptor(private val homeIdProvider: () -> String?) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val homeId = homeIdProvider()
        val request = if (homeId.isNullOrEmpty()) {
            chain.request()
        } else {
            chain.request().newBuilder()
                .header("X-Active-Home", homeId)
                .build()
        }
        return chain.proceed(request)
    }
}
