package com.domitara.ui.screens.home

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.PrimaryScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.domitara.data.dto.FloorPlanArea
import com.domitara.data.dto.Home
import com.domitara.data.dto.HomeDocument
import com.domitara.data.dto.HomeDocumentType
import com.domitara.data.dto.HomeMember
import com.domitara.data.dto.HomeMemberRole
import com.domitara.data.dto.HomePhoto
import com.domitara.di.LocalAppContainer
import com.domitara.di.appViewModel
import com.domitara.ui.common.ActionErrorHost
import com.domitara.ui.common.Async
import com.domitara.ui.common.ColorDot
import com.domitara.ui.common.EmptyState
import com.domitara.ui.common.ErrorState
import com.domitara.ui.common.LabelValue
import com.domitara.ui.common.LoadingState
import com.domitara.ui.common.PhotoViewerDialog
import com.domitara.ui.common.formatBytes
import com.domitara.ui.common.formatCurrency
import com.domitara.ui.common.parseHexColor
import com.domitara.ui.common.shortDate

private val TABS = listOf("Details", "Photos", "Documents", "Members", "Floor Plans")

@Composable
fun HomeDetailScreen() {
    val vm = appViewModel { HomeDetailViewModel(it) }
    val homesState by vm.homes.collectAsStateWithLifecycle()
    val selected by vm.selected.collectAsStateWithLifecycle()
    val actionError by vm.actionError.collectAsStateWithLifecycle()

    ActionErrorHost(actionError, vm::clearActionError) {
        when (val s = homesState) {
            Async.Loading -> LoadingState()
            is Async.Failure -> ErrorState(s.message, onRetry = vm::loadHomes)
            is Async.Success ->
                if (s.data.isEmpty()) {
                    EmptyState("No homes", "Add a home from the web app to get started.")
                } else {
                    val home = selected ?: s.data.first()
                    Column(Modifier.fillMaxSize()) {
                        HomeSelector(homes = s.data, selected = home, onSelect = vm::selectHome)
                        HomeTabs(vm)
                    }
                }
        }
    }
}

@Composable
private fun HomeSelector(homes: List<Home>, selected: Home, onSelect: (Home) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Box {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { expanded = true }
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(selected.name, style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
            Icon(Icons.Filled.KeyboardArrowDown, contentDescription = "Switch home")
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            homes.forEach { home ->
                DropdownMenuItem(
                    text = { Text(home.name) },
                    onClick = { expanded = false; onSelect(home) },
                )
            }
        }
    }
    HorizontalDivider()
}

@Composable
private fun HomeTabs(vm: HomeDetailViewModel) {
    var tab by remember { mutableIntStateOf(0) }
    PrimaryScrollableTabRow(selectedTabIndex = tab, edgePadding = 8.dp) {
        TABS.forEachIndexed { index, title ->
            Tab(selected = tab == index, onClick = { tab = index }, text = { Text(title) })
        }
    }
    when (tab) {
        0 -> DetailsTab(vm)
        1 -> PhotosTab(vm)
        2 -> DocumentsTab(vm)
        3 -> MembersTab(vm)
        else -> FloorPlansTab(vm)
    }
}

@Composable
private fun DetailsTab(vm: HomeDetailViewModel) {
    val home by vm.selected.collectAsStateWithLifecycle()
    val h = home ?: return
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        val address = listOfNotNull(
            h.addressStreet, h.addressCity, h.addressState, h.addressZip, h.addressCountry,
        ).joinToString(", ").ifBlank { "—" }
        LabelValue("Address", address)
        LabelValue("Property Type", h.propertyType?.name?.lowercase()?.replaceFirstChar { it.uppercase() } ?: "—")
        LabelValue("Year Built", h.yearBuilt?.toString() ?: "—")
        LabelValue("Square Feet", formatSqft(h.sqft))
        LabelValue("Acreage", h.acreage?.toString() ?: "—")
        LabelValue("Estimated Value", formatCurrency(h.estimatedValue))
        LabelValue("Purchase Price", formatCurrency(h.purchasePrice))
        h.purchasedAt?.let { LabelValue("Purchase Date", shortDate(it)) }
        h.mortgageLender?.let { LabelValue("Mortgage Lender", it) }
        h.mortgageNotes?.let { LabelValue("Mortgage Notes", it) }
        h.hoaName?.let { LabelValue("HOA", it) }
        h.hoaContact?.let { LabelValue("HOA Contact", it) }
        h.hoaMonthlyDues?.let { LabelValue("HOA Monthly Dues", formatCurrency(it)) }
        h.notes?.let { LabelValue("Notes", it) }
    }
}

