package com.domitara.data.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Data transfer objects mirroring the Go API JSON contract (see the former
 * apps/mobile/context/mobileApi.ts). Property names are camelCase; the API's
 * snake_case keys are mapped by the JsonNamingStrategy.SnakeCase configured on
 * the [com.domitara.data.api.AppJson] instance. Enum wire values are pinned
 * explicitly with @SerialName because the naming strategy does not apply to
 * enum constants.
 */

@Serializable
enum class PropertyType {
    @SerialName("house") HOUSE,
    @SerialName("condo") CONDO,
    @SerialName("apartment") APARTMENT,
    @SerialName("townhouse") TOWNHOUSE,
    @SerialName("mobile") MOBILE,
    @SerialName("land") LAND,
}

@Serializable
enum class HomeDocumentType {
    @SerialName("deed") DEED,
    @SerialName("insurance") INSURANCE,
    @SerialName("inspection") INSPECTION,
    @SerialName("survey") SURVEY,
    @SerialName("hoa") HOA,
    @SerialName("warranty") WARRANTY,
    @SerialName("permit") PERMIT,
    @SerialName("tax") TAX,
    @SerialName("floor_plan") FLOOR_PLAN,
    @SerialName("other") OTHER,
}

@Serializable
enum class HomeMemberRole {
    @SerialName("owner") OWNER,
    @SerialName("member") MEMBER,
}

@Serializable
enum class ItemStatus {
    @SerialName("owned") OWNED,
    @SerialName("loaned") LOANED,
    @SerialName("missing") MISSING,
}

@Serializable
enum class BreakerType {
    @SerialName("standard") STANDARD,
    @SerialName("double_pole") DOUBLE_POLE,
    @SerialName("tandem") TANDEM,
    @SerialName("blank") BLANK,
    @SerialName("main") MAIN,
}

@Serializable
enum class LocationType {
    @SerialName("room") ROOM,
    @SerialName("container") CONTAINER,
}

@Serializable
enum class ItemTier {
    @SerialName("quick") QUICK,
    @SerialName("full") FULL,
}

@Serializable
enum class ReminderTone {
    @SerialName("info") INFO,
    @SerialName("warn") WARN,
    @SerialName("danger") DANGER,
}

@Serializable
data class Home(
    val id: String,
    val name: String,
    val addressStreet: String? = null,
    val addressCity: String? = null,
    val addressState: String? = null,
    val addressZip: String? = null,
    val addressCountry: String? = null,
    val propertyType: PropertyType? = null,
    val yearBuilt: Int? = null,
    // sqft is a NUMERIC(10,2) column on the server and serialized as a JSON
    // number, so it can carry a fractional value — must be Double, not Int.
    val sqft: Double? = null,
    val acreage: Double? = null,
    val notes: String? = null,
    val purchasePrice: Double? = null,
    val purchasedAt: String? = null,
    val estimatedValue: Double? = null,
    val mortgageLender: String? = null,
    val mortgageNotes: String? = null,
    val hoaName: String? = null,
    val hoaContact: String? = null,
    val hoaMonthlyDues: Double? = null,
    // Defaults let coerceInputValues fall back instead of throwing if the server
    // ever sends an unknown/empty enum value.
    val role: HomeMemberRole = HomeMemberRole.MEMBER,
    val createdAt: String,
    val updatedAt: String,
)

/** Current authenticated user, from GET /auth/me. */
@Serializable
data class User(
    // id is a bigserial (int64) on the server; use Long to avoid overflow.
    val id: Long,
    val email: String,
    val name: String,
    val role: String,
)

/** Server version, from GET /version. */
@Serializable
data class ServerVersion(val version: String)

/** Request body for PATCH /auth/me. Null fields are omitted (explicitNulls=false). */
@Serializable
data class UpdateMeInput(val name: String? = null, val password: String? = null)

