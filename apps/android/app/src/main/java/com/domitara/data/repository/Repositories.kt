package com.domitara.data.repository

import com.domitara.data.api.ApiException
import com.domitara.data.api.ApiProvider
import com.domitara.data.api.ApiService
import com.domitara.data.api.AppJson
import com.domitara.data.api.toApiException
import com.domitara.data.dto.AddMemberInput
import com.domitara.data.dto.ApiError
import com.domitara.data.dto.CreateBreakerInput
import com.domitara.data.dto.CreateFloorPlanAreaInput
import com.domitara.data.dto.CreateItemInput
import com.domitara.data.dto.CreateLabelInput
import com.domitara.data.dto.CreateLocationInput
import com.domitara.data.dto.CreateMaintenanceInput
import com.domitara.data.dto.CreatePaintColorInput
import com.domitara.data.dto.CreatePanelInput
import com.domitara.data.dto.CreateScheduleInput
import com.domitara.data.dto.HomeDocumentType
import com.domitara.data.dto.LocationPaintInput
import com.domitara.data.dto.LoginRequest
import com.domitara.data.dto.RefreshTokenRequest
import com.domitara.data.dto.SnoozeInput
import com.domitara.data.dto.UpdateBreakerInput
import com.domitara.data.dto.UpdateDocumentTypeInput
import com.domitara.data.dto.UpdateMeInput
import com.domitara.data.dto.UpdatePaintColorInput
import com.domitara.data.dto.UpdateScheduleInput
import com.domitara.data.session.ActiveHomeStore
import com.domitara.data.session.Session
import com.domitara.data.session.SessionStore
import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import retrofit2.HttpException
import java.io.IOException

/** In-memory mirror of the persisted session, read by the auth interceptor. */
class TokenHolder {
    @Volatile
    var session: Session? = null
}

/** In-memory mirror of the active home id, read by the active-home interceptor. */
class ActiveHomeHolder {
    @Volatile
    var homeId: String? = null
}

private val JSON_MEDIA = "application/json; charset=utf-8".toMediaType()

/** Builds a regex anchored to a cookie-name boundary (start of header or
 *  after a delimiter) so e.g. a `csrf_token=...` cookie can't be mistaken for
 *  a same-suffixed cookie name. */
private fun cookieRegex(name: String) = Regex("(?:^|[;,\\s])${Regex.escape(name)}=([^;,\\s]+)")
private val TOKEN_REGEX = cookieRegex("token")
private val REFRESH_TOKEN_REGEX = cookieRegex("refresh_token")

/**
 * Handles login/logout/refresh. These are raw OkHttp calls (not Retrofit) so
 * we can read the JWT and refresh token out of the `Set-Cookie` response
 * headers — the API does not return them in the body. Mirrors the old RN
 * login flow.
 *
 * Uses a bare [client] with no auth interceptor or [com.domitara.data.api.TokenAuthenticator]
 * attached: [refresh] is itself what the authenticator calls into, so reusing
 * the authenticated client here would recurse back into this class on a 401.
 */
