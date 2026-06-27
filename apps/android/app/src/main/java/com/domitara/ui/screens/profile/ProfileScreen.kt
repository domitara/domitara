package com.domitara.ui.screens.profile

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.domitara.data.dto.User
import com.domitara.di.appViewModel
import com.domitara.ui.common.Async
import com.domitara.ui.common.Avatar
import com.domitara.ui.common.ErrorState
import com.domitara.ui.common.LoadingState
import com.domitara.ui.theme.DangerRed

@Composable
fun ProfileScreen() {
    val vm = appViewModel { container ->
        ProfileViewModel(container.dataRepository) { container.refreshUser() }
    }
    val state by vm.state.collectAsState()

    when (val s = state) {
        Async.Loading -> LoadingState(Modifier.fillMaxSize())
        is Async.Failure -> ErrorState(s.message, onRetry = { vm.load() }, modifier = Modifier.fillMaxSize())
        is Async.Success -> ProfileForm(s.data, vm)
    }
}

@Composable
private fun ProfileForm(user: User, vm: ProfileViewModel) {
    val saving by vm.saving.collectAsState()
    val error by vm.error.collectAsState()
    val saved by vm.saved.collectAsState()

    // Editable fields. Re-seed the name if the loaded user changes (e.g. retry).
    var name by rememberSaveable(user.id) { mutableStateOf(user.name) }
    var password by rememberSaveable(user.id) { mutableStateOf("") }
    var confirm by rememberSaveable(user.id) { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .imePadding()
            .padding(16.dp),
    ) {
        // Identity card: avatar + name + email + role.
        OutlinedCard(Modifier.fillMaxWidth()) {
            Row(
                Modifier.padding(20.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Avatar(id = user.id.toString(), name = user.name, size = 64)
                Spacer(Modifier.width(16.dp))
                Column {
                    Text(
                        user.name,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        user.email,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.height(6.dp))
                    RoleBadge(user.role)
                }
            }
        }

        Spacer(Modifier.height(16.dp))

        Text("Account", style = MaterialTheme.typography.titleMedium)
        Text(
            "Your name and sign-in details.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(16.dp))

        OutlinedTextField(
            value = name,
            onValueChange = { name = it },
            label = { Text("Name") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(12.dp))

        OutlinedTextField(
            value = user.email,
            onValueChange = {},
            label = { Text("Email") },
            enabled = false,
            singleLine = true,
            supportingText = { Text("Contact an admin to change your email.") },
            modifier = Modifier.fillMaxWidth(),
        )

        Spacer(Modifier.height(20.dp))
        HorizontalDivider()
        Spacer(Modifier.height(12.dp))
        Text("Change password", style = MaterialTheme.typography.titleSmall)
        Spacer(Modifier.height(12.dp))

        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("New password") },
            placeholder = { Text("Leave blank to keep current") },
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Password,
                imeAction = ImeAction.Next,
            ),
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(12.dp))

        OutlinedTextField(
            value = confirm,
            onValueChange = { confirm = it },
            label = { Text("Confirm password") },
            placeholder = { Text("Repeat new password") },
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Password,
                imeAction = ImeAction.Done,
            ),
            modifier = Modifier.fillMaxWidth(),
        )

        if (error != null) {
            Spacer(Modifier.height(12.dp))
            Text(error!!, color = DangerRed, style = MaterialTheme.typography.bodyMedium)
        }
        if (saved) {
            Spacer(Modifier.height(12.dp))
            Text(
                "Changes saved.",
                color = MaterialTheme.colorScheme.primary,
                style = MaterialTheme.typography.bodyMedium,
            )
        }

        Spacer(Modifier.height(20.dp))
        Button(
            onClick = { vm.save(name, password, confirm) },
            enabled = !saving,
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (saving) {
                CircularProgressIndicator(
                    modifier = Modifier.height(20.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.onPrimary,
                )
            } else {
                Text("Save changes")
            }
        }
    }
}

@Composable
private fun RoleBadge(role: String) {
    val container = if (role == "admin") {
        MaterialTheme.colorScheme.primaryContainer
    } else {
        MaterialTheme.colorScheme.surfaceVariant
    }
    val content = if (role == "admin") {
        MaterialTheme.colorScheme.onPrimaryContainer
    } else {
        MaterialTheme.colorScheme.onSurfaceVariant
    }
    androidx.compose.material3.Surface(
        color = container,
        contentColor = content,
        shape = MaterialTheme.shapes.small,
    ) {
        Text(
            role,
            style = MaterialTheme.typography.labelMedium,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
        )
    }
}