@Serializable
data class HomeMember(
    // user_id is a bigserial (int64) on the server; use Long to avoid overflow.
    val userId: Long,
    val userName: String,
    val userEmail: String,
    val role: HomeMemberRole = HomeMemberRole.MEMBER,
    val joinedAt: String,
)

@Serializable
data class HomePhoto(
    val id: String,
    val homeId: String,
    val filename: String,
    val contentType: String,
    val url: String,
    val createdAt: String,
)

@Serializable
data class HomeDocument(
    val id: String,
    val homeId: String,
    val filename: String,
    val contentType: String,
    val url: String,
    val size: Long,
    val documentType: HomeDocumentType? = null,
    val floorLevel: Int? = null,
    val createdAt: String,
)

@Serializable
data class UpdateDocumentTypeInput(
    val documentType: HomeDocumentType? = null,
)

@Serializable
data class Location(
    val id: String,
    val name: String,
    val parentId: String? = null,
    val description: String? = null,
    val locationType: LocationType = LocationType.ROOM,
    val gridRows: Int? = null,
    val gridCols: Int? = null,
    val itemCount: Int,
    val createdAt: String,
    val updatedAt: String,
)

@Serializable
data class Label(
    val id: String,
    val name: String,
    val color: String,
    val itemCount: Int,
    val createdAt: String,
    val updatedAt: String,
)

@Serializable
data class DashboardStats(
    val totalItems: Int,
    val totalLocations: Int,
    val totalLabels: Int,
    val totalValue: Double,
    val totalExpiringWarranties: Int = 0,
)

@Serializable
data class Item(
    val id: String,
    val name: String,
    val description: String? = null,
    val locationId: String? = null,
    val status: ItemStatus = ItemStatus.OWNED,
    val manufacturer: String? = null,
    val model: String? = null,
    val serial: String? = null,
    val purchasePrice: Double? = null,
    val purchasedAt: String? = null,
    val warranty: String? = null,
    val warrantyExpiresAt: String? = null,
    val insured: Boolean = false,
    val notes: String? = null,
    val assetId: String? = null,
    val labelIds: List<String> = emptyList(),
    val tier: ItemTier = ItemTier.FULL,
    val gridRow: Int? = null,
    val gridCol: Int? = null,
    val customFields: List<CustomField> = emptyList(),
    val createdAt: String,
    val updatedAt: String,
)

@Serializable
data class CustomField(
    val key: String,
    val label: String,
    val value: String? = null,
    val valueType: String = "text",
    val unit: String? = null,
)

@Serializable
data class ItemPhoto(
    val id: String,
    val itemId: String,
    val filename: String,
    val contentType: String,
    val url: String,
    val createdAt: String,
)

@Serializable
data class ItemDocument(
    val id: String,
    val itemId: String,
    val filename: String,
    val contentType: String,
    val url: String,
    val size: Long,
    val createdAt: String,
)

@Serializable
data class Reminder(
    val id: String,
    val key: String,
    val title: String,
    val body: String,
    val tone: ReminderTone = ReminderTone.INFO,
    val snoozedUntil: String? = null,
    val createdAt: String,
)

@Serializable
data class MaintenanceLog(
    val id: String,
    val itemId: String? = null,
    val itemName: String? = null,
    val title: String,
    val notes: String? = null,
    val cost: Double? = null,
    val performedAt: String,
    val createdAt: String,
)

@Serializable
data class MaintenanceSchedule(
    val id: String,
    val itemId: String? = null,
    val itemName: String? = null,
    val title: String,
    val notes: String? = null,
    val frequencyValue: Int,
    val frequencyUnit: String,
    val lastPerformedAt: String? = null,
    val nextDueAt: String,
    val createdAt: String,
    val updatedAt: String,
)

@Serializable
data class FloorPlanArea(
    val id: String,
    val homeId: String,
    val name: String,
    val color: String,
    val documentId: String? = null,
    val createdAt: String,
    val updatedAt: String,
)

