package com.example.amgijunsuk.ui.screens

import androidx.compose.animation.animateColorAsState
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
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedCard
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.amgijunsuk.data.model.WordEntity
import com.example.amgijunsuk.ui.MainViewModel
import com.example.amgijunsuk.ui.components.AppTopBar
import com.example.amgijunsuk.ui.navigation.Screen
import com.example.amgijunsuk.ui.theme.JunsukBlue
import com.example.amgijunsuk.ui.theme.JunsukGreen
import com.example.amgijunsuk.ui.theme.JunsukRed
import kotlinx.coroutines.delay

data class MatchingCard(
    val id: String,
    val wordId: String,
    val text: String,
    val isEnglish: Boolean,
    val isMatched: Boolean = false
)

@Composable
fun QuizMatchingScreen(
    vocabularyId: String,
    dynamic: Boolean,
    viewModel: MainViewModel,
    onNavigate: (String) -> Unit,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val wordsFlow = remember(vocabularyId) { viewModel.getWords(vocabularyId) }
    val allWords by wordsFlow.collectAsState(initial = emptyList())

    var cards by remember { mutableStateOf<List<MatchingCard>>(emptyList()) }
    var firstSelectedId by remember { mutableStateOf<String?>(null) }
    var secondSelectedId by remember { mutableStateOf<String?>(null) }
    var moveCount by remember { mutableIntStateOf(0) }
    var matchedCount by remember { mutableIntStateOf(0) }
    var startTime by remember { mutableStateOf(0L) }

    val totalPairs = 6.coerceAtMost(allWords.size)

    fun initializeCards() {
        if (allWords.size >= 2) {
            val selectedWords = allWords.shuffled().take(totalPairs)
            val cardList = mutableListOf<MatchingCard>()
            selectedWords.forEach { word ->
                cardList.add(
                    MatchingCard(
                        id = "en_${word.id}",
                        wordId = word.id,
                        text = word.word,
                        isEnglish = true
                    )
                )
                cardList.add(
                    MatchingCard(
                        id = "kr_${word.id}",
                        wordId = word.id,
                        text = word.meaning,
                        isEnglish = false
                    )
                )
            }
            cards = cardList.shuffled()
            firstSelectedId = null
            secondSelectedId = null
            moveCount = 0
            matchedCount = 0
            startTime = System.currentTimeMillis()
        }
    }

    LaunchedEffect(allWords) {
        if (allWords.isNotEmpty() && cards.isEmpty()) {
            initializeCards()
        }
    }

    // Handle matching logic when two cards are selected
    LaunchedEffect(firstSelectedId, secondSelectedId) {
        if (firstSelectedId != null && secondSelectedId != null) {
            val first = cards.find { it.id == firstSelectedId }
            val second = cards.find { it.id == secondSelectedId }

            if (first != null && second != null) {
                moveCount++
                if (first.wordId == second.wordId && first.isEnglish != second.isEnglish) {
                    // Match!
                    delay(300)
                    cards = cards.map {
                        if (it.id == first.id || it.id == second.id) it.copy(isMatched = true) else it
                    }
                    matchedCount++
                    firstSelectedId = null
                    secondSelectedId = null

                    if (first.isEnglish) viewModel.speakWord(first.text) else viewModel.speakWord(second.text)
                } else {
                    // Mismatch!
                    delay(800)
                    firstSelectedId = null
                    secondSelectedId = null
                }
            }
        }
    }

    val isAllMatched = matchedCount > 0 && matchedCount == totalPairs

    Scaffold(
        topBar = {
            AppTopBar(
                title = "단어 짝맞추기 게임",
                onBackClick = onBackClick,
                actions = {
                    IconButton(onClick = { initializeCards() }) {
                        Icon(Icons.Filled.Refresh, contentDescription = "다시 섞기")
                    }
                }
            )
        },
        modifier = modifier
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp)
                .background(MaterialTheme.colorScheme.background)
        ) {
            // Stats bar
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = JunsukGreen.copy(alpha = 0.12f)
                ) {
                    Text(
                        text = "완료: $matchedCount / $totalPairs",
                        style = MaterialTheme.typography.titleMedium.copy(
                            color = JunsukGreen,
                            fontWeight = FontWeight.Bold
                        ),
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                    )
                }

                Text(
                    text = "시도 횟수: ${moveCount}회",
                    style = MaterialTheme.typography.bodyMedium.copy(
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            if (!isAllMatched) {
                // Card Grid
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    items(cards) { card ->
                        val isSelected = card.id == firstSelectedId || card.id == secondSelectedId
                        val isMismatched = isSelected && firstSelectedId != null && secondSelectedId != null

                        val cardBgColor by animateColorAsState(
                            targetValue = when {
                                card.isMatched -> JunsukGreen.copy(alpha = 0.15f)
                                isMismatched -> JunsukRed.copy(alpha = 0.2f)
                                isSelected -> JunsukBlue.copy(alpha = 0.2f)
                                else -> MaterialTheme.colorScheme.surface
                            },
                            label = "matchCardBg"
                        )

                        val cardBorderColor = when {
                            card.isMatched -> JunsukGreen
                            isMismatched -> JunsukRed
                            isSelected -> JunsukBlue
                            else -> MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
                        }

                        OutlinedCard(
                            shape = RoundedCornerShape(14.dp),
                            border = CardDefaults.outlinedCardBorder(true).copy(
                                brush = androidx.compose.ui.graphics.SolidColor(cardBorderColor)
                            ),
                            colors = CardDefaults.outlinedCardColors(containerColor = cardBgColor),
                            modifier = Modifier
                                .height(90.dp)
                                .clickable(enabled = !card.isMatched && secondSelectedId == null && !isSelected) {
                                    if (firstSelectedId == null) {
                                        firstSelectedId = card.id
                                    } else if (secondSelectedId == null) {
                                        secondSelectedId = card.id
                                    }
                                }
                                .testTag("matching_card_${card.id}")
                        ) {
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(8.dp)
                            ) {
                                if (card.isMatched) {
                                    Icon(
                                        Icons.Filled.Check,
                                        contentDescription = "매칭 완료",
                                        tint = JunsukGreen,
                                        modifier = Modifier.size(24.dp)
                                    )
                                } else {
                                    Text(
                                        text = card.text,
                                        style = MaterialTheme.typography.titleMedium.copy(
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                            fontSize = if (card.isEnglish) 16.sp else 14.sp
                                        ),
                                        color = if (isSelected) JunsukBlue else MaterialTheme.colorScheme.onSurface,
                                        textAlign = TextAlign.Center
                                    )
                                }
                            }
                        }
                    }
                }
            } else {
                // Game Finished View
                ElevatedCard(
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.surface),
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp)
                    ) {
                        Text(
                            text = "🎉 매칭 완료!",
                            style = MaterialTheme.typography.displayLarge.copy(
                                fontSize = 32.sp,
                                fontWeight = FontWeight.Bold,
                                color = JunsukGreen
                            )
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "총 ${moveCount}번의 시도만에 모든 짝을 맞추셨습니다!",
                            style = MaterialTheme.typography.bodyLarge,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(24.dp))
                        Button(
                            onClick = { initializeCards() },
                            colors = ButtonDefaults.buttonColors(containerColor = JunsukBlue),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp)
                        ) {
                            Text("한 번 더 플레이하기")
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Button(
                            onClick = onBackClick,
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp)
                        ) {
                            Text("단어장으로 돌아가기", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }
}
