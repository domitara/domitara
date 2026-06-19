package com.domitara.ui.common

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.unit.dp

/**
 * Custom vector icons for glyphs the app's only icons artifact
 * (`material-icons-core`) doesn't ship. These mirror the web UI's Tabler icons
 * (see apps/web `Shell.tsx` / `AllItemsScreen.tsx`) so mobile and web read the
 * same. Path data uses the standard 24×24 Material viewport; the fill color is a
 * placeholder — `Icon(...)` tints the whole vector at the call site.
 */
private fun namedVector(name: String, pathData: String): ImageVector =
    ImageVector.Builder(
        name = name,
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        addPath(
            pathData = PathParser().parsePathString(pathData).toNodes(),
            fill = SolidColor(Color.Black),
        )
    }.build()

/** 2×2 grid — list/grid view toggle (web: IconLayoutGrid). */
val GridViewIcon: ImageVector by lazy {
    namedVector("GridView", "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z")
}

/** Price tag — Labels (web: IconTag). Material "sell". */
val TagIcon: ImageVector by lazy {
    namedVector(
        "Tag",
        "M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 " +
            "1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.23" +
            "-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z",
    )
}

/** Box — All items (web: IconBox). Material "inventory_2". */
val BoxIcon: ImageVector by lazy {
    namedVector(
        "Box",
        "M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 " +
            "2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9c-.55 0-1-.45-1-1s.45-1 1-1h6c" +
            ".55 0 1 .45 1 1s-.45 1-1 1zm5-7H4V4l16-.02V7z",
    )
}

/** QR code — Asset IDs (web: IconQrcode). Material "qr_code". */
val QrCodeIcon: ImageVector by lazy {
    namedVector(
        "QrCode",
        "M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4z" +
            "M19 19h2v2h-2zm-6-6h2v2h-2zm2 2h2v2h-2zm-2 2h2v2h-2zm2 2h2v2h-2zm2-2h2v2h-2zm0-4h2v2" +
            "h-2zm2 2h2v2h-2z",
    )
}

/** Clipboard — Maintenance (web: IconClipboard). Material "assignment". */
val ClipboardIcon: ImageVector by lazy {
    namedVector(
        "Clipboard",
        "M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 " +
            "2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 " +
            ".45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z",
    )
}

/** Building — active home (web: IconBuilding). Material "business". */
val BuildingIcon: ImageVector by lazy {
    namedVector(
        "Building",
        "M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2" +
            "h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10z" +
            "m-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z",
    )
}

/** Ascending sort bars — sort control (web: IconSortAscending). Material "sort". */
val SortIcon: ImageVector by lazy {
    namedVector("Sort", "M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z")
}

/** Lightning bolt — Electrical Panels. Material "bolt". */
val BoltIcon: ImageVector by lazy {
    namedVector(
        "Bolt",
        "M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 " +
            "13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z",
    )
}
