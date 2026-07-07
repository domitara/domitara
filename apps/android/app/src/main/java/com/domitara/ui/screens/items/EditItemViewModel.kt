package com.domitara.ui.screens.items

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.domitara.data.api.toUserMessage
import com.domitara.data.dto.CreateItemInput
import com.domitara.data.dto.CreateLabelInput
import com.domitara.data.dto.CreateLocationInput
import com.domitara.data.dto.CustomField
import com.domitara.data.dto.Item
import com.domitara.data.dto.ItemStatus
import com.domitara.data.dto.ItemTier
import com.domitara.data.dto.Label
import com.domitara.data.dto.Location
import com.domitara.data.dto.LocationType
import com.domitara.data.repository.DataRepository
import com.domitara.ui.common.Async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class EditItemViewModel(
    private val repo: DataRepository,
    private val itemId: String,
) : ViewModel(), ItemFormState {

    private val _loadState = MutableStateFlow<Async<Unit>>(Async.Loading)
    val loadState: StateFlow<Async<Unit>> = _loadState.asStateFlow()

    private val _locations = MutableStateFlow<List<Location>>(emptyList())
    val locations: StateFlow<List<Location>> = _locations.asStateFlow()

    private val _labels = MutableStateFlow<List<Label>>(emptyList())
    val labels: StateFlow<List<Label>> = _labels.asStateFlow()

    override val name = MutableStateFlow("")
    override val description = MutableStateFlow("")
    override val locationId = MutableStateFlow<String?>(null)
    override val gridRow = MutableStateFlow<Int?>(null)
    override val gridCol = MutableStateFlow<Int?>(null)
    override val labelIds = MutableStateFlow<Set<String>>(emptySet())
    override val status = MutableStateFlow(ItemStatus.OWNED)
    override val tier = MutableStateFlow(ItemTier.FULL)
    override val manufacturer = MutableStateFlow("")
    override val model = MutableStateFlow("")
    override val serial = MutableStateFlow("")
    override val purchasePrice = MutableStateFlow("")
    override val purchasedAt = MutableStateFlow("")
    override val warranty = MutableStateFlow("")
    override val insured = MutableStateFlow(false)
    override val notes = MutableStateFlow("")
    override val assetId = MutableStateFlow("")
    override val customFields = MutableStateFlow<List<CustomField>>(emptyList())

    private val _saving = MutableStateFlow(false)
    val saving: StateFlow<Boolean> = _saving.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _saved = MutableStateFlow<Item?>(null)
    val saved: StateFlow<Item?> = _saved.asStateFlow()

    init {
        viewModelScope.launch {
            runCatching { repo.listLocations() }.onSuccess { _locations.value = it }
        }
        viewModelScope.launch {
            runCatching { repo.listLabels() }.onSuccess { _labels.value = it }
        }
        load()
    }

    fun load() {
        viewModelScope.launch {
            _loadState.value = Async.Loading
            runCatching { repo.getItem(itemId) }
                .onSuccess { populate(it); _loadState.value = Async.Success(Unit) }
                .onFailure { _loadState.value = Async.Failure(it.toUserMessage("Failed to load item")) }
        }
    }

    private fun populate(item: Item) {
        name.value = item.name
        description.value = item.description ?: ""
        locationId.value = item.locationId
        gridRow.value = item.gridRow
        gridCol.value = item.gridCol
        labelIds.value = item.labelIds.toSet()
        status.value = item.status
        tier.value = item.tier
        manufacturer.value = item.manufacturer ?: ""
        model.value = item.model ?: ""
        serial.value = item.serial ?: ""
        purchasePrice.value = item.purchasePrice?.toString() ?: ""
        purchasedAt.value = item.purchasedAt ?: ""
        warranty.value = item.warranty ?: ""
        insured.value = item.insured
        notes.value = item.notes ?: ""
        assetId.value = item.assetId ?: ""
        customFields.value = item.customFields
    }

    override fun regenerateAssetId() { assetId.value = generateAssetId() }

    override fun toggleLabel(id: String) {
        val cur = labelIds.value
        labelIds.value = if (id in cur) cur - id else cur + id
    }

    override fun setLocation(id: String?) {
        locationId.value = id
        val loc = _locations.value.find { it.id == id }
        if (!(loc?.locationType == LocationType.CONTAINER && loc.gridRows != null && loc.gridCols != null)) {
            gridRow.value = null
            gridCol.value = null
        }
    }

    override fun setGridCell(row: Int?, col: Int?) {
        gridRow.value = row
        gridCol.value = col
    }

    override fun createLocation(name: String, parentId: String?) {
        viewModelScope.launch {
            runCatching { repo.createLocation(CreateLocationInput(name = name, parentId = parentId)) }
                .onSuccess { loc ->
                    _locations.value = _locations.value + loc
                    setLocation(loc.id)
                }
                .onFailure { _error.value = it.toUserMessage("Couldn't create location") }
        }
    }

    override fun createLabel(name: String, color: String) {
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
                repo.updateItem(
                    itemId,
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
                        customFields = customFields.value,
                    ),
                )
            }
                .onSuccess { _saved.value = it }
                .onFailure { _error.value = it.toUserMessage("Couldn't save item") }
            _saving.value = false
        }
    }
}