/** Square footage: drop the trailing ".0" for whole numbers (sqft is a Double). */
private fun formatSqft(sqft: Double?): String {
    if (sqft == null) return "—"
    return if (sqft % 1.0 == 0.0) sqft.toLong().toString() else sqft.toString()
}

@Composable
private fun PhotosTab(vm: HomeDetailViewModel) {
    val container = LocalAppContainer.current
    val state by vm.photos.collectAsStateWithLifecycle()
    val uploading by vm.uploadingPhoto.collectAsStateWithLifecycle()
    var photoToDelete by remember { mutableStateOf<HomePhoto?>(null) }
    var photoToView by remember { mutableStateOf<HomePhoto?>(null) }
    var uploadError by remember { mutableStateOf<String?>(null) }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) {
            uploadError = null
            vm.addPhoto(uri) { uploadError = it }
        }
    }

    Column(Modifier.fillMaxSize()) {
        UploadBar(
            label = "Upload photo",
            uploading = uploading,
            error = uploadError,
            onClick = {
                picker.launch(
                    PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly),
                )
            },
        )
        Box(Modifier.weight(1f).fillMaxSize()) {
            when (val s = state) {
                Async.Loading -> LoadingState()
                is Async.Failure -> ErrorState(s.message)
                is Async.Success ->
                    if (s.data.isEmpty()) {
                        EmptyState("No photos")
                    } else {
                        LazyVerticalGrid(
                            columns = GridCells.Fixed(3),
                            contentPadding = androidx.compose.foundation.layout.PaddingValues(8.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            items(s.data, key = { it.id }) { photo: HomePhoto ->
                                Box(
                                    Modifier
                                        .aspectRatio(1f)
                                        .clip(RoundedCornerShape(8.dp))
                                        .clickable { photoToView = photo },
                                ) {
                                    AsyncImage(
                                        model = container.dataRepository.absoluteUrl(photo.url),
                                        imageLoader = container.imageLoader,
                                        contentDescription = photo.filename,
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier.fillMaxSize().background(Color(0xFFEEEEEE)),
                                    )
                                    IconButton(
                                        onClick = { photoToDelete = photo },
                                        modifier = Modifier
                                            .align(Alignment.TopEnd)
                                            .padding(4.dp)
                                            .size(28.dp)
                                            .clip(CircleShape)
                                            .background(Color.Black.copy(alpha = 0.4f)),
                                    ) {
                                        Icon(Icons.Filled.Delete, contentDescription = "Delete", tint = Color.White, modifier = Modifier.size(16.dp))
                                    }
                                }
                            }
                        }
                    }
            }
        }
    }

    photoToDelete?.let { photo ->
        AlertDialog(
            onDismissRequest = { photoToDelete = null },
            title = { Text("Delete photo?") },
            text = { Text("This will permanently delete this photo. This action cannot be undone.") },
            confirmButton = {
                TextButton(onClick = { vm.deletePhoto(photo.id); photoToDelete = null }) {
                    Text("Delete", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = { TextButton(onClick = { photoToDelete = null }) { Text("Cancel") } },
        )
    }

    photoToView?.let { photo ->
        PhotoViewerDialog(
            url = container.dataRepository.absoluteUrl(photo.url),
            description = photo.filename,
            onDismiss = { photoToView = null },
        )
    }
}

/** Document type options, mirroring the web UI's upload selector. */
private val DOCUMENT_TYPE_OPTIONS = listOf(
    HomeDocumentType.DEED to "Deed",
    HomeDocumentType.INSURANCE to "Insurance",
    HomeDocumentType.INSPECTION to "Inspection Report",
    HomeDocumentType.SURVEY to "Survey / Plat",
    HomeDocumentType.HOA to "HOA Documents",
    HomeDocumentType.WARRANTY to "Warranty",
    HomeDocumentType.PERMIT to "Permit",
    HomeDocumentType.TAX to "Tax Records",
    HomeDocumentType.FLOOR_PLAN to "Floor Plan",
    HomeDocumentType.OTHER to "Other",
)

private fun documentTypeLabel(type: HomeDocumentType): String =
    DOCUMENT_TYPE_OPTIONS.firstOrNull { it.first == type }?.second
        ?: type.name.lowercase().replaceFirstChar { it.uppercase() }

/** Serialized value the server expects (matches the @SerialName on the enum). */
private fun documentTypeWire(type: HomeDocumentType): String = type.name.lowercase()

@Composable
private fun DocumentsTab(vm: HomeDetailViewModel) {
    val state by vm.documents.collectAsStateWithLifecycle()
    val uploading by vm.uploadingDocument.collectAsStateWithLifecycle()
    var uploadType by remember { mutableStateOf<HomeDocumentType?>(null) }
    var uploadError by remember { mutableStateOf<String?>(null) }
    var docToDelete by remember { mutableStateOf<HomeDocument?>(null) }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            uploadError = null
            vm.addDocument(uri, uploadType?.let(::documentTypeWire)) { uploadError = it }
        }
    }

    Column(Modifier.fillMaxSize()) {
        DocumentTypeDropdown(
            selected = uploadType,
            onSelect = { uploadType = it },
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
        )
        UploadBar(
            label = "Upload document",
            uploading = uploading,
            error = uploadError,
            onClick = {
                picker.launch(arrayOf("application/pdf", "image/jpeg", "image/png", "image/webp"))
            },
        )
        Box(Modifier.weight(1f).fillMaxSize()) {
            when (val s = state) {
                Async.Loading -> LoadingState()
                is Async.Failure -> ErrorState(s.message)
                is Async.Success ->
                    if (s.data.isEmpty()) {
                        EmptyState("No documents")
                    } else {
                        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
                            s.data.forEach { doc: HomeDocument ->
                                Row(
                                    Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Column(Modifier.weight(1f)) {
                                        Text(doc.filename, style = MaterialTheme.typography.titleMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            InlineDocumentTypeSelector(
                                                selected = doc.documentType,
                                                onSelect = { vm.updateDocumentType(doc.id, it) },
                                            )
                                            Text(
                                                " · ${formatBytes(doc.size)}",
                                                style = MaterialTheme.typography.bodyMedium,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            )
                                        }
                                    }
                                    IconButton(onClick = { docToDelete = doc }) {
                                        Icon(Icons.Filled.Delete, contentDescription = "Delete")
                                    }
                                }
                                HorizontalDivider()
                            }
                        }
                    }
            }
        }
    }

    docToDelete?.let { doc ->
        AlertDialog(
            onDismissRequest = { docToDelete = null },
            title = { Text("Delete document?") },
            text = { Text("This will permanently delete \"${doc.filename}\". This action cannot be undone.") },
            confirmButton = {
                TextButton(onClick = { vm.deleteDocument(doc.id); docToDelete = null }) {
                    Text("Delete", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = { TextButton(onClick = { docToDelete = null }) { Text("Cancel") } },
        )
    }
}

@Composable
private fun InlineDocumentTypeSelector(
    selected: HomeDocumentType?,
    onSelect: (HomeDocumentType?) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    Box {
        Row(
            modifier = Modifier.clickable { expanded = true },
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                selected?.let(::documentTypeLabel) ?: "Set type",
                style = MaterialTheme.typography.bodyMedium,
                color = if (selected == null) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Icon(
                Icons.Filled.KeyboardArrowDown,
                contentDescription = null,
                modifier = Modifier.size(16.dp),
                tint = if (selected == null) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            DropdownMenuItem(
                text = { Text("None") },
                onClick = { expanded = false; onSelect(null) },
            )
            DOCUMENT_TYPE_OPTIONS.forEach { (type, label) ->
                DropdownMenuItem(
                    text = { Text(label) },
                    onClick = { expanded = false; onSelect(type) },
                )
            }
        }
    }
}

@Composable
private fun DocumentTypeDropdown(
    selected: HomeDocumentType?,
    onSelect: (HomeDocumentType?) -> Unit,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }
    Box(modifier) {
        OutlinedButton(onClick = { expanded = true }, modifier = Modifier.fillMaxWidth()) {
            Text(
                selected?.let(::documentTypeLabel) ?: "Document type (optional)",
                modifier = Modifier.weight(1f),
                color = if (selected == null) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
            )
            Icon(Icons.Filled.KeyboardArrowDown, contentDescription = null)
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            DropdownMenuItem(
                text = { Text("None") },
                onClick = { expanded = false; onSelect(null) },
            )
            DOCUMENT_TYPE_OPTIONS.forEach { (type, label) ->
                DropdownMenuItem(
                    text = { Text(label) },
                    onClick = { expanded = false; onSelect(type) },
                )
            }
        }
    }
}

/** Top-of-tab bar with an upload action, busy spinner, and inline error. */
@Composable
private fun UploadBar(
    label: String,
    uploading: Boolean,
    error: String?,
    onClick: () -> Unit,
) {
    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
        FilledTonalButton(onClick = onClick, enabled = !uploading) {
            if (uploading) {
                CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
            } else {
                Icon(Icons.Filled.Add, contentDescription = null)
            }
            Spacer(Modifier.width(8.dp))
            Text(if (uploading) "Uploading…" else label)
        }
        if (error != null) {
            Spacer(Modifier.size(4.dp))
            Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
private fun MembersTab(vm: HomeDetailViewModel) {
    val state by vm.members.collectAsStateWithLifecycle()
    var showInvite by remember { mutableStateOf(false) }

    Column(Modifier.fillMaxSize()) {
        if (vm.isOwner) {
            FilledTonalButton(
                onClick = { showInvite = true },
                modifier = Modifier.padding(16.dp),
            ) {
                Icon(Icons.Filled.Add, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text("Invite member")
            }
        }
        when (val s = state) {
            Async.Loading -> LoadingState()
            is Async.Failure -> ErrorState(s.message)
            is Async.Success ->
                if (s.data.isEmpty()) {
                    EmptyState("No members")
                } else {
                    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
                        s.data.forEach { member: HomeMember -> MemberRow(member, vm) }
                    }
                }
        }
    }

    if (showInvite) {
        InviteDialog(
            onDismiss = { showInvite = false },
            onInvite = { email, onError ->
                vm.addMember(email) { err -> if (err == null) showInvite = false else onError(err) }
            },
        )
    }
}

@Composable
private fun MemberRow(member: HomeMember, vm: HomeDetailViewModel) {
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(member.userName, style = MaterialTheme.typography.titleMedium)
            Text(member.userEmail, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Text(
            if (member.role == HomeMemberRole.OWNER) "Owner" else "Member",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        if (vm.isOwner && member.role != HomeMemberRole.OWNER) {
            IconButton(onClick = { vm.removeMember(member.userId) }) {
                Icon(Icons.Filled.Delete, contentDescription = "Remove")
            }
        }
    }
    HorizontalDivider()
}

@Composable
private fun InviteDialog(onDismiss: () -> Unit, onInvite: (String, (String) -> Unit) -> Unit) {
    var email by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Invite member") },
        text = {
            Column {
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email") },
                    singleLine = true,
                )
                if (error != null) {
                    Spacer(Modifier.size(8.dp))
                    Text(error!!, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
                }
            }
        },
        confirmButton = {
            TextButton(onClick = { if (email.isNotBlank()) onInvite(email) { error = it } }) { Text("Invite") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun FloorPlansTab(vm: HomeDetailViewModel) {
    val state by vm.areas.collectAsStateWithLifecycle()
    when (val s = state) {
        Async.Loading -> LoadingState()
        is Async.Failure -> ErrorState(s.message)
        is Async.Success ->
            if (s.data.isEmpty()) {
                EmptyState("No floor plan areas")
            } else {
                Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
                    s.data.forEach { area: FloorPlanArea ->
                        Card(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                            Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                                ColorDot(parseHexColor(area.color), size = 20)
                                Spacer(Modifier.width(12.dp))
                                Text(area.name, style = MaterialTheme.typography.titleMedium)
                            }
                        }
                    }
                }
            }
    }
}