class AuthRepository(
    private val client: OkHttpClient,
    private val sessionStore: SessionStore,
    private val tokenHolder: TokenHolder,
    private val activeHomeStore: ActiveHomeStore,
) {
    suspend fun login(serverUrlRaw: String, email: String, password: String): Result<Unit> =
        withContext(Dispatchers.IO) {
            runCatching {
                val base = serverUrlRaw.trim().trimEnd('/')
                sessionStore.rememberServerUrl(base)
                val body = AppJson.encodeToString(LoginRequest(email, password))
                    .toRequestBody(JSON_MEDIA)
                val request = Request.Builder()
                    .url("$base/api/v1/auth/login")
                    .post(body)
                    .build()
                client.newCall(request).execute().use { resp ->
                    if (!resp.isSuccessful) {
                        throw ApiException(
                            message = parseError(resp.body?.string()) ?: "Invalid credentials",
                            status = resp.code,
                            unauthorized = resp.code == 401,
                        )
                    }
                    val token = extractCookie(resp.headers("Set-Cookie"), TOKEN_REGEX)
                        ?: throw ApiException("No token in response")
                    val refreshToken = extractCookie(resp.headers("Set-Cookie"), REFRESH_TOKEN_REGEX)
                        ?: throw ApiException("No refresh token in response")
                    val session = Session(base, token, refreshToken)
                    sessionStore.save(session)
                    tokenHolder.session = session
                }
            }
        }

    /**
     * Exchanges the current refresh token for a new access token, rotating
     * the refresh token in the process (the server invalidates the old one).
     * Called by [com.domitara.data.api.TokenAuthenticator] when a request comes
     * back 401. On a network failure the local session is left untouched (no
     * point signing the user out just because they're offline); a definitive
     * rejection from the server (refresh token expired/revoked) does sign
     * them out, since it means the server no longer honors this device.
     */
    suspend fun refresh(): Result<Session> = withContext(Dispatchers.IO) {
        runCatching {
            val current = tokenHolder.session ?: sessionStore.current()
                ?: throw ApiException("No session", unauthorized = true)
            val body = AppJson.encodeToString(RefreshTokenRequest(current.refreshToken))
                .toRequestBody(JSON_MEDIA)
            val request = Request.Builder()
                .url("${current.serverUrl}/api/v1/auth/refresh")
                .post(body)
                .build()
            client.newCall(request).execute().use { resp ->
                if (!resp.isSuccessful) {
                    if (resp.code == 401 || resp.code == 403) {
                        signOutLocally()
                    }
                    throw ApiException(
                        message = parseError(resp.body?.string()) ?: "Session expired",
                        status = resp.code,
                        unauthorized = true,
                    )
                }
                val token = extractCookie(resp.headers("Set-Cookie"), TOKEN_REGEX)
                    ?: throw ApiException("No token in refresh response")
                val refreshToken = extractCookie(resp.headers("Set-Cookie"), REFRESH_TOKEN_REGEX)
                    ?: current.refreshToken
                val session = Session(current.serverUrl, token, refreshToken)
                sessionStore.save(session)
                tokenHolder.session = session
                session
            }
        }
    }

    suspend fun logout() {
        val current = tokenHolder.session ?: sessionStore.current()
        if (current != null) {
            runCatching {
                withContext(Dispatchers.IO) {
                    val body = AppJson.encodeToString(RefreshTokenRequest(current.refreshToken))
                        .toRequestBody(JSON_MEDIA)
                    val request = Request.Builder()
                        .url("${current.serverUrl}/api/v1/auth/logout")
                        .post(body)
                        .build()
                    client.newCall(request).execute().close()
                }
            }
        }
        signOutLocally()
    }

    private suspend fun signOutLocally() {
        sessionStore.clear()
        activeHomeStore.clear()
        tokenHolder.session = null
    }

    private fun extractCookie(setCookieHeaders: List<String>, regex: Regex): String? {
        for (header in setCookieHeaders) {
            val m = regex.find(header)
            if (m != null) return m.groupValues[1]
        }
        return null
    }

    private fun parseError(raw: String?): String? {
        if (raw.isNullOrBlank()) return null
        val e = runCatching { AppJson.decodeFromString<ApiError>(raw) }.getOrNull() ?: return null
        return e.detail ?: e.error ?: e.title
    }
}

/**
 * Authenticated data access. Resolves the current server URL from [TokenHolder],
 * delegates to the cached [ApiService], and normalizes failures to [ApiException].
 */
