package com.domitara.data.api

import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNamingStrategy

/**
 * Shared JSON configuration. SnakeCase strategy maps camelCase Kotlin properties
 * to the API's snake_case keys; ignoreUnknownKeys keeps the client resilient to
 * additive API changes.
 */
@OptIn(ExperimentalSerializationApi::class)
val AppJson: Json = Json {
    ignoreUnknownKeys = true
    explicitNulls = false
    namingStrategy = JsonNamingStrategy.SnakeCase
    coerceInputValues = true
}
