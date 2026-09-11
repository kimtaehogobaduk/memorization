package com.example.amgijunsuk.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Quiz
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.amgijunsuk.data.model.VocabularyEntity
import com.example.amgijunsuk.data.model.VocabularyWithCount
import com.example.amgijunsuk.ui.MainViewModel
import com.example.amgijunsuk.ui.components.AppTopBar
import com.example.amgijunsuk.ui.components.JunsukMascot
import com.example.amgijunsuk.ui.components.JunsukMood
import com.example.amgijunsuk.ui.navigation.Screen
import com.example.amgijunsuk.ui.theme.JunsukBlue

@Composable
fun VocabularyListScreen(
    viewModel: MainViewModel,
    onNavigate: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val vocabularies by viewModel.vocabularies.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf("전체") }
    var showCreateDialog by remember { mutableStateOf(false) }
    var editingVocab by remember { mutableStateOf<VocabularyEntity?>(null) }

    val categories = listOf("전체", "수능/내신", "토익/취업", "기초/회화", "학술/전문", "일반")

    val filteredList = vocabularies.filter { item ->
        val matchesSearch = item.vocabulary.name.contains(searchQuery, ignoreCase = true) ||
                (item.vocabulary.description?.contains(searchQuery, ignoreCase = true) == true)
        val matchesCategory = selectedCategory == "전체" || item.vocabulary.category == selectedCategory
        matchesSearch && matchesCategory
    }

    Scaffold(
        topBar = {
            AppTopBar(
                title = "내 단어장 목록",
                actions = {
                    IconButton(onClick = { showCreateDialog = true }) {
                        Icon(imageVector = Icons.Filled.Add, contentDescription = "단어장 추가")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showCreateDialog = true },
                containerColor = JunsukBlue,
                contentColor = MaterialTheme.colorScheme.onPrimary,
                modifier = Modifier
                    .padding(bottom = 72.dp)
                    .testTag("fab_create_vocabulary")
            ) {
                Icon(imageVector = Icons.Filled.Add, contentDescription = "새 단어장")
            }
        },
        modifier = modifier
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(MaterialTheme.colorScheme.background)
        ) {
            // Search TextField
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                placeholder = { Text("단어장 이름 또는 설명 검색") },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
                    .testTag("vocabulary_search_input")
            )

            // Category Filter Chips
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(bottom = 8.dp)
            ) {
                items(categories) { cat ->
                    FilterChip(
                        selected = selectedCategory == cat,
                        onClick = { selectedCategory = cat },
                        label = { Text(cat) }
                    )
                }
            }

            // Vocabularies List
            if (filteredList.isEmpty()) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(24.dp)
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        JunsukMascot(
                            mood = JunsukMood.SURPRISED,
                            size = 80.dp,
                            speechBubbleText = "해당하는 단어장이 없어요!"
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = { showCreateDialog = true },
                            colors = ButtonDefaults.buttonColors(containerColor = JunsukBlue)
                        ) {
                            Icon(Icons.Filled.Add, contentDescription = null)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("새 단어장 만들기")
                        }
                    }
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 120.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(filteredList) { item ->
                        VocabularyCardItem(
                            item = item,
                            onCardClick = {
                                onNavigate(Screen.VocabularyDetail.createRoute(item.vocabulary.id))
                            },
                            onStudyClick = {
                                onNavigate(Screen.Study.createRoute(item.vocabulary.id))
                            },
                            onQuizClick = {
                                onNavigate(Screen.QuizHub.createRoute(item.vocabulary.id))
                            },
                            onBulkAddClick = {
                                onNavigate(Screen.BulkAddWords.createRoute(item.vocabulary.id))
                            },
                            onEditClick = {
                                editingVocab = item.vocabulary
                            },
                            onDeleteClick = {
                                viewModel.deleteVocabulary(item.vocabulary.id)
                            }
                        )
                    }
                }
            }
        }
    }

    // Create / Edit Dialog
    if (showCreateDialog || editingVocab != null) {
        var name by remember(editingVocab) { mutableStateOf(editingVocab?.name ?: "") }
        var desc by remember(editingVocab) { mutableStateOf(editingVocab?.description ?: "") }
        var category by remember(editingVocab) { mutableStateOf(editingVocab?.category ?: "일반") }

        AlertDialog(
            onDismissRequest = {
                showCreateDialog = false
                editingVocab = null
            },
            title = {
                Text(
                    text = if (editingVocab != null) "단어장 수정" else "새 단어장 생성",
                    style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold)
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("단어장 이름 *") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = desc,
                        onValueChange = { desc = it },
                        label = { Text("설명 (선택)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = category,
                        onValueChange = { category = it },
                        label = { Text("카테고리 (예: 수능/내신, 토익, 회화)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (name.isNotBlank()) {
                            if (editingVocab != null) {
                                viewModel.updateVocabulary(
                                    editingVocab!!.copy(
                                        name = name.trim(),
                                        description = desc.trim().ifEmpty { null },
                                        category = category.trim().ifEmpty { "일반" }
                                    )
                                )
                            } else {
                                viewModel.createVocabulary(
                                    name = name.trim(),
                                    description = desc.trim().ifEmpty { null },
                                    category = category.trim().ifEmpty { "일반" }
                                ) {}
                            }
                            showCreateDialog = false
                            editingVocab = null
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = JunsukBlue),
                    enabled = name.isNotBlank()
                ) {
                    Text("저장")
                }
            },
            dismissButton = {
                TextButton(onClick = {
                    showCreateDialog = false
                    editingVocab = null
                }) {
                    Text("취소")
                }
            }
        )
    }
}

@Composable
fun VocabularyCardItem(
    item: VocabularyWithCount,
    onCardClick: () -> Unit,
    onStudyClick: () -> Unit,
    onQuizClick: () -> Unit,
    onBulkAddClick: () -> Unit,
    onEditClick: () -> Unit,
    onDeleteClick: () -> Unit
) {
    var menuExpanded by remember { mutableStateOf(false) }

    ElevatedCard(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.elevatedCardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onCardClick)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = JunsukBlue.copy(alpha = 0.12f)
                    ) {
                        Text(
                            text = item.vocabulary.category,
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = JunsukBlue,
                                fontWeight = FontWeight.Bold
                            ),
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "${item.wordCount}단어",
                        style = MaterialTheme.typography.labelMedium.copy(
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontWeight = FontWeight.Bold
                        )
                    )
                }

                Box {
                    IconButton(onClick = { menuExpanded = true }) {
                        Icon(Icons.Filled.MoreVert, contentDescription = "옵션 메뉴")
                    }
                    DropdownMenu(
                        expanded = menuExpanded,
                        onDismissRequest = { menuExpanded = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("단어 대량 등록") },
                            leadingIcon = { Icon(Icons.Filled.UploadFile, contentDescription = null) },
                            onClick = {
                                menuExpanded = false
                                onBulkAddClick()
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("수정") },
                            leadingIcon = { Icon(Icons.Filled.Edit, contentDescription = null) },
                            onClick = {
                                menuExpanded = false
                                onEditClick()
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("삭제", color = MaterialTheme.colorScheme.error) },
                            leadingIcon = { Icon(Icons.Filled.Delete, contentDescription = null, tint = MaterialTheme.colorScheme.error) },
                            onClick = {
                                menuExpanded = false
                                onDeleteClick()
                            }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = item.vocabulary.name,
                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                color = MaterialTheme.colorScheme.onSurface
            )

            if (!item.vocabulary.description.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = item.vocabulary.description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Button(
                    onClick = onStudyClick,
                    colors = ButtonDefaults.buttonColors(containerColor = JunsukBlue),
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Filled.PlayArrow, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("플래시카드")
                }

                OutlinedButton(
                    onClick = onQuizClick,
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Filled.Quiz, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("퀴즈")
                }
            }
        }
    }
}
