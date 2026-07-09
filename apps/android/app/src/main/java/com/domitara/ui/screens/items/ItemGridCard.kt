package com.domitara.ui.screens.items

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.domitara.data.dto.Item
import com.domitara.data.dto.Label
import com.domitara.di.LocalAppContainer
import com.domitara.ui.common.Avatar
import com.domitara.ui.common.LabelChips
import com.domitara.ui.common.StatusBadge
import com.domitara.ui.common.avatarColor
import com.domitara.ui.common.formatCurrency

@Composable
fun ItemGridCard(
    item: Item,
    labelsById: Map<String, Label>,
    locationName: String?,
    onClick: () -> Unit,
) {
    val container = LocalAppContainer.current
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
    ) {
        // Cover photo when available, otherwise a placeholder tinted from the item's avatar color.
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(1.4f)
                .clip(RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp))
                .background(avatarColor(item.id).copy(alpha = 0.18f)),
            contentAlignment = Alignment.Center,
        ) {
            if (item.coverPhotoUrl != null) {
                AsyncImage(
                    model = container.dataRepository.absoluteUrl(item.coverPhotoUrl),
                    imageLoader = container.imageLoader,
                    contentDescription = item.name,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
            } else {
                Avatar(item.id, item.name, size = 48)
            }
            Box(Modifier.fillMaxWidth().padding(8.dp), contentAlignment = Alignment.TopEnd) {
                StatusBadge(item.status)
            }
        }
        Column(Modifier.padding(10.dp)) {
            Text(
                item.name,
                style = MaterialTheme.typography.titleSmall,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                locationName ?: "—",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            val chips = item.labelIds.mapNotNull { labelsById[it] }
            if (chips.isNotEmpty()) {
                Spacer(Modifier.padding(top = 6.dp))
                LabelChips(chips, max = 2)
            }
            if (item.purchasePrice != null) {
                Spacer(Modifier.padding(top = 6.dp))
                Text(
                    formatCurrency(item.purchasePrice),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}
