package com.domitara.data.api

import com.domitara.data.dto.AddMemberInput
import com.domitara.data.dto.CreateBreakerInput
import com.domitara.data.dto.CreateFloorPlanAreaInput
import com.domitara.data.dto.CreateItemInput
import com.domitara.data.dto.CreateLabelInput
import com.domitara.data.dto.CreateLocationInput
import com.domitara.data.dto.CreateMaintenanceInput
import com.domitara.data.dto.CreatePaintColorInput
import com.domitara.data.dto.CreatePanelInput
import com.domitara.data.dto.CreateScheduleInput
import com.domitara.data.dto.DashboardStats
import com.domitara.data.dto.ElectricalBreaker
import com.domitara.data.dto.ElectricalPanel
import com.domitara.data.dto.FloorPlanArea
import com.domitara.data.dto.Home
import com.domitara.data.dto.HomeDocument
import com.domitara.data.dto.HomeMember
import com.domitara.data.dto.HomePhoto
import com.domitara.data.dto.Item
import com.domitara.data.dto.ItemDocument
import com.domitara.data.dto.ItemPhoto
import com.domitara.data.dto.Label
import com.domitara.data.dto.Location
import com.domitara.data.dto.LocationPaint
import com.domitara.data.dto.LocationPaintInput
import com.domitara.data.dto.MaintenanceLog
import com.domitara.data.dto.MaintenanceSchedule
import com.domitara.data.dto.PaintColor
import com.domitara.data.dto.Reminder
import com.domitara.data.dto.SnoozeInput
import com.domitara.data.dto.UpdateBreakerInput
import com.domitara.data.dto.UpdateDocumentTypeInput
import com.domitara.data.dto.UpdatePaintColorInput
import com.domitara.data.dto.UpdateScheduleInput
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * Retrofit interface mirroring createMobileApi() from the old RN app. Base URL
 * is `${serverUrl}/api/v1/`; the Authorization header is added by AuthInterceptor.
 */
interface ApiService {

    // Account & system
    @GET("auth/me")
    suspend fun getMe(): com.domitara.data.dto.User

    @PATCH("auth/me")
    suspend fun updateMe(@Body body: com.domitara.data.dto.UpdateMeInput): com.domitara.data.dto.User

    @GET("version")
    suspend fun getVersion(): com.domitara.data.dto.ServerVersion

    // Homes
    @GET("homes")
    suspend fun listHomes(): List<Home>

    @GET("homes/{homeId}")
    suspend fun getHome(@Path("homeId") homeId: String): Home

    @GET("homes/{homeId}/photos")
    suspend fun listHomePhotos(@Path("homeId") homeId: String): List<HomePhoto>

    @Multipart
    @POST("homes/{homeId}/photos")
    suspend fun uploadHomePhoto(
        @Path("homeId") homeId: String,
        @Part photo: MultipartBody.Part,
    ): HomePhoto

    @DELETE("homes/{homeId}/photos/{photoId}")
    suspend fun deleteHomePhoto(@Path("homeId") homeId: String, @Path("photoId") photoId: String)

    @GET("homes/{homeId}/documents")
    suspend fun listHomeDocuments(@Path("homeId") homeId: String): List<HomeDocument>

    @Multipart
    @POST("homes/{homeId}/documents")
    suspend fun uploadHomeDocument(
        @Path("homeId") homeId: String,
        @Part document: MultipartBody.Part,
        @Part("document_type") documentType: RequestBody?,
    ): HomeDocument

    @DELETE("homes/{homeId}/documents/{docId}")
    suspend fun deleteHomeDocument(@Path("homeId") homeId: String, @Path("docId") docId: String)

    @PATCH("homes/{homeId}/documents/{docId}/type")
    suspend fun updateHomeDocumentType(
        @Path("homeId") homeId: String,
        @Path("docId") docId: String,
        @Body body: UpdateDocumentTypeInput,
    )

    @GET("homes/{homeId}/members")
    suspend fun listHomeMembers(@Path("homeId") homeId: String): List<HomeMember>

    @POST("homes/{homeId}/members")
    suspend fun addHomeMember(
        @Path("homeId") homeId: String,
        @Body body: AddMemberInput,
    ): List<HomeMember>

    @DELETE("homes/{homeId}/members/{userId}")
    suspend fun removeHomeMember(@Path("homeId") homeId: String, @Path("userId") userId: Long)

    @GET("homes/{homeId}/floor-plan-areas")
    suspend fun listFloorPlanAreas(@Path("homeId") homeId: String): List<FloorPlanArea>

    @POST("homes/{homeId}/floor-plan-areas")
    suspend fun createFloorPlanArea(
        @Path("homeId") homeId: String,
        @Body body: CreateFloorPlanAreaInput,
    ): FloorPlanArea

    // Panels & breakers
    @GET("homes/{homeId}/panels")
    suspend fun listPanels(@Path("homeId") homeId: String): List<ElectricalPanel>

    @POST("homes/{homeId}/panels")
    suspend fun createPanel(
        @Path("homeId") homeId: String,
        @Body body: CreatePanelInput,
    ): ElectricalPanel

    @DELETE("panels/{panelId}")
    suspend fun deletePanel(@Path("panelId") panelId: String)

    @GET("panels/{panelId}/breakers")
    suspend fun listBreakers(@Path("panelId") panelId: String): List<ElectricalBreaker>

