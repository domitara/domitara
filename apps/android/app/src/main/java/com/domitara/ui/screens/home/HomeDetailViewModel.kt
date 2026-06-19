package com.domitara.ui.screens.home

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.domitara.data.api.toUserMessage
import com.domitara.data.dto.FloorPlanArea
import com.domitara.data.dto.Home
import com.domitara.data.dto.HomeDocument
import com.domitara.data.dto.HomeMember
import com.domitara.data.dto.HomeMemberRole
import com.domitara.data.dto.HomePhoto
import com.domitara.di.AppContainer
import com.domitara.ui.common.Async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Backs the property ("Home") page. The home dropdown sets the app-wide active
 * home via [AppContainer.setActiveHome]; this VM follows [AppContainer.activeHomeId]
 * so the property tabs always reflect the globally selected home.
 */
class HomeDetailViewModel(private val container: AppContainer) : ViewModel() {

    private val repo = container.dataRepository

    private val _homes = MutableStateFlow<Async<List<Home>>>(Async.Loading)
    val homes: StateFlow<Async<List<Home>>> = _homes.asStateFlow()

    private val _selected = MutableStateFlow<Home?>(null)
    val selected: StateFlow<Home?> = _selected.asStateFlow()

    private val _photos = MutableStateFlow<Async<List<HomePhoto>>>(Async.Loading)
    val photos: StateFlow<Async<List<HomePhoto>>> = _photos.asStateFlow()

    private val _documents = MutableStateFlow<Async<List<HomeDocument>>>(Async.Loading)
    val documents: StateFlow<Async<List<HomeDocument>>> = _documents.asStateFlow()

    private val _members = MutableStateFlow<Async<List<HomeMember>>>(Async.Loading)
    val members: StateFlow<Async<List<HomeMember>>> = _members.asStateFlow()

    private val _areas = MutableStateFlow<Async<List<FloorPlanArea>>>(Async.Loading)
    val areas: StateFlow<Async<List<FloorPlanArea>>> = _areas.asStateFlow()

    private val _uploadingPhoto = MutableStateFlow(false)
    val uploadingPhoto: StateFlow<Boolean> = _uploadingPhoto.asStateFlow()

    private val _uploadingDocument = MutableStateFlow(false)
    val uploadingDocument: StateFlow<Boolean> = _uploadingDocument.asStateFlow()

    /** Transient message for a failed action (e.g. a delete), shown as a snackbar. */
    private val _actionError = MutableStateFlow<String?>(null)
    val actionError: StateFlow<String?> = _actionError.asStateFlow()

    fun clearActionError() { _actionError.value = null }

    val isOwner: Boolean get() = _selected.value?.role == HomeMemberRole.OWNER

    init {
        loadHomes()
        viewModelScope.launch {
            container.activeHomeId.collect { applyActiveHome(it) }
        }
    }

    fun loadHomes() {
        viewModelScope.launch {
            _homes.value = Async.Loading
            runCatching { repo.listHomes() }
                .onSuccess { list ->
                    _homes.value = Async.Success(list)
                    applyActiveHome(container.activeHomeId.value)
                }
                .onFailure { _homes.value = Async.Failure(it.toUserMessage("Failed to load homes")) }
        }
    }

    /** Selecting a home updates the global active home; [applyActiveHome] then reloads tabs. */
    fun selectHome(home: Home) {
        viewModelScope.launch { container.setActiveHome(home.id) }
    }

    /** Resolves the active home against the loaded list and reloads tabs when it changes. */
    private fun applyActiveHome(id: String?) {
        val list = (_homes.value as? Async.Success)?.data ?: return
        if (list.isEmpty()) return
        val home = list.firstOrNull { it.id == id } ?: list.first()
        if (_selected.value?.id == home.id) return
        _selected.value = home
        loadTabs(home.id)
    }

