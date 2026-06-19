package com.domitara.ui.screens.assetids

import androidx.compose.runtime.Composable
import com.domitara.ui.common.EmptyState

@Composable
fun AssetIdsScreen() {
    // Parity with the RN app: QR asset-ID scanning is a placeholder for now.
    EmptyState(
        title = "Asset IDs",
        subtitle = "QR code scanning is coming soon.",
    )
}
