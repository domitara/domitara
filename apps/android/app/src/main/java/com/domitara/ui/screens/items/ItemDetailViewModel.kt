package com.domitara.ui.screens.items

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.domitara.data.api.toUserMessage
import com.domitara.data.dto.CreateMaintenanceInput
import com.domitara.data.dto.Item
import com.domitara.data.dto.ItemDocument
import com.domitara.data.dto.ItemPhoto
import com.domitara.data.dto.Label
import com.domitara.data.dto.Location
import com.domitara.data.dto.MaintenanceLog
import com.domitara.data.repository.DataRepository
import com.domitara.ui.common.Async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class ItemDetailViewModel(
    private val repo: DataRepository,
    private val itemId: String,
) : ViewModel() {

    private val _item = MutableStateFlow<Async<Item>>(Async.Loading)
    val item: StateFlow<Async<Item>> = _item.asStateFlow()

    private val _locations = MutableStateFlow<List<Location>>(emptyList())
    val locations: StateFlow<List<Location>> = _locations.asStateFlow()

    private val _labels = MutableStateFlow<List<Label>>(emptyList())
    val labels: StateFlow<List<Label>> = _labels.asStateFlow()

    private val _photos = MutableStateFlow<Async<List<ItemPhoto>>>(Async.Loading)
    val photos: StateFlow<Async<List<ItemPhoto>>> = _photos.asStateFlow()

    private val _documents = MutableStateFlow<Async<List<ItemDocument>>>(Async.Loading)
    val documents: StateFlow<Async<List<ItemDocument>>> = _documents.asStateFlow()

    private val _maintenance = MutableStateFlow<Async<List<MaintenanceLog>>>(Async.Loading)
    val maintenance: StateFlow<Async<List<MaintenanceLog>>> = _maintenance.asStateFlow()

    private val _uploadingPhoto = MutableStateFlow(false)
    val uploadingPhoto: StateFlow<Boolean> = _uploadingPhoto.asStateFlow()

    private val _uploadingDocument = MutableStateFlow(false)
    val uploadingDocument: StateFlow<Boolean> = _uploadingDocument.asStateFlow()

    /** Transient message for a failed action (upload, delete), shown as a snackbar. */
    private val _actionError = MutableStateFlow<String?>(null)
    val actionError: StateFlow<String?> = _actionError.asStateFlow()

    private val _deleted = MutableStateFlow(false)
    val deleted: StateFlow<Boolean> = _deleted.asStateFlow()

    fun clearActionError() { _actionError.value = null }

    init { load() }

    fun load() {
        viewModelScope.launch {
            _item.value = Async.Loading
            runCatching { repo.getItem(itemId) }
                .onSuccess { _item.value = Async.Success(it) }
                .onFailure { _item.value = Async.Failure(it.toUserMessage("Failed to load item")) }
        }
        viewModelScope.launch {
            runCatching { repo.listLocations() }.onSuccess { _locations.value = it }
        }
        viewModelScope.launch {
            runCatching { repo.listLabels() }.onSuccess { _labels.value = it }
        }
        loadPhotos()
        loadDocuments()
        loadMaintenance()
    }

    private fun loadPhotos() {
        viewModelScope.launch {
            _photos.value = Async.Loading
            runCatching { repo.listItemPhotos(itemId) }
                .onSuccess { _photos.value = Async.Success(it) }
                .onFailure { _photos.value = Async.Failure(it.toUserMessage("Failed to load photos")) }
        }
    }

    private fun loadDocuments() {
        viewModelScope.launch {
            _documents.value = Async.Loading
            runCatching { repo.listItemDocuments(itemId) }
                .onSuccess { _documents.value = Async.Success(it) }
                .onFailure { _documents.value = Async.Failure(it.toUserMessage("Failed to load documents")) }
        }
    }

    private fun loadMaintenance() {
        viewModelScope.launch {
            _maintenance.value = Async.Loading
            runCatching { repo.listMaintenance(itemId) }
                .onSuccess { _maintenance.value = Async.Success(it) }
                .onFailure { _maintenance.value = Async.Failure(it.toUserMessage("Failed to load maintenance history")) }
        }
    }

    /** Uploads a picked photo for this item. [onError] receives a message on failure. */
    fun addPhoto(uri: Uri, onError: (String) -> Unit = {}) {
        if (_uploadingPhoto.value) return
        viewModelScope.launch {
            _uploadingPhoto.value = true
            runCatching { repo.uploadItemPhoto(itemId, uri) }
                .onSuccess { photo ->
                    val cur = (_photos.value as? Async.Success)?.data ?: emptyList()
                    _photos.value = Async.Success(listOf(photo) + cur)
                }
                .onFailure { onError(it.toUserMessage()) }
            _uploadingPhoto.value = false
        }
    }

    fun deletePhoto(photoId: String) {
        viewModelScope.launch {
            runCatching { repo.deleteItemPhoto(itemId, photoId) }
                .onSuccess {
                    (_photos.value as? Async.Success)?.let { cur ->
                        _photos.value = Async.Success(cur.data.filterNot { it.id == photoId })
                    }
                }
                .onFailure { _actionError.value = it.toUserMessage() }
        }
    }

    fun setCoverPhoto(photoId: String) {
        viewModelScope.launch {
            runCatching { repo.setItemPhotoCover(itemId, photoId) }
                .onSuccess {
                    (_photos.value as? Async.Success)?.let { cur ->
                        _photos.value = Async.Success(
                            cur.data.map { it.copy(isCover = it.id == photoId) },
                        )
                    }
                }
                .onFailure { _actionError.value = it.toUserMessage() }
        }
    }

    /** Uploads a picked document for this item. [onError] receives a message on failure. */
    fun addDocument(uri: Uri, onError: (String) -> Unit = {}) {
        if (_uploadingDocument.value) return
        viewModelScope.launch {
            _uploadingDocument.value = true
            runCatching { repo.uploadItemDocument(itemId, uri) }
                .onSuccess { doc ->
                    val cur = (_documents.value as? Async.Success)?.data ?: emptyList()
                    _documents.value = Async.Success(listOf(doc) + cur)
                }
                .onFailure { onError(it.toUserMessage()) }
            _uploadingDocument.value = false
        }
    }

    fun deleteDocument(documentId: String) {
        viewModelScope.launch {
            runCatching { repo.deleteItemDocument(itemId, documentId) }
                .onSuccess {
                    (_documents.value as? Async.Success)?.let { cur ->
                        _documents.value = Async.Success(cur.data.filterNot { it.id == documentId })
                    }
                }
                .onFailure { _actionError.value = it.toUserMessage() }
        }
    }

    fun logMaintenance(input: CreateMaintenanceInput) {
        viewModelScope.launch {
            runCatching { repo.createMaintenance(input) }
                .onSuccess { log ->
                    val cur = (_maintenance.value as? Async.Success)?.data ?: emptyList()
                    _maintenance.value = Async.Success(listOf(log) + cur)
                }
                .onFailure { _actionError.value = it.toUserMessage() }
        }
    }

    fun deleteItem() {
        viewModelScope.launch {
            runCatching { repo.deleteItem(itemId) }
                .onSuccess { _deleted.value = true }
                .onFailure { _actionError.value = it.toUserMessage() }
        }
    }
}
