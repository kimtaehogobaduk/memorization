package com.example.amgijunsuk.ui.screens

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.TouchApp
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.amgijunsuk.data.model.WordEntity
import com.example.amgijunsuk.ui.MainViewModel
import com.example.amgijunsuk.ui.components.AppTopBar
import com.example.amgijunsuk.ui.components.JunsukMascot
import com.example.amgijunsuk.ui.components.JunsukMood
import com.example.amgijunsuk.ui.theme.JunsukBlue
import com.example.amgijunsuk.ui.theme.JunsukGreen
import com.example.amgijunsuk.ui.theme.JunsukRed
import com.example.amgijunsuk.ui.theme.JunsukYellow

enum class CardDisplayMode {
    WORD_FIRST,   // Front: English word -> Back: Korean meaning
    MEANING_FIRST,// Front: Korean meaning -> Back: English word
    BOTH,         // Both visible
    EXAMPLE_ONLY  // Front: Example with blank -> Back: Word
}

@Composable
fun StudyScreen(
    vocabularyId: String,
    viewModel: MainViewModel,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val wordsFlow = remember(vocabularyId) { viewModel.getWords(vocabularyId) }
    val words by wordsFlow.collectAsState(initial = emptyList())

    var currentIndex by remember { mutableIntStateOf(0) }
    var isFlipped by remember { mutableStateOf(false) }
    var displayMode by remember { mutableStateOf(CardDisplayMode.WORD_FIRST) }
    var knownCount by remember { mutableIntStateOf(0) }
    var unknownCount by remember { mutableIntStateOf(0) }
    var showCompletionDialog by remember { mutableStateOf(false) }

    val rotation by animateFloatAsState(
        targetValue = if (isFlipped) 180f else 0f,
        animationSpec = tween(durationMillis = 400),
        label = "cardFlip"
    )

    val currentWord: WordEntity? = if (words.isNotEmpty() && currentIndex < words.size) {
        words[currentIndex]
    } else null

    // Speak word on card change if in WORD_FIRST mode
    LaunchedEffect(currentIndex, displayMode) {
        isFlipped = false
        if (currentWord != null && displayMode == CardDisplayMode.WORD_FIRST) {
            viewModel.speakWord(currentWord.word)
        }
    }

    Scaffold(
        topBar = {
            AppTopBar(
                title = "플래시카드 학습",
                onBackClick = onBackClick,
                actions = {
                    IconButton(onClick = {
                        currentIndex = 0
                        knownCount = 0
                        unknownCount = 0
                        isFlipped = false
                    }) {
                        Icon(Icons.Filled.Refresh, contentDescription = "다시 시작")
                    }
                }
            )
        },
        modifier = modifier
    ) { paddingValues ->
        if (words.isEmpty()) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    JunsukMascot(
                        mood = JunsukMood.SURPRISED,
                        size = 80.dp,
                        speechBubbleText = "학습할 단어가 없어요!"
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(onClick = onBackClick) {
                        Text("단어장으로 돌아가기")
                    }
                }
            }
        } else {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp)
            ) {
                // Progress and score bar
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "${currentIndex + 1} / ${words.size}",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        color = MaterialTheme.colorScheme.onSurface
                    )

                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(
                            text = "알아요: $knownCount",
                            style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                            color = JunsukGreen
                        )
                        Text(
                            text = "모르겠어요: $unknownCount",
                            style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                            color = JunsukRed
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                LinearProgressIndicator(
                    progress = { ((currentIndex + 1).toFloat() / words.size.toFloat()).coerceIn(0f, 1f) },
                    color = JunsukBlue,
                    trackColor = MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .clip(RoundedCornerShape(3.dp))
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Display Mode Chips
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    FilterChip(
                        selected = displayMode == CardDisplayMode.WORD_FIRST,
                        onClick = { displayMode = CardDisplayMode.WORD_FIRST },
                        label = { Text("단어 먼저", fontSize = 12.sp) }
                    )
                    FilterChip(
                        selected = displayMode == CardDisplayMode.MEANING_FIRST,
                        onClick = { displayMode = CardDisplayMode.MEANING_FIRST },
                        label = { Text("뜻 먼저", fontSize = 12.sp) }
                    )
                    FilterChip(
                        selected = displayMode == CardDisplayMode.BOTH,
                        onClick = { displayMode = CardDisplayMode.BOTH },
                        label = { Text("동시 보기", fontSize = 12.sp) }
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Flip Card
                if (currentWord != null) {
                    ElevatedCard(
                        shape = RoundedCornerShape(24.dp),
                        colors = CardDefaults.elevatedCardColors(
                            containerColor = MaterialTheme.colorScheme.surface
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f)
                            .graphicsLayer {
                                rotationY = rotation
                                cameraDistance = 12f * density
                            }
                            .clickable {
                                isFlipped = !isFlipped
                            }
                            .testTag("flashcard")
                    ) {
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(24.dp)
                                .graphicsLayer {
                                    if (rotation > 90f) {
                                        rotationY = 180f
                                    }
                                }
                        ) {
                            val showingBack = rotation > 90f

                            if (!showingBack) {
                                // Front content
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.Center,
                                    modifier = Modifier.fillMaxSize()
                                ) {
                                    if (displayMode == CardDisplayMode.WORD_FIRST || displayMode == CardDisplayMode.BOTH) {
                                        Text(
                                            text = currentWord.word,
                                            style = MaterialTheme.typography.displayLarge.copy(
                                                fontSize = 32.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = MaterialTheme.colorScheme.onSurface
                                            ),
                                            textAlign = TextAlign.Center
                                        )

                                        Spacer(modifier = Modifier.height(12.dp))

                                        IconButton(
                                            onClick = { viewModel.speakWord(currentWord.word) },
                                            modifier = Modifier
                                                .size(48.dp)
                                                .clip(CircleShape)
                                                .background(JunsukBlue.copy(alpha = 0.15f))
                                        ) {
                                            Icon(
                                                Icons.Filled.VolumeUp,
                                                contentDescription = "발음 듣기",
                                                tint = JunsukBlue,
                                                modifier = Modifier.size(26.dp)
                                            )
                                        }

                                        if (displayMode == CardDisplayMode.BOTH) {
                                            Spacer(modifier = Modifier.height(16.dp))
                                            Text(
                                                text = currentWord.meaning,
                                                style = MaterialTheme.typography.headlineMedium.copy(
                                                    color = JunsukBlue,
                                                    fontSize = 22.sp
                                                ),
                                                textAlign = TextAlign.Center
                                            )
                                        }
                                    } else {
                                        // MEANING_FIRST
                                        Text(
                                            text = currentWord.meaning,
                                            style = MaterialTheme.typography.displayLarge.copy(
                                                fontSize = 28.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = MaterialTheme.colorScheme.onSurface
                                            ),
                                            textAlign = TextAlign.Center
                                        )
                                    }

                                    if (!currentWord.example.isNullOrBlank()) {
                                        Spacer(modifier = Modifier.height(20.dp))
                                        Surface(
                                            shape = RoundedCornerShape(12.dp),
                                            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
                                        ) {
                                            Text(
                                                text = currentWord.example,
                                                style = MaterialTheme.typography.bodyMedium.copy(
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                                ),
                                                textAlign = TextAlign.Center,
                                                modifier = Modifier.padding(12.dp)
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(24.dp))
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.Center
                                    ) {
                                        Icon(
                                            Icons.Filled.TouchApp,
                                            contentDescription = null,
                                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                                            modifier = Modifier.size(18.dp)
                                        )
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text(
                                            text = "탭하여 카드 뒤집기",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                                        )
                                    }
                                }
                            } else {
                                // Back content
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.Center,
                                    modifier = Modifier.fillMaxSize()
                                ) {
                                    if (displayMode == CardDisplayMode.WORD_FIRST) {
                                        Text(
                                            text = currentWord.meaning,
                                            style = MaterialTheme.typography.displayLarge.copy(
                                                fontSize = 28.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = JunsukBlue
                                            ),
                                            textAlign = TextAlign.Center
                                        )

                                        Spacer(modifier = Modifier.height(12.dp))
                                        Text(
                                            text = currentWord.word,
                                            style = MaterialTheme.typography.titleLarge.copy(
                                                color = MaterialTheme.colorScheme.onSurface
                                            ),
                                            textAlign = TextAlign.Center
                                        )
                                    } else {
                                        Text(
                                            text = currentWord.word,
                                            style = MaterialTheme.typography.displayLarge.copy(
                                                fontSize = 32.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = JunsukBlue
                                            ),
                                            textAlign = TextAlign.Center
                                        )
                                        Spacer(modifier = Modifier.height(8.dp))
                                        IconButton(
                                            onClick = { viewModel.speakWord(currentWord.word) }
                                        ) {
                                            Icon(Icons.Filled.VolumeUp, contentDescription = "발음 듣기", tint = JunsukBlue)
                                        }
                                    }

                                    if (!currentWord.example.isNullOrBlank()) {
                                        Spacer(modifier = Modifier.height(16.dp))
                                        Surface(
                                            shape = RoundedCornerShape(12.dp),
                                            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
                                        ) {
                                            Text(
                                                text = currentWord.example,
                                                style = MaterialTheme.typography.bodyMedium,
                                                textAlign = TextAlign.Center,
                                                modifier = Modifier.padding(12.dp)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Action Buttons: 모르겠어요 vs 알아요
                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Button(
                        onClick = {
                            unknownCount++
                            if (currentWord != null) {
                                viewModel.recordStudyProgress(currentWord.id, vocabularyId, isCorrect = false)
                            }
                            if (currentIndex < words.size - 1) {
                                currentIndex++
                            } else {
                                showCompletionDialog = true
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = JunsukRed),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier
                            .weight(1f)
                            .height(56.dp)
                            .testTag("button_unknown")
                    ) {
                        Icon(Icons.Filled.Close, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("모르겠어요", style = MaterialTheme.typography.titleMedium)
                    }

                    Button(
                        onClick = {
                            knownCount++
                            if (currentWord != null) {
                                viewModel.recordStudyProgress(currentWord.id, vocabularyId, isCorrect = true)
                            }
                            if (currentIndex < words.size - 1) {
                                currentIndex++
                            } else {
                                showCompletionDialog = true
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = JunsukGreen),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier
                            .weight(1f)
                            .height(56.dp)
                            .testTag("button_known")
                    ) {
                        Icon(Icons.Filled.Check, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("알아요", style = MaterialTheme.typography.titleMedium)
                    }
                }
            }
        }
    }

    // Completion Dialog
    if (showCompletionDialog) {
        AlertDialog(
            onDismissRequest = {
                showCompletionDialog = false
                onBackClick()
            },
            title = {
                Text("학습 완료!", fontWeight = FontWeight.Bold)
            },
            text = {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    JunsukMascot(
                        mood = JunsukMood.CHEERING,
                        size = 80.dp,
                        speechBubbleText = "수고하셨어요! 오늘 단어 암기 완료!"
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "총 ${words.size}개 단어 중\n알아요: ${knownCount}개 / 모르겠어요: ${unknownCount}개",
                        textAlign = TextAlign.Center,
                        style = MaterialTheme.typography.bodyLarge
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        showCompletionDialog = false
                        currentIndex = 0
                        knownCount = 0
                        unknownCount = 0
                        isFlipped = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = JunsukBlue)
                ) {
                    Text("다시 학습하기")
                }
            },
            dismissButton = {
                TextButton(onClick = {
                    showCompletionDialog = false
                    onBackClick()
                }) {
                    Text("단어장으로 돌아가기")
                }
            }
        )
    }
}
