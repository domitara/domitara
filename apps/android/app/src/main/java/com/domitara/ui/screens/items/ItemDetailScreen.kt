package com.domitara.ui.screens.items

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.domitara.data.dto.CreateMaintenanceInput
import com.domitara.data.dto.Item
import com.domitara.data.dto.ItemDocument
import com.domitara.data.dto.ItemPhoto
import com.domitara.data.dto.Location
import com.domitara.data.dto.MaintenanceLog
import com.domitara.di.LocalAppContainer
import com.domitara.di.appViewModel
import com.domitara.ui.common.ActionErrorHost
import com.domitara.ui.common.Async
import com.domitara.ui.common.BoxIcon
import com.domitara.ui.common.ErrorState
import com.domitara.ui.common.LabelChip
import com.domitara.ui.common.LoadingState
import com.domitara.ui.common.PhotoViewerDialog
import com.domitara.ui.common.rememberPhotoCapture
import com.domitara.ui.common.StatusBadge
import com.domitara.ui.common.avatarColor
import com.domitara.ui.common.formatBytes
import com.domitara.ui.common.formatCurrency
import com.domitara.ui.common.parseHexColor
import com.domitara.ui.common.shortDate
import com.domitara.ui.screens.maintenance.LogMaintenanceSheet

@Composable
fun ItemDetailScreen(
    itemId: String,
    onBack: () -> Unit,
    onEdit: (String) -> Unit,
) {
    val vm = appViewModel { ItemDetailViewModel(it.dataRepository, itemId) }
    val state by vm.item.collectAsStateWithLifecycle()
    val deleted by vm.deleted.collectAsStateWithLifecycle()
    val actionError by vm.actionError.collectAsStateWithLifecycle()

    LaunchedEffect(deleted) {
        if (deleted) onBack()
    }

    ActionErrorHost(actionError, vm::clearActionError) {
        Column(Modifier.fillMaxSize()) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(8.dp)) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                }
                Text(
                    (state as? Async.Success)?.data?.name ?: "Item Details",
                    style = MaterialTheme.typography.titleLarge,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                if (state is Async.Success) {
                    TextButton(onClick = { onEdit(itemId) }) { Text("Edit") }
                    var confirmDelete by remember { mutableStateOf(false) }
                    IconButton(onClick = { confirmDelete = true }) {
                        Icon(Icons.Filled.Delete, contentDescription = "Delete item")
                    }
                    if (confirmDelete) {
                        AlertDialog(
                            onDismissRequest = { confirmDelete = false },
                            title = { Text("Delete item?") },
                            text = { Text("This will permanently delete this item. This action cannot be undone.") },
                            confirmButton = {
                                TextButton(onClick = { confirmDelete = false; vm.deleteItem() }) {
                                    Text("Delete", color = MaterialTheme.colorScheme.error)
                                }
                            },
                            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Cancel") } },
                        )
                    }
                }
            }
            HorizontalDivider()

            when (val s = state) {
                Async.Loading -> LoadingState()
                is Async.Failure -> ErrorState(s.message, onRetry = vm::load)
                is Async.Success -> ItemDetailContent(vm, s.data)
            }
        }
    }
}

