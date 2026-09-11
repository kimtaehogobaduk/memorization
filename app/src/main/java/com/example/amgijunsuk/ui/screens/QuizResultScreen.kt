package com.example.amgijunsuk.ui.screens

import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.amgijunsuk.ui.MainViewModel
import com.example.amgijunsuk.ui.components.AppTopBar
import com.example.amgijunsuk.ui.components.JunsukMascot
import com.example.amgijunsuk.ui.components.JunsukMood
import com.example.amgijunsuk.ui.navigation.Screen
import com.example.amgijunsuk.ui.theme.HeroGradientEnd
import com.example.amgijunsuk.ui.theme.HeroGradientStart
import com.example.amgijunsuk.ui.theme.JunsukBlue
import com.example.amgijunsuk.ui.theme.JunsukGreen
import com.example.amgijunsuk.ui.theme.JunsukRed
import com.example.amgijunsuk.ui.theme.JunsukYellow

@Composable
fun QuizResultScreen(
    vocabularyId: String,
    score: Int,
    total: Int,
    durationSeconds: Int,
    quizType: String,
    incorrectIds: String,
    viewModel: MainViewModel,
    onNavigate: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val wordsFlow = remember(vocabularyId) { viewModel.getWords(vocabularyId) }
    val allWords by wordsFlow.collectAsState(initial = emptyList())

    val incorrectIdSet = remember(incorrectIds) {
        incorrectIds.split(",").filter { it.isNotBlank() }.toSet()
    }
    val incorrectWords = allWords.filter { incorrectIdSet.contains(it.id) }

    val percentage = if (total > 0) ((score.toFloat() / total.toFloat()) * 100).toInt() else 0

    val mascotMood = when {
        percentage >= 90 -> JunsukMood.CHEERING
        percentage >= 60 -> JunsukMood.HAPPY
        else -> JunsukMood.STUDYING
    }

    val cheerMessage = when {
        percentage >= 90 -> "완벽해요! 단어를 거의 다 마스터하셨네요!"
        percentage >= 70 -> "훌륭합니다! 조금만 더 복습하면 완벽해요!"
        else -> "괜찮아요! 틀린 단어를 다시 확인하고 도전해봐요!"
    }

    Scaffold(
        topBar = {
            AppTopBar(
                title = "퀴즈 결과"
            )
        },
        modifier = modifier
    ) { paddingValues ->
        LazyColumn(
            contentPadding = androidx.compose.foundation.layout.PaddingValues(
                start = 16.dp, end = 16.dp, top = 16.dp, bottom = 80.dp
            ),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(MaterialTheme.colorScheme.background)
        ) {
            // Score Banner
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(24.dp))
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(HeroGradientStart, HeroGradientEnd)
                            )
                        )
                        .padding(24.dp)
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        JunsukMascot(
                            mood = mascotMood,
                            size = 90.dp,
                            speechBubbleText = cheerMessage
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        Text(
                            text = "$percentage점",
                            style = MaterialTheme.typography.displayLarge.copy(
                                fontSize = 48.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = if (percentage >= 70) JunsukGreen else JunsukRed
                            )
                        )

                        Text(
                            text = "총점: $score / $total ($quizType)",
                            style = MaterialTheme.typography.bodyMedium.copy(
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        // Stats Grid
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = MaterialTheme.colorScheme.surface,
                                modifier = Modifier.weight(1f)
                            ) {
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    modifier = Modifier.padding(12.dp)
                                ) {
                                    Text("걸린 시간", style = MaterialTheme.typography.labelSmall)
                                    Text(
                                        text = "${durationSeconds}초",
                                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                                    )
                                }
                            }

                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = MaterialTheme.colorScheme.surface,
                                modifier = Modifier.weight(1f)
                            ) {
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    modifier = Modifier.padding(12.dp)
                                ) {
                                    Text("오답 수", style = MaterialTheme.typography.labelSmall)
                                    Text(
                                        text = "${incorrectWords.size}개",
                                        style = MaterialTheme.typography.titleMedium.copy(
                                            fontWeight = FontWeight.Bold,
                                            color = if (incorrectWords.isEmpty()) JunsukGreen else JunsukRed
                                        )
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Incorrect words review section
            if (incorrectWords.isNotEmpty()) {
                item {
                    Text(
                        text = "오답 단어 집중 복습 (${incorrectWords.size}개)",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = JunsukRed
                        )
                    )
                }

                items(incorrectWords) { word ->
                    ElevatedCard(
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.surface),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(14.dp)
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = word.word,
                                    style = MaterialTheme.typography.titleMedium.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = word.meaning,
                                    style = MaterialTheme.typography.bodyMedium.copy(
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                )
                                if (!word.example.isNullOrBlank()) {
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = word.example,
                                        style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFF64748B))
                                    )
                                }
                            }

                            IconButton(onClick = { viewModel.speakWord(word.word) }) {
                                Icon(Icons.Filled.VolumeUp, contentDescription = "발음", tint = JunsukBlue)
                            }
                        }
                    }
                }
            }

            // Action Buttons
            item {
                Spacer(modifier = Modifier.height(8.dp))
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Button(
                        onClick = {
                            onNavigate(Screen.QuizHub.createRoute(vocabularyId))
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = JunsukBlue),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp)
                            .testTag("button_retry_quiz")
                    ) {
                        Icon(Icons.Filled.Refresh, contentDescription = null)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("퀴즈 다시 풀기", style = MaterialTheme.typography.titleMedium)
                    }

                    OutlinedButton(
                        onClick = {
                            onNavigate(Screen.VocabularyDetail.createRoute(vocabularyId))
                        },
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp)
                    ) {
                        Text("단어장으로 돌아가기", style = MaterialTheme.typography.titleMedium)
                    }

                    OutlinedButton(
                        onClick = {
                            onNavigate(Screen.Home.route)
                        },
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp)
                    ) {
                        Icon(Icons.Filled.Home, contentDescription = null)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("홈으로 이동")
                    }
                }
            }
        }
    }
}