@Serializable
data class ElectricalPanel(
    val id: String,
    val homeId: String,
    val name: String,
    val totalAmps: Int,
    val totalSlots: Int,
    val locationNote: String? = null,
    val parentPanelId: String? = null,
    val fedByBreakerId: String? = null,
    val sortOrder: Int,
    val createdAt: String,
    val updatedAt: String,
)

@Serializable
data class ElectricalBreaker(
    val id: String,
    val panelId: String,
    val slot: Int,
    val label: String? = null,
    val amps: Int? = null,
    val breakerType: BreakerType = BreakerType.STANDARD,
    val isGfci: Boolean,
    val isAfci: Boolean,
    val notes: String? = null,
    val floorPlanAreaId: String? = null,
    val createdAt: String,
    val updatedAt: String,
)

// ---- Request bodies ----

@Serializable
data class LoginRequest(val email: String, val password: String)

@Serializable
data class AddMemberInput(val email: String)

@Serializable
data class SnoozeInput(val days: Int)

@Serializable
data class CreatePanelInput(
    val name: String,
    val totalAmps: Int,
    val totalSlots: Int? = null,
    val locationNote: String? = null,
    val parentPanelId: String? = null,
    val sortOrder: Int? = null,
)

@Serializable
data class CreateBreakerInput(
    val slot: Int,
    val label: String? = null,
    val amps: Int? = null,
    val breakerType: String? = null,
    val isGfci: Boolean? = null,
    val isAfci: Boolean? = null,
    val notes: String? = null,
    val floorPlanAreaId: String? = null,
)

@Serializable
data class UpdateBreakerInput(
    val label: String? = null,
    val amps: Int? = null,
    val breakerType: String? = null,
    val isGfci: Boolean,
    val isAfci: Boolean,
    val notes: String? = null,
    val floorPlanAreaId: String? = null,
)

@Serializable
data class CreateMaintenanceInput(
    val itemId: String? = null,
    val scheduleId: String? = null,
    val title: String,
    val notes: String? = null,
    val cost: Double? = null,
    val performedAt: String? = null,
)

@Serializable
data class CreateScheduleInput(
    val itemId: String? = null,
    val title: String,
    val notes: String? = null,
    val frequencyValue: Int,
    val frequencyUnit: String,
    val nextDueAt: String? = null,
)

@Serializable
data class UpdateScheduleInput(
    val itemId: String? = null,
    val title: String,
    val notes: String? = null,
    val frequencyValue: Int,
    val frequencyUnit: String,
    val nextDueAt: String,
)

@Serializable
data class CreateFloorPlanAreaInput(
    val name: String,
    val color: String? = null,
)

@Serializable
data class CreateLocationInput(
    val name: String,
    val parentId: String? = null,
    val description: String? = null,
    val locationType: LocationType? = null,
    val gridRows: Int? = null,
    val gridCols: Int? = null,
)

@Serializable
data class CreateLabelInput(
    val name: String,
    val color: String? = null,
)

@Serializable
data class CreateItemInput(
    val name: String,
    val description: String? = null,
    val locationId: String? = null,
    val status: ItemStatus? = null,
    val manufacturer: String? = null,
    val model: String? = null,
    val serial: String? = null,
    val purchasePrice: Double? = null,
    val purchasedAt: String? = null,
    val warranty: String? = null,
    val warrantyExpiresAt: String? = null,
    val insured: Boolean = false,
    val notes: String? = null,
    val assetId: String? = null,
    val labelIds: List<String> = emptyList(),
    val tier: ItemTier? = null,
    val gridRow: Int? = null,
    val gridCol: Int? = null,
    val customFields: List<CustomField> = emptyList(),
)

/**
 * Shape of the API's error envelope. Huma (the Go API framework) returns
 * RFC7807 problem-details JSON, e.g. `{ "title": "...", "detail": "...", "status": 422 }`,
 * not a plain `{ "error": "..." }` - `detail` carries the human-readable message.
 */
@Serializable
data class ApiError(val error: String? = null, val title: String? = null, val detail: String? = null)
