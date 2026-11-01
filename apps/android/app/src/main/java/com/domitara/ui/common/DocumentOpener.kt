package com.domitara.ui.common

import android.content.ActivityNotFoundException
import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.FileProvider
import com.domitara.di.LocalAppContainer
import kotlinx.coroutines.launch

/**
 * Returns a function that opens a server-hosted document. Images show in the in-app
 * viewer; everything else (PDFs) is downloaded with the bearer token and handed to an
 * installed viewer through FileProvider, since external apps can't authenticate.
 * [onError] receives a user-facing message on failure.
 */
@Composable
fun rememberDocumentOpener(onError: (String) -> Unit): (url: String, filename: String, contentType: String) -> Unit {
    val context = LocalContext.current
    val container = LocalAppContainer.current
    val scope = rememberCoroutineScope()
    var imageUrl by remember { mutableStateOf<String?>(null) }
    var imageName by remember { mutableStateOf<String?>(null) }

    imageUrl?.let { url ->
        PhotoViewerDialog(url = url, description = imageName, onDismiss = { imageUrl = null })
    }

    return { url, filename, contentType ->
        if (contentType.startsWith("image/")) {
            imageName = filename
            imageUrl = container.dataRepository.absoluteUrl(url)
        } else {
            scope.launch {
                try {
                    val file = container.downloadDocument(url, filename)
                    val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
                    val intent = Intent(Intent.ACTION_VIEW).apply {
                        setDataAndType(uri, contentType.ifBlank { "application/pdf" })
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                    context.startActivity(Intent.createChooser(intent, filename).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                } catch (e: ActivityNotFoundException) {
                    onError("No app installed to open this file")
                } catch (e: Exception) {
                    onError(e.message ?: "Could not open document")
                }
            }
        }
    }
}