@Composable
private fun ItemDetailContent(vm: ItemDetailViewModel, item: Item) {
    val locations by vm.locations.collectAsStateWithLifecycle()
    val labels by vm.labels.collectAsStateWithLifecycle()
    val photosState by vm.photos.collectAsStateWithLifecycle()
    val documentsState by vm.documents.collectAsStateWithLifecycle()
    val maintenanceState by vm.maintenance.collectAsStateWithLifecycle()
    val uploadingPhoto by vm.uploadingPhoto.collectAsStateWithLifecycle()
    val uploadingDocument by vm.uploadingDocument.collectAsStateWithLifecycle()

    val chain = remember(locations, item.locationId) { locationChain(locations, item.locationId) }
    val itemLabels = remember(labels, item.labelIds) { item.labelIds.mapNotNull { id -> labels.find { it.id == id } } }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        PhotoCarousel(itemId = item.id, photosState = photosState, uploading = uploadingPhoto, vm = vm)

        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(item.name, style = MaterialTheme.typography.headlineSmall, modifier = Modifier.weight(1f))
            StatusBadge(item.status)
        }

        if (itemLabels.isNotEmpty()) {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                itemLabels.forEach { LabelChip(it.name, parseHexColor(it.color)) }
            }
        }

        item.description?.takeIf { it.isNotBlank() }?.let {
            Text(it, style = MaterialTheme.typography.bodyMedium)
        }

        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp)) {
                FactRow("Location") {
                    Text(
                        if (chain.isEmpty()) "—" else chain.joinToString(" › ") { l -> l.name },
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
                FactRow("Insured") {
                    Text(
                        if (item.insured) "Yes" else "No",
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (item.insured) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                FactRow("Purchased") { Text(shortDate(item.purchasedAt), style = MaterialTheme.typography.bodyMedium) }
                FactRow("Value", isLast = item.assetId == null) {
                    Text(formatCurrency(item.purchasePrice), style = MaterialTheme.typography.bodyMedium)
                }
                item.assetId?.let { assetId ->
                    FactRow("Asset ID", isLast = true) { Text(assetId, style = MaterialTheme.typography.bodyMedium) }
                }
            }
        }

        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp)) {
                FactRow("Manufacturer") { Text(item.manufacturer ?: "—", style = MaterialTheme.typography.bodyMedium) }
                FactRow("Model") { Text(item.model ?: "—", style = MaterialTheme.typography.bodyMedium) }
                FactRow("Serial") { Text(item.serial ?: "—", style = MaterialTheme.typography.bodyMedium) }
                FactRow("Warranty", isLast = true) { Text(item.warranty ?: "—", style = MaterialTheme.typography.bodyMedium) }
            }
        }

        if (item.customFields.isNotEmpty()) {
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    item.customFields.forEachIndexed { index, field ->
                        FactRow(field.label, isLast = index == item.customFields.lastIndex) {
                            Text(
                                field.value?.let { v -> field.unit?.let { u -> "$v $u" } ?: v } ?: "—",
                                style = MaterialTheme.typography.bodyMedium,
                            )
                        }
                    }
                }
            }
        }

        item.notes?.takeIf { it.isNotBlank() }?.let { notes ->
            Column {
                Text(
                    "NOTES",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.padding(top = 4.dp))
                Box(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.4f))
                        .padding(12.dp),
                ) {
                    Text(notes, style = MaterialTheme.typography.bodyMedium)
                }
            }
        }

        DocumentsSection(
            state = documentsState,
            uploading = uploadingDocument,
            onUpload = vm::addDocument,
            onDelete = vm::deleteDocument,
        )

        MaintenanceSection(item = item, state = maintenanceState, onLog = vm::logMaintenance)

        Spacer(Modifier.padding(bottom = 8.dp))
    }
}

