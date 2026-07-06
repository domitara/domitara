package com.domitara.ui.screens.items

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.domitara.data.api.toUserMessage
import com.domitara.data.dto.CreateItemInput
import com.domitara.data.dto.CreateLabelInput
import com.domitara.data.dto.CreateLocationInput
import com.domitara.data.dto.Item
import com.domitara.data.dto.ItemStatus
import com.domitara.data.dto.ItemTier
import com.domitara.data.dto.Label
import com.domitara.data.dto.Location
import com.domitara.data.dto.LocationType
import com.domitara.data.repository.DataRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/** Preset label colors offered when creating a label inline, mirroring the web app. */
val LABEL_COLOR_PRESETS = listOf(
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#64748b",
)

private fun generateAssetId(): String {
    val chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    return "DT-" + (1..6).map { chars.random() }.joinToString("")
}

class AddItemViewModel(private val repo: DataRepository) : ViewModel() {

    private val _locations = MutableStateFlow<List<Location>>(emptyList())
    val locations: StateFlow<List<Location>> = _locations.asStateFlow()

    private val _labels = MutableStateFlow<List<Label>>(emptyList())
    val labels: StateFlow<List<Label>> = _labels.asStateFlow()

    val name = MutableStateFlow("")
    val description = MutableStateFlow("")
    val locationId = MutableStateFlow<String?>(null)
    val gridRow = MutableStateFlow<Int?>(null)
    val gridCol = MutableStateFlow<Int?>(null)
    val labelIds = MutableStateFlow<Set<String>>(emptySet())
    val status = MutableStateFlow(ItemStatus.OWNED)
    val tier = MutableStateFlow(ItemTier.FULL)
    val manufacturer = MutableStateFlow("")
    val model = MutableStateFlow("")
    val serial = MutableStateFlow("")
    val purchasePrice = MutableStateFlow("")
    val purchasedAt = MutableStateFlow("")
    val warranty = MutableStateFlow("")
    val insured = MutableStateFlow(false)
    val notes = MutableStateFlow("")
    val assetId = MutableStateFlow(generateAssetId())

    private val _saving = MutableStateFlow(false)
    val saving: StateFlow<Boolean> = _saving.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _created = MutableStateFlow<Item?>(null)
    val created: StateFlow<Item?> = _created.asStateFlow()

    init {
        viewModelScope.launch {
            runCatching { repo.listLocations() }.onSuccess { _locations.value = it }
        }
        viewModelScope.launch {
            runCatching { repo.listLabels() }.onSuccess { _labels.value = it }
        }
    }

    fun regenerateAssetId() { assetId.value = generateAssetId() }

    fun toggleLabel(id: String) {
        val cur = labelIds.value
        labelIds.value = if (id in cur) cur - id else cur + id
    }

    /** Selects a location, clearing the grid cell unless it's a grid-enabled container. */
    fun setLocation(id: String?) {
        locationId.value = id
        val loc = _locations.value.find { it.id == id }
        if (!(loc?.locationType == LocationType.CONTAINER && loc.gridRows != null && loc.gridCols != null)) {
            gridRow.value = null
            gridCol.value = null
        }
    }

    fun setGridCell(row: Int?, col: Int?) {
        gridRow.value = row
        gridCol.value = col
    }

    fun createLocation(name: String, parentId: String?) {
        viewModelScope.launch {
            runCatching { repo.createLocation(CreateLocationInput(name = name, parentId = parentId)) }
                .onSuccess { loc ->
                    _locations.value = _locations.value + loc
                    setLocation(loc.id)
                }
                .onFailure { _error.value = it.toUserMessage("Couldn't create location") }
        }
    }

    fun createLabel(name: String, color: String) {
        viewModelScope.launch {
            runCatching { repo.createLabel(CreateLabelInput(name = name, color = color)) }
                .onSuccess { label ->
                    _labels.value = _labels.value + label
                    labelIds.value = labelIds.value + label.id
                }
                .onFailure { _error.value = it.toUserMessage("Couldn't create label") }
        }
    }

    fun clearError() { _error.value = null }

    fun submit() {
        if (name.value.isBlank()) {
            _error.value = "Name is required"
            return
        }
        viewModelScope.launch {
            _saving.value = true
            runCatching {
                repo.createItem(
                    CreateItemInput(
                        name = name.value.trim(),
                        description = description.value.trim().ifBlank { null },
                        locationId = locationId.value,
                        status = status.value,
                        manufacturer = manufacturer.value.trim().ifBlank { null },
                        model = model.value.trim().ifBlank { null },
                        serial = serial.value.trim().ifBlank { null },
                        purchasePrice = purchasePrice.value.toDoubleOrNull(),
                        purchasedAt = purchasedAt.value.ifBlank { null },
                        warranty = warranty.value.trim().ifBlank { null },
                        insured = insured.value,
                        notes = notes.value.trim().ifBlank { null },
                        assetId = assetId.value.trim().ifBlank { null },
                        labelIds = labelIds.value.toList(),
                        tier = tier.value,
                        gridRow = gridRow.value,
                        gridCol = gridCol.value,
                    ),
                )
            }
                .onSuccess { _created.value = it }
                .onFailure { _error.value = it.toUserMessage("Couldn't create item") }
            _saving.value = false
        }
    }
}
