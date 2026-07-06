package com.domitara.ui

/** Navigation route constants. */
object Routes {
    const val DASHBOARD = "dashboard"
    const val ITEMS = "items"
    const val SEARCH = "search"
    const val LOCATIONS = "locations"
    const val LABELS = "labels"

    const val HOME_DETAIL = "home_detail"
    const val PANELS = "panels"
    const val MAINTENANCE = "maintenance"
    const val ASSET_IDS = "asset_ids"
    const val PROFILE = "profile"

    const val ITEM_DETAIL = "item_detail/{itemId}"
    fun itemDetail(itemId: String) = "item_detail/$itemId"

    const val ITEM_EDIT = "item_edit/{itemId}"
    fun itemEdit(itemId: String) = "item_edit/$itemId"

    const val ITEM_NEW = "item_new"
}