    @POST("panels/{panelId}/breakers")
    suspend fun createBreaker(
        @Path("panelId") panelId: String,
        @Body body: CreateBreakerInput,
    ): ElectricalBreaker

    @PUT("breakers/{breakerId}")
    suspend fun updateBreaker(
        @Path("breakerId") breakerId: String,
        @Body body: UpdateBreakerInput,
    ): ElectricalBreaker

    @DELETE("breakers/{breakerId}")
    suspend fun deleteBreaker(@Path("breakerId") breakerId: String)

    // Inventory
    @GET("dashboard")
    suspend fun getDashboard(): DashboardStats

    @GET("items")
    suspend fun listItems(
        @Query("q") q: String? = null,
        @Query("location_id") locationId: String? = null,
        @Query("label_id") labelId: String? = null,
        @Query("include_quick") includeQuick: Boolean? = null,
    ): List<Item>

    @GET("items/{id}")
    suspend fun getItem(@Path("id") id: String): Item

    @POST("items")
    suspend fun createItem(@Body body: CreateItemInput): Item

    @PUT("items/{id}")
    suspend fun updateItem(@Path("id") id: String, @Body body: CreateItemInput): Item

    @DELETE("items/{id}")
    suspend fun deleteItem(@Path("id") id: String)

    @GET("items/{itemId}/photos")
    suspend fun listItemPhotos(@Path("itemId") itemId: String): List<ItemPhoto>

    @Multipart
    @POST("items/{itemId}/photos")
    suspend fun uploadItemPhoto(
        @Path("itemId") itemId: String,
        @Part photo: MultipartBody.Part,
    ): ItemPhoto

    @DELETE("items/{itemId}/photos/{photoId}")
    suspend fun deleteItemPhoto(@Path("itemId") itemId: String, @Path("photoId") photoId: String)

    @PATCH("items/{itemId}/photos/{photoId}/cover")
    suspend fun setItemPhotoCover(@Path("itemId") itemId: String, @Path("photoId") photoId: String)

    @GET("items/{itemId}/documents")
    suspend fun listItemDocuments(@Path("itemId") itemId: String): List<ItemDocument>

    @Multipart
    @POST("items/{itemId}/documents")
    suspend fun uploadItemDocument(
        @Path("itemId") itemId: String,
        @Part document: MultipartBody.Part,
    ): ItemDocument

    @DELETE("items/{itemId}/documents/{documentId}")
    suspend fun deleteItemDocument(@Path("itemId") itemId: String, @Path("documentId") documentId: String)

    @GET("locations")
    suspend fun listLocations(): List<Location>

    @POST("locations")
    suspend fun createLocation(@Body body: CreateLocationInput): Location

    @PUT("locations/{id}")
    suspend fun updateLocation(@Path("id") id: String, @Body body: CreateLocationInput): Location

    @DELETE("locations/{id}")
    suspend fun deleteLocation(@Path("id") id: String)

    @GET("labels")
    suspend fun listLabels(): List<Label>

    @POST("labels")
    suspend fun createLabel(@Body body: CreateLabelInput): Label

    @GET("paint-colors")
    suspend fun listPaintColors(): List<PaintColor>

    @POST("paint-colors")
    suspend fun createPaintColor(@Body body: CreatePaintColorInput): PaintColor

    @PUT("paint-colors/{id}")
    suspend fun updatePaintColor(@Path("id") id: String, @Body body: UpdatePaintColorInput): PaintColor

    @DELETE("paint-colors/{id}")
    suspend fun deletePaintColor(@Path("id") id: String)

    @GET("locations/{locationId}/paint")
    suspend fun listLocationPaint(@Path("locationId") locationId: String): List<LocationPaint>

    @POST("locations/{locationId}/paint")
    suspend fun createLocationPaint(
        @Path("locationId") locationId: String,
        @Body body: LocationPaintInput,
    ): LocationPaint

    @PUT("location-paint/{id}")
    suspend fun updateLocationPaint(@Path("id") id: String, @Body body: LocationPaintInput): LocationPaint

    @DELETE("location-paint/{id}")
    suspend fun deleteLocationPaint(@Path("id") id: String)

    // Maintenance logs & schedules (home scope comes from the X-Active-Home header)
    @GET("maintenance")
    suspend fun listMaintenance(@Query("item_id") itemId: String? = null): List<MaintenanceLog>

    @POST("maintenance")
    suspend fun createMaintenance(@Body body: CreateMaintenanceInput): MaintenanceLog

    @DELETE("maintenance/{id}")
    suspend fun deleteMaintenance(@Path("id") id: String)

    @GET("maintenance/schedules")
    suspend fun listSchedules(): List<MaintenanceSchedule>

    @POST("maintenance/schedules")
    suspend fun createSchedule(@Body body: CreateScheduleInput): MaintenanceSchedule

    @PUT("maintenance/schedules/{id}")
    suspend fun updateSchedule(
        @Path("id") id: String,
        @Body body: UpdateScheduleInput,
    ): MaintenanceSchedule

    @DELETE("maintenance/schedules/{id}")
    suspend fun deleteSchedule(@Path("id") id: String)

    // Reminders
    @GET("reminders")
    suspend fun listReminders(): List<Reminder>

    @POST("reminders/{id}/dismiss")
    suspend fun dismissReminder(@Path("id") id: String)

    @POST("reminders/{id}/snooze")
    suspend fun snoozeReminder(@Path("id") id: String, @Body body: SnoozeInput)
}
