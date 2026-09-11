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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
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

data class SentenceQuizQuestion(
    val word: WordEntity,
    val blankSentence: String,
    val meaning: String,
    val options: List<String>
)

@Composable
fun QuizSentenceScreen(
    vocabularyId: String,
    viewModel: MainViewModel,
    onNavigate: (String) -> Unit,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val wordsFlow = remember(vocabularyId) { viewModel.getWords(vocabularyId) }
    val allWords by wordsFlow.collectAsState(initial = emptyList())

    var questions by remember { mutableStateOf<List<SentenceQuizQuestion>>(emptyList()) }
    var currentIndex by remember { mutableIntStateOf(0) }
    var selectedOption by remember { mutableStateOf<String?>(null) }
    var isAnswered by remember { mutableStateOf(false) }
    var score by remember { mutableIntStateOf(0) }
    val incorrectWordIds = remember { mutableListOf<String>() }
    var startTime by remember { mutableStateOf(0L) }

    LaunchedEffect(allWords) {
        if (allWords.isNotEmpty() && questions.isEmpty()) {
            val wordsWithExample = allWords.filter { !it.example.isNullOrBlank() }
            val pool = if (wordsWithExample.size >= 4) wordsWithExample else allWords

            questions = pool.shuffled().take(10).map { targetWord ->
                val exampleText = targetWord.example ?: "The word [ ______ ] is important."
                val regex = Regex("(?i)\\b${Regex.escape(targetWord.word)}\\b")
                val blankSentence = if (regex.containsMatchIn(exampleText)) {
                    regex.replace(exampleText, "[ _______ ]")
                } else {
                    exampleText.replace(targetWord.word, "[ _______ ]", ignoreCase = true)
                }

                val otherWords = allWords.filter { it.id != targetWord.id }.shuffled()
                val wrongOptions = otherWords.take(3).map { it.word }
                val options = (wrongOptions + targetWord.word).shuffled()

                SentenceQuizQuestion(
                    word = targetWord,
                    blankSentence = blankSentence,
                    meaning = targetWord.meaning,
                    options = options
                )
            }
            startTime = System.currentTimeMillis()
        }
    }

    val currentQuestion = if (questions.isNotEmpty() && currentIndex < questions.size) questions[currentIndex] else null

    Scaffold(
        topBar = {
            AppTopBar(
                title = "예문 빈칸 채우기",
                onBackClick = onBackClick
            )
        },
        modifier = modifier
    ) { paddingValues ->
        if (questions.isEmpty()) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                Text("문제를 준비하는 중입니다...")
            }
        } else if (currentQuestion != null) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp)
                    .background(MaterialTheme.colorScheme.background)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "문제 ${currentIndex + 1} / ${questions.size}",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Color(0xFFF97316).copy(alpha = 0.12f)
                    ) {
                        Text(
                            text = "점수: $score",
                            style = MaterialTheme.typography.labelMedium.copy(
                                color = Color(0xFFF97316),
                                fontWeight = FontWeight.Bold
                            ),
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                LinearProgressIndicator(
                    progress = { ((currentIndex + 1).toFloat() / questions.size.toFloat()).coerceIn(0f, 1f) },
                    color = Color(0xFFF97316),
                    trackColor = MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .clip(RoundedCornerShape(3.dp))
                )

                Spacer(modifier = Modifier.height(16.dp))

                ElevatedCard(
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.surface),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp)
                    ) {
                        Text(
                            text = "문맥에 알맞은 단어를 선택하세요",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = currentQuestion.blankSentence,
                            style = MaterialTheme.typography.titleLarge.copy(
                                fontWeight = FontWeight.SemiBold,
                                lineHeight = 28.sp
                            ),
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant
                        ) {
                            Text(
                                text = "뜻: ${currentQuestion.meaning}",
                                style = MaterialTheme.typography.bodyMedium.copy(
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    fontWeight = FontWeight.Medium
                                ),
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    items(currentQuestion.options.size) { idx ->
                        val option = currentQuestion.options[idx]
                        val isSelected = selectedOption == option
                        val isCorrect = option == currentQuestion.word.word

                        val optBgColor by animateColorAsState(
                            targetValue = when {
                                !isAnswered -> MaterialTheme.colorScheme.surface
                                isCorrect -> JunsukGreen.copy(alpha = 0.18f)
                                isSelected && !isCorrect -> JunsukRed.copy(alpha = 0.18f)
                                else -> MaterialTheme.colorScheme.surface
                            },
                            label = "optBg"
                        )

                        OutlinedCard(
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.outlinedCardColors(containerColor = optBgColor),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable(enabled = !isAnswered) {
                                    selectedOption = option
                                    isAnswered = true
                                    val correct = option == currentQuestion.word.word
                                    if (correct) score += 10 else incorrectWordIds.add(currentQuestion.word.id)
                                    viewModel.recordStudyProgress(
                                        currentQuestion.word.id,
                                        vocabularyId,
                                        isCorrect = correct
                                    )
                                }
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(16.dp)
                            ) {
                                Text(
                                    text = option,
                                    style = MaterialTheme.typography.bodyLarge.copy(
                                        fontWeight = if (isSelected || (isAnswered && isCorrect)) FontWeight.Bold else FontWeight.Normal
                                    ),
                                    modifier = Modifier.weight(1f)
                                )
                                if (isAnswered) {
                                    if (isCorrect) {
                                        Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = JunsukGreen)
                                    } else if (isSelected) {
                                        Icon(Icons.Filled.Close, contentDescription = null, tint = JunsukRed)
                                    }
                                }
                            }
                        }
                    }
                }

                if (isAnswered) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(
                        onClick = {
                            if (currentIndex < questions.size - 1) {
                                currentIndex++
                                selectedOption = null
                                isAnswered = false
                            } else {
                                val durationSeconds = ((System.currentTimeMillis() - startTime) / 1000).toInt()
                                viewModel.recordQuizResult(
                                    vocabularyId = vocabularyId,
                                    vocabularyName = currentQuestion.word.word,
                                    quizType = "예문 빈칸 채우기",
                                    score = score,
                                    total = questions.size * 10,
                                    durationSeconds = durationSeconds
                                )
                                onNavigate(
                                    Screen.QuizResult.createRoute(
                                        vocabId = vocabularyId,
                                        score = score,
                                        total = questions.size * 10,
                                        time = durationSeconds,
                                        quizType = "예문 빈칸 퀴즈",
                                        incorrectIds = incorrectWordIds.joinToString(",")
                                    )
                                )
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = JunsukBlue),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp)
                    ) {
                        Text(
                            text = if (currentIndex < questions.size - 1) "다음 문제 >" else "결과 확인",
                            style = MaterialTheme.typography.titleMedium
                        )
                    }
                }
            }
        }
    }
}
