package com.domitara.ui.common

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import java.io.File

/** Launchers for adding a photo either by picking one from the gallery or capturing one with the camera. */
class PhotoCapture(
    val pickFromGallery: () -> Unit,
    val takePhoto: () -> Unit,
)

/**
 * Sets up gallery and camera capture launchers that both funnel into [onPicked] with the
 * resulting content [Uri]. Handles the CAMERA runtime permission prompt and the FileProvider
 * scratch file the camera intent writes into.
 */
@Composable
fun rememberPhotoCapture(onPicked: (Uri) -> Unit): PhotoCapture {
    val context = LocalContext.current
    var pendingCameraUri by remember { mutableStateOf<Uri?>(null) }

    val galleryLauncher = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) onPicked(uri)
    }

    val cameraLauncher = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { success ->
        val uri = pendingCameraUri
        pendingCameraUri = null
        if (success && uri != null) onPicked(uri)
    }

    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) {
            val uri = createImageCaptureUri(context)
            pendingCameraUri = uri
            cameraLauncher.launch(uri)
        }
    }

    return remember(context) {
        PhotoCapture(
            pickFromGallery = {
                galleryLauncher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
            },
            takePhoto = {
                val hasPermission = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
                    PackageManager.PERMISSION_GRANTED
                if (hasPermission) {
                    val uri = createImageCaptureUri(context)
                    pendingCameraUri = uri
                    cameraLauncher.launch(uri)
                } else {
                    permissionLauncher.launch(Manifest.permission.CAMERA)
                }
            },
        )
    }
}

private fun createImageCaptureUri(context: Context): Uri {
    val imagesDir = File(context.cacheDir, "images").apply { mkdirs() }
    val file = File(imagesDir, "IMG_${System.currentTimeMillis()}.jpg")
    return FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
}
