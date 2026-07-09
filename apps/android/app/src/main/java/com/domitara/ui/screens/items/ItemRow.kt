package com.domitara.ui.screens.items

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentWidth
import androidx.compose.foundation.shape.CircleShape
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
import com.domitara.ui.common.formatCurrency

@Composable
fun ItemRow(
    item: Item,
    labelsById: Map<String, Label>,
    locationName: String?,
    onClick: () -> Unit,
) {
    val container = LocalAppContainer.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (item.coverPhotoUrl != null) {
            AsyncImage(
                model = container.dataRepository.absoluteUrl(item.coverPhotoUrl),
                imageLoader = container.imageLoader,
                contentDescription = item.name,
                contentScale = ContentScale.Crop,
                modifier = Modifier.size(40.dp).clip(CircleShape),
            )
        } else {
            Avatar(item.id, item.name)
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(
                item.name,
                style = MaterialTheme.typography.titleMedium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            if (locationName != null) {
                Text(
                    locationName,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            val chips = item.labelIds.mapNotNull { labelsById[it] }
            if (chips.isNotEmpty()) {
                Spacer(Modifier.padding(top = 4.dp))
                LabelChips(chips, max = 3)
            }
        }
        Spacer(Modifier.width(8.dp))
        Column(
            modifier = Modifier.wrapContentWidth(),
            horizontalAlignment = Alignment.End,
        ) {
            StatusBadge(item.status)
            if (item.purchasePrice != null) {
                Spacer(Modifier.padding(top = 4.dp))
                Text(
                    formatCurrency(item.purchasePrice),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}