    private fun loadTabs(homeId: String) {
        viewModelScope.launch {
            _photos.value = Async.Loading
            runCatching { repo.listHomePhotos(homeId) }
                .onSuccess { _photos.value = Async.Success(it) }
                .onFailure { _photos.value = Async.Failure(msg(it)) }
        }
        viewModelScope.launch {
            _documents.value = Async.Loading
            runCatching { repo.listHomeDocuments(homeId) }
                .onSuccess { _documents.value = Async.Success(it) }
                .onFailure { _documents.value = Async.Failure(msg(it)) }
        }
        viewModelScope.launch {
            _members.value = Async.Loading
            runCatching { repo.listHomeMembers(homeId) }
                .onSuccess { _members.value = Async.Success(it) }
                .onFailure { _members.value = Async.Failure(msg(it)) }
        }
        viewModelScope.launch {
            _areas.value = Async.Loading
            runCatching { repo.listFloorPlanAreas(homeId) }
                .onSuccess { _areas.value = Async.Success(it) }
                .onFailure { _areas.value = Async.Failure(msg(it)) }
        }
    }

    /** Uploads a picked image to the active home. [onError] receives a message on failure. */
    fun addPhoto(uri: Uri, onError: (String) -> Unit = {}) {
        val homeId = _selected.value?.id ?: return
        if (_uploadingPhoto.value) return
        viewModelScope.launch {
            _uploadingPhoto.value = true
            runCatching { repo.uploadHomePhoto(homeId, uri) }
                .onSuccess { photo ->
                    val cur = (_photos.value as? Async.Success)?.data ?: emptyList()
                    _photos.value = Async.Success(listOf(photo) + cur)
                }
                .onFailure { onError(msg(it)) }
            _uploadingPhoto.value = false
        }
    }

    /** Uploads a picked document (optionally typed) to the active home. */
    fun addDocument(uri: Uri, documentType: String?, onError: (String) -> Unit = {}) {
        val homeId = _selected.value?.id ?: return
        if (_uploadingDocument.value) return
        viewModelScope.launch {
            _uploadingDocument.value = true
            runCatching { repo.uploadHomeDocument(homeId, uri, documentType) }
                .onSuccess { doc ->
                    val cur = (_documents.value as? Async.Success)?.data ?: emptyList()
                    _documents.value = Async.Success(listOf(doc) + cur)
                }
                .onFailure { onError(msg(it)) }
            _uploadingDocument.value = false
        }
    }

    fun deletePhoto(photoId: String) {
        val homeId = _selected.value?.id ?: return
        viewModelScope.launch {
            runCatching { repo.deleteHomePhoto(homeId, photoId) }
                .onSuccess {
                    (_photos.value as? Async.Success)?.let { cur ->
                        _photos.value = Async.Success(cur.data.filterNot { it.id == photoId })
                    }
                }
                .onFailure { _actionError.value = msg(it) }
        }
    }

    fun deleteDocument(docId: String) {
        val homeId = _selected.value?.id ?: return
        viewModelScope.launch {
            runCatching { repo.deleteHomeDocument(homeId, docId) }
                .onSuccess {
                    (_documents.value as? Async.Success)?.let { cur ->
                        _documents.value = Async.Success(cur.data.filterNot { it.id == docId })
                    }
                }
                .onFailure { _actionError.value = msg(it) }
        }
    }

    fun addMember(email: String, onResult: (String?) -> Unit) {
        val homeId = _selected.value?.id ?: return
        viewModelScope.launch {
            runCatching { repo.addHomeMember(homeId, email) }
                .onSuccess { _members.value = Async.Success(it); onResult(null) }
                .onFailure { onResult(msg(it)) }
        }
    }

    fun removeMember(userId: Long) {
        val homeId = _selected.value?.id ?: return
        viewModelScope.launch {
            runCatching { repo.removeHomeMember(homeId, userId) }
                .onSuccess {
                    (_members.value as? Async.Success)?.let { cur ->
                        _members.value = Async.Success(cur.data.filterNot { it.userId == userId })
                    }
                }
                .onFailure { _actionError.value = msg(it) }
        }
    }

    private fun msg(t: Throwable) = t.toUserMessage()
}
