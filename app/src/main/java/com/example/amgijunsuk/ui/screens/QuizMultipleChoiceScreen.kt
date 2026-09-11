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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import com.example.amgijunsuk.ui.navigation.Screen
import com.example.amgijunsuk.ui.theme.JunsukBlue
import com.example.amgijunsuk.ui.theme.JunsukGreen
import com.example.amgijunsuk.ui.theme.JunsukRed
import kotlinx.coroutines.delay

data class QuizQuestion(
    val word: WordEntity,
    val questionText: String,
    val correctAnswer: String,
    val options: List<String>
)

@Composable
fun QuizMultipleChoiceScreen(
    vocabularyId: String,
    questionType: String,
    choiceCount: Int,
    isRandom: Boolean,
    questionCountLimit: Int,
    viewModel: MainViewModel,
    onNavigate: (String) -> Unit,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val wordsFlow = remember(vocabularyId) { viewModel.getWords(vocabularyId) }
    val allWords by wordsFlow.collectAsState(initial = emptyList())

    var questions by remember { mutableStateOf<List<QuizQuestion>>(emptyList()) }
    var currentIndex by remember { mutableIntStateOf(0) }
    var selectedOption by remember { mutableStateOf<String?>(null) }
    var isAnswered by remember { mutableStateOf(false) }
    var score by remember { mutableIntStateOf(0) }
    val incorrectWordIds = remember { mutableListOf<String>() }
    var startTime by remember { mutableStateOf(0L) }

    // Build question list once words are loaded
    LaunchedEffect(allWords) {
        if (allWords.isNotEmpty() && questions.isEmpty()) {
            val pool = if (isRandom) allWords.shuffled() else allWords
            val selectedWords = pool.take(questionCountLimit.coerceAtMost(allWords.size))

            questions = selectedWords.map { targetWord ->
                val isMeaningToWord = questionType == "meaning-to-word"
                val questionText = if (isMeaningToWord) targetWord.meaning else targetWord.word
                val correctAnswer = if (isMeaningToWord) targetWord.word else targetWord.meaning

                val otherWords = allWords.filter { it.id != targetWord.id }.shuffled()
                val wrongOptions = otherWords.take((choiceCount - 1).coerceAtMost(otherWords.size))
                    .map { if (isMeaningToWord) it.word else it.meaning }

                val options = (wrongOptions + correctAnswer).shuffled()
                QuizQuestion(
                    word = targetWord,
                    questionText = questionText,
                    correctAnswer = correctAnswer,
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
                title = "객관식 퀴즈",
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
                Text("문제를 준비하고 있습니다...")
            }
        } else if (currentQuestion != null) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp)
                    .background(MaterialTheme.colorScheme.background)
            ) {
                // Header progress & score
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
                        color = JunsukBlue.copy(alpha = 0.12f)
                    ) {
                        Text(
                            text = "현재 점수: $score",
                            style = MaterialTheme.typography.labelMedium.copy(
                                color = JunsukBlue,
                                fontWeight = FontWeight.Bold
                            ),
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                LinearProgressIndicator(
                    progress = { ((currentIndex + 1).toFloat() / questions.size.toFloat()).coerceIn(0f, 1f) },
                    color = JunsukBlue,
                    trackColor = MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .clip(RoundedCornerShape(3.dp))
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Question Card
                ElevatedCard(
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.surface),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp)
                    ) {
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            modifier = Modifier.padding(bottom = 8.dp)
                        ) {
                            Text(
                                text = if (questionType == "meaning-to-word") "다음 뜻에 알맞은 영어 단어는?" else "다음 단어의 올바른 한국어 뜻은?",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }

                        Text(
                            text = currentQuestion.questionText,
                            style = MaterialTheme.typography.displayLarge.copy(
                                fontSize = 28.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            ),
                            textAlign = TextAlign.Center
                        )

                        if (questionType != "meaning-to-word") {
                            Spacer(modifier = Modifier.height(8.dp))
                            IconButton(
                                onClick = { viewModel.speakWord(currentQuestion.word.word) }
                            ) {
                                Icon(
                                    Icons.Filled.VolumeUp,
                                    contentDescription = "발음 듣기",
                                    tint = JunsukBlue
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Options list
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    items(currentQuestion.options.size) { idx ->
                        val option = currentQuestion.options[idx]
                        val isSelected = selectedOption == option
                        val isCorrect = option == currentQuestion.correctAnswer

                        val optionBgColor by animateColorAsState(
                            targetValue = when {
                                !isAnswered -> MaterialTheme.colorScheme.surface
                                isCorrect -> JunsukGreen.copy(alpha = 0.18f)
                                isSelected && !isCorrect -> JunsukRed.copy(alpha = 0.18f)
                                else -> MaterialTheme.colorScheme.surface
                            },
                            label = "optBg"
                        )

                        val optionBorderColor = when {
                            !isAnswered -> if (isSelected) JunsukBlue else MaterialTheme.colorScheme.outline.copy(alpha = 0.4f)
                            isCorrect -> JunsukGreen
                            isSelected && !isCorrect -> JunsukRed
                            else -> MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
                        }

                        OutlinedCard(
                            shape = RoundedCornerShape(14.dp),
                            border = CardDefaults.outlinedCardBorder(true).copy(
                                brush = androidx.compose.ui.graphics.SolidColor(optionBorderColor)
                            ),
                            colors = CardDefaults.outlinedCardColors(containerColor = optionBgColor),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable(enabled = !isAnswered) {
                                    selectedOption = option
                                    isAnswered = true
                                    val correct = option == currentQuestion.correctAnswer
                                    if (correct) {
                                        score += 10
                                    } else {
                                        incorrectWordIds.add(currentQuestion.word.id)
                                    }
                                    viewModel.recordStudyProgress(
                                        currentQuestion.word.id,
                                        vocabularyId,
                                        isCorrect = correct
                                    )
                                }
                                .testTag("quiz_option_$idx")
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(16.dp)
                            ) {
                                Surface(
                                    shape = CircleShape,
                                    color = when {
                                        !isAnswered -> MaterialTheme.colorScheme.surfaceVariant
                                        isCorrect -> JunsukGreen
                                        isSelected && !isCorrect -> JunsukRed
                                        else -> MaterialTheme.colorScheme.surfaceVariant
                                    },
                                    modifier = Modifier.size(28.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Text(
                                            text = "${idx + 1}",
                                            style = MaterialTheme.typography.labelMedium.copy(
                                                fontWeight = FontWeight.Bold,
                                                color = if (isAnswered && (isCorrect || isSelected)) Color.White else MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.width(14.dp))

                                Text(
                                    text = option,
                                    style = MaterialTheme.typography.bodyLarge.copy(
                                        fontWeight = if (isSelected || (isAnswered && isCorrect)) FontWeight.Bold else FontWeight.Normal
                                    ),
                                    color = when {
                                        !isAnswered -> MaterialTheme.colorScheme.onSurface
                                        isCorrect -> JunsukGreen
                                        isSelected && !isCorrect -> JunsukRed
                                        else -> MaterialTheme.colorScheme.onSurface
                                    },
                                    modifier = Modifier.weight(1f)
                                )

                                if (isAnswered) {
                                    if (isCorrect) {
                                        Icon(
                                            Icons.Filled.CheckCircle,
                                            contentDescription = "정답",
                                            tint = JunsukGreen,
                                            modifier = Modifier.size(22.dp)
                                        )
                                    } else if (isSelected) {
                                        Icon(
                                            Icons.Filled.Close,
                                            contentDescription = "오답",
                                            tint = JunsukRed,
                                            modifier = Modifier.size(22.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // Next Button when answered
                if (isAnswered) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(
                        onClick = {
                            if (currentIndex < questions.size - 1) {
                                currentIndex++
                                selectedOption = null
                                isAnswered = false
                            } else {
                                // Finished!
                                val durationSeconds = ((System.currentTimeMillis() - startTime) / 1000).toInt()
                                viewModel.recordQuizResult(
                                    vocabularyId = vocabularyId,
                                    vocabularyName = currentQuestion.word.word,
                                    quizType = "객관식 4지선다",
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
                                        quizType = "객관식 퀴즈",
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
                            .testTag("button_next_question")
                    ) {
                        Text(
                            text = if (currentIndex < questions.size - 1) "다음 문제 >" else "결과 보기",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                        )
                    }
                }
            }
        }
    }
}