class DataRepository(
    private val apiProvider: ApiProvider,
    private val tokenHolder: TokenHolder,
    private val appContext: Context,
) {
    private fun service(): ApiService {
        val s = tokenHolder.session ?: throw ApiException("Not signed in", 401, true)
        return apiProvider.service(s.serverUrl)
    }

    /** Absolute URL for a server-relative media path (e.g. photo/document urls). */
    fun absoluteUrl(path: String): String {
        if (path.startsWith("http://") || path.startsWith("https://")) return path
        val base = tokenHolder.session?.serverUrl ?: return path
        return base.trimEnd('/') + "/" + path.trimStart('/')
    }

    val token: String? get() = tokenHolder.session?.token

    private suspend fun <T> call(block: suspend (ApiService) -> T): T = withContext(Dispatchers.IO) {
        try {
            block(service())
        } catch (e: HttpException) {
            throw e.toApiException()
        } catch (e: IOException) {
            throw ApiException(e.message ?: "Network error")
        }
    }

    // Account & system
    suspend fun getMe() = call { it.getMe() }
    suspend fun updateMe(name: String?, password: String?) =
        call { it.updateMe(UpdateMeInput(name, password)) }
    suspend fun getServerVersion() = call { it.getVersion() }

    // Homes
    suspend fun listHomes() = call { it.listHomes() }
    suspend fun getHome(homeId: String) = call { it.getHome(homeId) }
    suspend fun listHomePhotos(homeId: String) = call { it.listHomePhotos(homeId) }
    suspend fun uploadHomePhoto(homeId: String, uri: Uri) = call { svc ->
        svc.uploadHomePhoto(homeId, readUploadPart(uri, "photo"))
    }
    suspend fun deleteHomePhoto(homeId: String, photoId: String) =
        call { it.deleteHomePhoto(homeId, photoId) }
    suspend fun listHomeDocuments(homeId: String) = call { it.listHomeDocuments(homeId) }
    suspend fun uploadHomeDocument(homeId: String, uri: Uri, documentType: String?) = call { svc ->
        val typePart = documentType?.takeIf { it.isNotBlank() }
            ?.toRequestBody("text/plain".toMediaTypeOrNull())
        svc.uploadHomeDocument(homeId, readUploadPart(uri, "document"), typePart)
    }
    suspend fun deleteHomeDocument(homeId: String, docId: String) =
        call { it.deleteHomeDocument(homeId, docId) }
    suspend fun updateHomeDocumentType(homeId: String, docId: String, documentType: HomeDocumentType?) =
        call { it.updateHomeDocumentType(homeId, docId, UpdateDocumentTypeInput(documentType)) }

    /**
     * Reads a picked content [uri] into a multipart part. The server detects the
     * MIME type from the bytes (and the filename for PDFs), so we forward the
     * resolver-provided display name and content type.
     */
    private fun readUploadPart(uri: Uri, field: String): MultipartBody.Part {
        val cr = appContext.contentResolver
        val mime = cr.getType(uri) ?: "application/octet-stream"
        val name = cr.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)
            ?.use { c -> if (c.moveToFirst() && c.columnCount > 0) c.getString(0) else null }
            ?: "upload"
        val bytes = cr.openInputStream(uri)?.use { it.readBytes() }
            ?: throw ApiException("Could not read the selected file")
        val body = bytes.toRequestBody(mime.toMediaTypeOrNull())
        return MultipartBody.Part.createFormData(field, name, body)
    }
    suspend fun listHomeMembers(homeId: String) = call { it.listHomeMembers(homeId) }
    suspend fun addHomeMember(homeId: String, email: String) =
        call { it.addHomeMember(homeId, AddMemberInput(email)) }
    suspend fun removeHomeMember(homeId: String, userId: Long) =
        call { it.removeHomeMember(homeId, userId) }
    suspend fun listFloorPlanAreas(homeId: String) = call { it.listFloorPlanAreas(homeId) }
    suspend fun createFloorPlanArea(homeId: String, name: String, color: String?) =
        call { it.createFloorPlanArea(homeId, CreateFloorPlanAreaInput(name, color)) }

    // Panels & breakers
    suspend fun listPanels(homeId: String) = call { it.listPanels(homeId) }
    suspend fun createPanel(homeId: String, body: CreatePanelInput) =
        call { it.createPanel(homeId, body) }
    suspend fun deletePanel(panelId: String) = call { it.deletePanel(panelId) }
    suspend fun listBreakers(panelId: String) = call { it.listBreakers(panelId) }
    suspend fun createBreaker(panelId: String, body: CreateBreakerInput) =
        call { it.createBreaker(panelId, body) }
    suspend fun updateBreaker(breakerId: String, body: UpdateBreakerInput) =
        call { it.updateBreaker(breakerId, body) }
    suspend fun deleteBreaker(breakerId: String) = call { it.deleteBreaker(breakerId) }

    // Inventory
    suspend fun getDashboard() = call { it.getDashboard() }
    suspend fun listItems(
        q: String? = null,
        locationId: String? = null,
        labelId: String? = null,
        includeQuick: Boolean? = null,
    ) = call { it.listItems(q, locationId, labelId, includeQuick) }
    suspend fun getItem(id: String) = call { it.getItem(id) }
    suspend fun createItem(body: CreateItemInput) = call { it.createItem(body) }
    suspend fun updateItem(id: String, body: CreateItemInput) = call { it.updateItem(id, body) }
    suspend fun deleteItem(id: String) = call { it.deleteItem(id) }
    suspend fun listItemPhotos(itemId: String) = call { it.listItemPhotos(itemId) }
    suspend fun uploadItemPhoto(itemId: String, uri: Uri) = call { svc ->
        svc.uploadItemPhoto(itemId, readUploadPart(uri, "photo"))
    }
    suspend fun deleteItemPhoto(itemId: String, photoId: String) =
        call { it.deleteItemPhoto(itemId, photoId) }
    suspend fun setItemPhotoCover(itemId: String, photoId: String) =
        call { it.setItemPhotoCover(itemId, photoId) }
    suspend fun listItemDocuments(itemId: String) = call { it.listItemDocuments(itemId) }
    suspend fun uploadItemDocument(itemId: String, uri: Uri) = call { svc ->
        svc.uploadItemDocument(itemId, readUploadPart(uri, "document"))
    }
    suspend fun deleteItemDocument(itemId: String, documentId: String) =
        call { it.deleteItemDocument(itemId, documentId) }
    suspend fun listLocations() = call { it.listLocations() }
    suspend fun createLocation(body: CreateLocationInput) = call { it.createLocation(body) }
    suspend fun updateLocation(id: String, body: CreateLocationInput) =
        call { it.updateLocation(id, body) }
    suspend fun deleteLocation(id: String) = call { it.deleteLocation(id) }
    suspend fun listLabels() = call { it.listLabels() }
    suspend fun createLabel(body: CreateLabelInput) = call { it.createLabel(body) }
    suspend fun listPaintColors() = call { it.listPaintColors() }
    suspend fun createPaintColor(body: CreatePaintColorInput) = call { it.createPaintColor(body) }
    suspend fun updatePaintColor(id: String, body: UpdatePaintColorInput) =
        call { it.updatePaintColor(id, body) }
    suspend fun deletePaintColor(id: String) = call { it.deletePaintColor(id) }
    suspend fun listLocationPaint(locationId: String) = call { it.listLocationPaint(locationId) }
    suspend fun createLocationPaint(locationId: String, body: LocationPaintInput) =
        call { it.createLocationPaint(locationId, body) }
    suspend fun updateLocationPaint(id: String, body: LocationPaintInput) =
        call { it.updateLocationPaint(id, body) }
    suspend fun deleteLocationPaint(id: String) = call { it.deleteLocationPaint(id) }

    // Maintenance logs & schedules (scoped to the active home via X-Active-Home header)
    suspend fun listMaintenance(itemId: String? = null) = call { it.listMaintenance(itemId) }
    suspend fun createMaintenance(body: CreateMaintenanceInput) =
        call { it.createMaintenance(body) }
    suspend fun deleteMaintenance(id: String) = call { it.deleteMaintenance(id) }
    suspend fun listSchedules() = call { it.listSchedules() }
    suspend fun createSchedule(body: CreateScheduleInput) = call { it.createSchedule(body) }
    suspend fun updateSchedule(id: String, body: UpdateScheduleInput) =
        call { it.updateSchedule(id, body) }
    suspend fun deleteSchedule(id: String) = call { it.deleteSchedule(id) }

    // Reminders
    suspend fun listReminders() = call { it.listReminders() }
    suspend fun dismissReminder(id: String) = call { it.dismissReminder(id) }
    suspend fun snoozeReminder(id: String, days: Int) =
        call { it.snoozeReminder(id, SnoozeInput(days)) }
}
