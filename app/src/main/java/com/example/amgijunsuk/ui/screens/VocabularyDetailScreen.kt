package com.example.amgijunsuk.ui.screens

import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Quiz
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
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
import androidx.compose.ui.unit.sp
import com.example.amgijunsuk.data.model.WordEntity
import com.example.amgijunsuk.ui.MainViewModel
import com.example.amgijunsuk.ui.components.AppTopBar
import com.example.amgijunsuk.ui.components.JunsukMascot
import com.example.amgijunsuk.ui.components.JunsukMood
import com.example.amgijunsuk.ui.navigation.Screen
import com.example.amgijunsuk.ui.theme.JunsukBlue
import com.example.amgijunsuk.ui.theme.JunsukYellow

@Composable
fun VocabularyDetailScreen(
    vocabularyId: String,
    viewModel: MainViewModel,
    onNavigate: (String) -> Unit,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val vocabFlow = remember(vocabularyId) { viewModel.getVocabulary(vocabularyId) }
    val vocabulary by vocabFlow.collectAsState(initial = null)

    val wordsFlow = remember(vocabularyId) { viewModel.getWords(vocabularyId) }
    val words by wordsFlow.collectAsState(initial = emptyList())

    var wordSearchQuery by remember { mutableStateOf("") }
    var showAddWordDialog by remember { mutableStateOf(false) }
    var editingWord by remember { mutableStateOf<WordEntity?>(null) }

    val filteredWords = words.filter {
        it.word.contains(wordSearchQuery, ignoreCase = true) ||
                it.meaning.contains(wordSearchQuery, ignoreCase = true)
    }

    Scaffold(
        topBar = {
            AppTopBar(
                title = vocabulary?.name ?: "단어장 상세",
                onBackClick = onBackClick,
                actions = {
                    IconButton(onClick = { onNavigate(Screen.BulkAddWords.createRoute(vocabularyId)) }) {
                        Icon(Icons.Filled.UploadFile, contentDescription = "대량 단어 등록")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddWordDialog = true },
                containerColor = JunsukBlue,
                contentColor = MaterialTheme.colorScheme.onPrimary,
                modifier = Modifier
                    .padding(bottom = 72.dp)
                    .testTag("fab_add_word")
            ) {
                Icon(Icons.Filled.Add, contentDescription = "단어 추가")
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
            // Header summary card
            ElevatedCard(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.surface),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = JunsukBlue.copy(alpha = 0.12f)
                        ) {
                            Text(
                                text = vocabulary?.category ?: "일반",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    color = JunsukBlue,
                                    fontWeight = FontWeight.Bold
                                ),
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }

                        Text(
                            text = "총 ${words.size}단어",
                            style = MaterialTheme.typography.titleMedium.copy(
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.Bold
                            )
                        )
                    }

                    if (!vocabulary?.description.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = vocabulary!!.description!!,
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
                            onClick = { onNavigate(Screen.Study.createRoute(vocabularyId)) },
                            colors = ButtonDefaults.buttonColors(containerColor = JunsukBlue),
                            enabled = words.isNotEmpty(),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Filled.PlayArrow, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("플래시카드")
                        }

                        Button(
                            onClick = { onNavigate(Screen.QuizHub.createRoute(vocabularyId)) },
                            colors = ButtonDefaults.buttonColors(containerColor = JunsukYellow),
                            enabled = words.size >= 4,
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Filled.Quiz, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("퀴즈 시작")
                        }
                    }
                }
            }

            // Word Search field
            OutlinedTextField(
                value = wordSearchQuery,
                onValueChange = { wordSearchQuery = it },
                leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                placeholder = { Text("단어 또는 뜻 검색") },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp)
            )

            // Words list
            if (filteredWords.isEmpty()) {
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
                            speechBubbleText = if (words.isEmpty()) "등록된 단어가 없어요! 단어를 추가해볼까요?" else "검색 결과가 없어요!"
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(
                                onClick = { showAddWordDialog = true },
                                colors = ButtonDefaults.buttonColors(containerColor = JunsukBlue)
                            ) {
                                Icon(Icons.Filled.Add, contentDescription = null)
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("단어 추가")
                            }
                            OutlinedButton(
                                onClick = { onNavigate(Screen.BulkAddWords.createRoute(vocabularyId)) }
                            ) {
                                Icon(Icons.Filled.UploadFile, contentDescription = null)
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("대량 등록")
                            }
                        }
                    }
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 120.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(filteredWords) { word ->
                        ElevatedCard(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.elevatedCardColors(
                                containerColor = MaterialTheme.colorScheme.surface
                            ),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Text(
                                            text = word.word,
                                            style = MaterialTheme.typography.titleLarge.copy(
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 20.sp
                                            ),
                                            color = MaterialTheme.colorScheme.onSurface
                                        )

                                        Spacer(modifier = Modifier.width(6.dp))

                                        IconButton(
                                            onClick = { viewModel.speakWord(word.word) },
                                            modifier = Modifier.size(32.dp)
                                        ) {
                                            Icon(
                                                Icons.Filled.VolumeUp,
                                                contentDescription = "발음 듣기",
                                                tint = JunsukBlue,
                                                modifier = Modifier.size(20.dp)
                                            )
                                        }

                                        if (!word.partOfSpeech.isNullOrBlank()) {
                                            Surface(
                                                shape = RoundedCornerShape(4.dp),
                                                color = MaterialTheme.colorScheme.surfaceVariant,
                                                modifier = Modifier.padding(start = 4.dp)
                                            ) {
                                                Text(
                                                    text = word.partOfSpeech,
                                                    style = MaterialTheme.typography.labelSmall,
                                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                )
                                            }
                                        }
                                    }

                                    Row {
                                        IconButton(
                                            onClick = { editingWord = word },
                                            modifier = Modifier.size(32.dp)
                                        ) {
                                            Icon(Icons.Filled.Edit, contentDescription = "수정", modifier = Modifier.size(18.dp))
                                        }
                                        IconButton(
                                            onClick = { viewModel.deleteWord(word.id) },
                                            modifier = Modifier.size(32.dp)
                                        ) {
                                            Icon(
                                                Icons.Filled.Delete,
                                                contentDescription = "삭제",
                                                tint = MaterialTheme.colorScheme.error,
                                                modifier = Modifier.size(18.dp)
                                            )
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(4.dp))

                                Text(
                                    text = word.meaning,
                                    style = MaterialTheme.typography.bodyLarge.copy(
                                        color = MaterialTheme.colorScheme.onSurface,
                                        fontWeight = FontWeight.Medium
                                    )
                                )

                                if (!word.example.isNullOrBlank()) {
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Surface(
                                        shape = RoundedCornerShape(8.dp),
                                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Text(
                                            text = "예문: ${word.example}",
                                            style = MaterialTheme.typography.bodySmall.copy(
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            ),
                                            modifier = Modifier.padding(8.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Add / Edit Word Dialog
    if (showAddWordDialog || editingWord != null) {
        var wordText by remember(editingWord) { mutableStateOf(editingWord?.word ?: "") }
        var meaningText by remember(editingWord) { mutableStateOf(editingWord?.meaning ?: "") }
        var exampleText by remember(editingWord) { mutableStateOf(editingWord?.example ?: "") }
        var posText by remember(editingWord) { mutableStateOf(editingWord?.partOfSpeech ?: "") }

        AlertDialog(
            onDismissRequest = {
                showAddWordDialog = false
                editingWord = null
            },
            title = {
                Text(if (editingWord != null) "단어 수정" else "단어 추가", fontWeight = FontWeight.Bold)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = wordText,
                        onValueChange = { wordText = it },
                        label = { Text("영어 단어 *") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = meaningText,
                        onValueChange = { meaningText = it },
                        label = { Text("한국어 뜻 *") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = exampleText,
                        onValueChange = { exampleText = it },
                        label = { Text("예문 (선택)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = posText,
                        onValueChange = { posText = it },
                        label = { Text("품사 (선택, 예: 명사, 동사)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (wordText.isNotBlank() && meaningText.isNotBlank()) {
                            if (editingWord != null) {
                                viewModel.updateWord(
                                    editingWord!!.copy(
                                        word = wordText.trim(),
                                        meaning = meaningText.trim(),
                                        example = exampleText.trim().ifEmpty { null },
                                        partOfSpeech = posText.trim().ifEmpty { null }
                                    )
                                )
                            } else {
                                viewModel.addWord(
                                    vocabularyId = vocabularyId,
                                    word = wordText.trim(),
                                    meaning = meaningText.trim(),
                                    example = exampleText.trim().ifEmpty { null },
                                    partOfSpeech = posText.trim().ifEmpty { null }
                                )
                            }
                            showAddWordDialog = false
                            editingWord = null
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = JunsukBlue),
                    enabled = wordText.isNotBlank() && meaningText.isNotBlank()
                ) {
                    Text("저장")
                }
            },
            dismissButton = {
                TextButton(onClick = {
                    showAddWordDialog = false
                    editingWord = null
                }) {
                    Text("취소")
                }
            }
        )
    }
}