@Composable
private fun PhotoCarousel(
    itemId: String,
    photosState: Async<List<ItemPhoto>>,
    uploading: Boolean,
    vm: ItemDetailViewModel,
) {
    val container = LocalAppContainer.current
    var photoIndex by remember(itemId) { mutableIntStateOf(0) }
    var viewerOpen by remember { mutableStateOf(false) }
    var uploadError by remember { mutableStateOf<String?>(null) }
    var addMenuOpen by remember { mutableStateOf(false) }

    val photoCapture = rememberPhotoCapture { uri ->
        uploadError = null
        vm.addPhoto(uri) { uploadError = it }
    }

    val photos = (photosState as? Async.Success)?.data ?: emptyList()
    val current = photos.getOrNull(photoIndex.coerceIn(0, (photos.size - 1).coerceAtLeast(0)))

    Column {
        Box(
            Modifier
                .fillMaxWidth()
                .aspectRatio(1.5f)
                .clip(RoundedCornerShape(12.dp))
                .background(avatarColor(itemId).copy(alpha = 0.18f))
                .then(if (current != null) Modifier.clickable { viewerOpen = true } else Modifier),
            contentAlignment = Alignment.Center,
        ) {
            if (current != null) {
                AsyncImage(
                    model = container.dataRepository.absoluteUrl(current.url),
                    imageLoader = container.imageLoader,
                    contentDescription = current.filename,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
            } else {
                Icon(
                    BoxIcon,
                    contentDescription = null,
                    modifier = Modifier.size(56.dp),
                    tint = avatarColor(itemId),
                )
            }
        }

        Row(
            Modifier.fillMaxWidth().padding(top = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
        ) {
            TextButton(
                onClick = { photoIndex = (photoIndex - 1).coerceAtLeast(0) },
                enabled = photos.size > 1 && photoIndex > 0,
            ) { Text("‹", style = MaterialTheme.typography.titleMedium) }
            Text(
                if (photos.isEmpty()) "No photos" else "${photoIndex + 1} / ${photos.size}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            TextButton(
                onClick = { photoIndex = (photoIndex + 1).coerceAtMost(photos.size - 1) },
                enabled = photos.size > 1 && photoIndex < photos.size - 1,
            ) { Text("›", style = MaterialTheme.typography.titleMedium) }
            Spacer(Modifier.width(8.dp))
            Box {
                TextButton(
                    onClick = { addMenuOpen = true },
                    enabled = !uploading,
                ) {
                    if (uploading) {
                        CircularProgressIndicator(modifier = Modifier.size(14.dp), strokeWidth = 2.dp)
                    } else {
                        Icon(Icons.Filled.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                    }
                    Spacer(Modifier.width(4.dp))
                    Text(if (uploading) "Uploading…" else "Add photo")
                }
                DropdownMenu(expanded = addMenuOpen, onDismissRequest = { addMenuOpen = false }) {
                    DropdownMenuItem(
                        text = { Text("Take photo") },
                        onClick = { addMenuOpen = false; photoCapture.takePhoto() },
                    )
                    DropdownMenuItem(
                        text = { Text("Choose from library") },
                        onClick = { addMenuOpen = false; photoCapture.pickFromGallery() },
                    )
                }
            }
            if (current != null) {
                IconButton(onClick = {
                    vm.deletePhoto(current.id)
                    photoIndex = (photoIndex - 1).coerceAtLeast(0)
                }) {
                    Icon(Icons.Filled.Delete, contentDescription = "Delete photo")
                }
            }
        }
        if (uploadError != null) {
            Text(uploadError!!, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }
    }

    if (viewerOpen && current != null) {
        PhotoViewerDialog(
            url = container.dataRepository.absoluteUrl(current.url),
            description = current.filename,
            onDismiss = { viewerOpen = false },
        )
    }
}

@Composable
private fun FactRow(label: String, isLast: Boolean = false, value: @Composable () -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        value()
    }
    if (!isLast) HorizontalDivider()
}

@Composable
private fun DocumentsSection(
    state: Async<List<ItemDocument>>,
    uploading: Boolean,
    onUpload: (Uri, (String) -> Unit) -> Unit,
    onDelete: (String) -> Unit,
) {
    val context = LocalContext.current
    val container = LocalAppContainer.current
    var uploadError by remember { mutableStateOf<String?>(null) }
    var docToDelete by remember { mutableStateOf<ItemDocument?>(null) }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            uploadError = null
            onUpload(uri) { uploadError = it }
        }
    }

    Column {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Documents", style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
            TextButton(
                onClick = { picker.launch(arrayOf("application/pdf", "image/jpeg", "image/png", "image/webp")) },
                enabled = !uploading,
            ) {
                if (uploading) {
                    CircularProgressIndicator(modifier = Modifier.size(14.dp), strokeWidth = 2.dp)
                    Spacer(Modifier.width(4.dp))
                }
                Text(if (uploading) "Uploading…" else "Add document")
            }
        }
        if (uploadError != null) {
            Text(uploadError!!, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }
        when (state) {
            Async.Loading -> CircularProgressIndicator(modifier = Modifier.size(20.dp).padding(8.dp))
            is Async.Failure -> Text(
                state.message,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall,
            )
            is Async.Success ->
                if (state.data.isEmpty()) {
                    Text(
                        "No documents yet.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        state.data.forEach { doc ->
                            DocumentRow(
                                doc = doc,
                                onOpen = {
                                    val url = container.dataRepository.absoluteUrl(doc.url)
                                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                                },
                                onDelete = { docToDelete = doc },
                            )
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
                TextButton(onClick = { onDelete(doc.id); docToDelete = null }) {
                    Text("Delete", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = { TextButton(onClick = { docToDelete = null }) { Text("Cancel") } },
        )
    }
}

@Composable
private fun DocumentRow(doc: ItemDocument, onOpen: () -> Unit, onDelete: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f))
            .clickable(onClick = onOpen)
            .padding(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(doc.filename, style = MaterialTheme.typography.bodyMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(formatBytes(doc.size), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        IconButton(onClick = onDelete) {
            Icon(Icons.Filled.Delete, contentDescription = "Delete document")
        }
    }
}

@Composable
private fun MaintenanceSection(
    item: Item,
    state: Async<List<MaintenanceLog>>,
    onLog: (CreateMaintenanceInput) -> Unit,
) {
    var showLogSheet by remember { mutableStateOf(false) }

    Column {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Maintenance", style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
            TextButton(onClick = { showLogSheet = true }) { Text("Log") }
        }
        when (state) {
            Async.Loading -> CircularProgressIndicator(modifier = Modifier.size(20.dp).padding(8.dp))
            is Async.Failure -> Text(
                state.message,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall,
            )
            is Async.Success ->
                if (state.data.isEmpty()) {
                    Text(
                        "No maintenance logs yet.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        state.data.forEach { log -> MaintenanceLogRow(log) }
                    }
                }
        }
    }

    if (showLogSheet) {
        LogMaintenanceSheet(
            items = listOf(item),
            defaultItemId = item.id,
            onSave = { onLog(it); showLogSheet = false },
            onDismiss = { showLogSheet = false },
        )
    }
}

@Composable
private fun MaintenanceLogRow(log: MaintenanceLog) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f))
            .padding(10.dp),
    ) {
        Text(
            shortDate(log.performedAt),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.width(80.dp),
        )
        Column(Modifier.weight(1f)) {
            Text(log.title, style = MaterialTheme.typography.bodyMedium)
            log.notes?.takeIf { it.isNotBlank() }?.let {
                Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        log.cost?.let {
            Text(formatCurrency(it), style = MaterialTheme.typography.bodySmall)
        }
    }
}

/** Walks [Location.parentId] from [id] up to the root, returning root-first. */
private fun locationChain(locations: List<Location>, id: String?): List<Location> {
    if (id == null) return emptyList()
    val byId = locations.associateBy { it.id }
    val chain = mutableListOf<Location>()
    var cur = byId[id]
    while (cur != null) {
        chain.add(0, cur)
        cur = cur.parentId?.let(byId::get)
    }
    return chain
}
