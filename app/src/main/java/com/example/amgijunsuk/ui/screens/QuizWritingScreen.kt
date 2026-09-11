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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
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

@Composable
fun QuizWritingScreen(
    vocabularyId: String,
    questionType: String,
    isRandom: Boolean,
    questionCountLimit: Int,
    viewModel: MainViewModel,
    onNavigate: (String) -> Unit,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val wordsFlow = remember(vocabularyId) { viewModel.getWords(vocabularyId) }
    val allWords by wordsFlow.collectAsState(initial = emptyList())

    var questionWords by remember { mutableStateOf<List<WordEntity>>(emptyList()) }
    var currentIndex by remember { mutableIntStateOf(0) }
    var userInput by remember { mutableStateOf("") }
    var isSubmitted by remember { mutableStateOf(false) }
    var isCorrect by remember { mutableStateOf(false) }
    var showHint by remember { mutableStateOf(false) }
    var score by remember { mutableIntStateOf(0) }
    val incorrectWordIds = remember { mutableListOf<String>() }
    var startTime by remember { mutableStateOf(0L) }

    LaunchedEffect(allWords) {
        if (allWords.isNotEmpty() && questionWords.isEmpty()) {
            val pool = if (isRandom) allWords.shuffled() else allWords
            questionWords = pool.take(questionCountLimit.coerceAtMost(allWords.size))
            startTime = System.currentTimeMillis()
        }
    }

    val currentWord = if (questionWords.isNotEmpty() && currentIndex < questionWords.size) {
        questionWords[currentIndex]
    } else null

    fun checkAnswer() {
        if (currentWord == null || isSubmitted) return
        val expected = currentWord.word.trim().lowercase()
        val actual = userInput.trim().lowercase()
        val correct = expected == actual
        isCorrect = correct
        isSubmitted = true
        if (correct) {
            score += 10
        } else {
            incorrectWordIds.add(currentWord.id)
        }
        viewModel.recordStudyProgress(currentWord.id, vocabularyId, isCorrect = correct)
        viewModel.speakWord(currentWord.word)
    }

    Scaffold(
        topBar = {
            AppTopBar(
                title = "주관식 단어 쓰기",
                onBackClick = onBackClick
            )
        },
        modifier = modifier
    ) { paddingValues ->
        if (questionWords.isEmpty()) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                Text("단어를 불러오는 중입니다...")
            }
        } else if (currentWord != null) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp)
                    .background(MaterialTheme.colorScheme.background)
            ) {
                // Header
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "문제 ${currentIndex + 1} / ${questionWords.size}",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Color(0xFF8B5CF6).copy(alpha = 0.12f)
                    ) {
                        Text(
                            text = "점수: $score",
                            style = MaterialTheme.typography.labelMedium.copy(
                                color = Color(0xFF8B5CF6),
                                fontWeight = FontWeight.Bold
                            ),
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                LinearProgressIndicator(
                    progress = { ((currentIndex + 1).toFloat() / questionWords.size.toFloat()).coerceIn(0f, 1f) },
                    color = Color(0xFF8B5CF6),
                    trackColor = MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .clip(RoundedCornerShape(3.dp))
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Prompt Card
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
                            color = MaterialTheme.colorScheme.surfaceVariant
                        ) {
                            Text(
                                text = "다음 뜻에 알맞은 영어 스펠링을 입력하세요",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        Text(
                            text = currentWord.meaning,
                            style = MaterialTheme.typography.displayLarge.copy(
                                fontSize = 26.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            ),
                            textAlign = TextAlign.Center
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        // Hint display
                        val hintPattern = if (showHint) {
                            val firstChar = currentWord.word.take(1)
                            val blanks = " _".repeat(currentWord.word.length - 1)
                            "$firstChar$blanks (${currentWord.word.length}글자)"
                        } else {
                            "글자 수: ${currentWord.word.length}글자"
                        }

                        Text(
                            text = hintPattern,
                            style = MaterialTheme.typography.bodyMedium.copy(
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                letterSpacing = 2.sp
                            )
                        )

                        if (!showHint && !isSubmitted) {
                            TextButton(onClick = { showHint = true }) {
                                Icon(Icons.Filled.Lightbulb, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("첫 글자 힌트 보기")
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Input Field
                OutlinedTextField(
                    value = userInput,
                    onValueChange = { if (!isSubmitted) userInput = it },
                    placeholder = { Text("영어 단어 입력...") },
                    singleLine = true,
                    enabled = !isSubmitted,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { checkAnswer() }),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("writing_input")
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Feedback panel if submitted
                if (isSubmitted) {
                    ElevatedCard(
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.elevatedCardColors(
                            containerColor = if (isCorrect) JunsukGreen.copy(alpha = 0.12f) else JunsukRed.copy(alpha = 0.12f)
                        ),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(16.dp)
                        ) {
                            Icon(
                                imageVector = if (isCorrect) Icons.Filled.CheckCircle else Icons.Filled.Close,
                                contentDescription = null,
                                tint = if (isCorrect) JunsukGreen else JunsukRed,
                                modifier = Modifier.size(28.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = if (isCorrect) "정답입니다!" else "오답입니다",
                                    style = MaterialTheme.typography.titleMedium.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = if (isCorrect) JunsukGreen else JunsukRed
                                    )
                                )
                                Text(
                                    text = "정답: ${currentWord.word}",
                                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                            }
                            IconButton(onClick = { viewModel.speakWord(currentWord.word) }) {
                                Icon(Icons.Filled.VolumeUp, contentDescription = "발음", tint = JunsukBlue)
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.weight(1f))

                // Bottom Action Button
                if (!isSubmitted) {
                    Button(
                        onClick = { checkAnswer() },
                        enabled = userInput.isNotBlank(),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF8B5CF6)),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp)
                            .testTag("button_submit_writing")
                    ) {
                        Text("정답 확인", style = MaterialTheme.typography.titleMedium)
                    }
                } else {
                    Button(
                        onClick = {
                            if (currentIndex < questionWords.size - 1) {
                                currentIndex++
                                userInput = ""
                                isSubmitted = false
                                isCorrect = false
                                showHint = false
                            } else {
                                val durationSeconds = ((System.currentTimeMillis() - startTime) / 1000).toInt()
                                viewModel.recordQuizResult(
                                    vocabularyId = vocabularyId,
                                    vocabularyName = currentWord.word,
                                    quizType = "주관식 스펠링 쓰기",
                                    score = score,
                                    total = questionWords.size * 10,
                                    durationSeconds = durationSeconds
                                )
                                onNavigate(
                                    Screen.QuizResult.createRoute(
                                        vocabId = vocabularyId,
                                        score = score,
                                        total = questionWords.size * 10,
                                        time = durationSeconds,
                                        quizType = "주관식 쓰기 퀴즈",
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
                            text = if (currentIndex < questionWords.size - 1) "다음 문제 >" else "결과 확인",
                            style = MaterialTheme.typography.titleMedium
                        )
                    }
                }
            }
        }
    }
}
