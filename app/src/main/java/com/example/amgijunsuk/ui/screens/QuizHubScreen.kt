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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DashboardCustomize
import androidx.compose.material.icons.filled.EditNote
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Quiz
import androidx.compose.material.icons.filled.ShortText
import androidx.compose.material.icons.filled.Style
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.amgijunsuk.ui.MainViewModel
import com.example.amgijunsuk.ui.components.AppTopBar
import com.example.amgijunsuk.ui.components.JunsukMascot
import com.example.amgijunsuk.ui.components.JunsukMood
import com.example.amgijunsuk.ui.navigation.Screen
import com.example.amgijunsuk.ui.theme.JunsukBlue
import com.example.amgijunsuk.ui.theme.JunsukGreen
import com.example.amgijunsuk.ui.theme.JunsukYellow

enum class QuizMode(val title: String, val desc: String, val icon: ImageVector, val color: Color) {
    MULTIPLE_CHOICE("객관식 퀴즈", "보기를 보고 정답을 고르는 4지/5지 선다형 퀴즈", Icons.Filled.Quiz, JunsukBlue),
    WRITING("주관식 쓰기", "뜻을 보고 정확한 스펠링을 직접 입력하는 퀴즈", Icons.Filled.EditNote, Color(0xFF8B5CF6)),
    MATCHING("단어 짝맞추기", "영어 단어와 한국어 뜻 카드를 탭하여 짝을 맞추는 게임", Icons.Filled.Style, JunsukGreen),
    SENTENCE("예문 빈칸 채우기", "실제 문맥 속 빈칸에 들어갈 올바른 단어 선택", Icons.Filled.ShortText, Color(0xFFF97316))
}

@Composable
fun QuizHubScreen(
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

    var selectedMode by remember { mutableStateOf(QuizMode.MULTIPLE_CHOICE) }
    var questionCount by remember { mutableIntStateOf(10) }
    var choiceCount by remember { mutableIntStateOf(4) }
    var isRandom by remember { mutableStateOf(true) }
    var questionType by remember { mutableStateOf("meaning-to-word") } // or "word-to-meaning"

    Scaffold(
        topBar = {
            AppTopBar(
                title = "퀴즈 설정 & 시작",
                onBackClick = onBackClick
            )
        },
        modifier = modifier
    ) { paddingValues ->
        LazyColumn(
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 100.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(MaterialTheme.colorScheme.background)
        ) {
            // Header banner
            item {
                ElevatedCard(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = vocabulary?.name ?: "단어장",
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "총 ${words.size}단어 등록됨",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        JunsukMascot(
                            mood = JunsukMood.STUDYING,
                            size = 64.dp
                        )
                    }
                }
            }

            // Mode Selection
            item {
                Text(
                    text = "퀴즈 유형 선택",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(8.dp))

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    QuizMode.values().forEach { mode ->
                        val isSelected = selectedMode == mode
                        OutlinedCard(
                            shape = RoundedCornerShape(12.dp),
                            border = CardDefaults.outlinedCardBorder(isSelected),
                            colors = CardDefaults.outlinedCardColors(
                                containerColor = if (isSelected) mode.color.copy(alpha = 0.08f) else MaterialTheme.colorScheme.surface
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { selectedMode = mode }
                                .testTag("mode_${mode.name}")
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(14.dp)
                            ) {
                                Box(
                                    contentAlignment = Alignment.Center,
                                    modifier = Modifier
                                        .size(42.dp)
                                        .clip(CircleShape)
                                        .background(mode.color.copy(alpha = if (isSelected) 1f else 0.15f))
                                ) {
                                    Icon(
                                        imageVector = mode.icon,
                                        contentDescription = null,
                                        tint = if (isSelected) Color.White else mode.color
                                    )
                                }

                                Spacer(modifier = Modifier.width(14.dp))

                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = mode.title,
                                        style = MaterialTheme.typography.titleMedium.copy(
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                                        ),
                                        color = if (isSelected) mode.color else MaterialTheme.colorScheme.onSurface
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = mode.desc,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Detailed Settings
            item {
                ElevatedCard(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                        modifier = Modifier.padding(16.dp)
                    ) {
                        Text(
                            text = "세부 옵션",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                            color = MaterialTheme.colorScheme.onSurface
                        )

                        // Question Count
                        Column {
                            Text(
                                text = "문제 수",
                                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium),
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                listOf(5, 10, 20, words.size.coerceAtLeast(1)).distinct().forEach { count ->
                                    FilterChip(
                                        selected = questionCount == count,
                                        onClick = { questionCount = count },
                                        label = { Text(if (count == words.size) "전체 (${count}개)" else "${count}개") }
                                    )
                                }
                            }
                        }

                        // Question Direction (단어 보고 뜻 or 뜻 보고 단어)
                        if (selectedMode != QuizMode.MATCHING) {
                            Column {
                                Text(
                                    text = "출제 방식",
                                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium),
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    FilterChip(
                                        selected = questionType == "meaning-to-word",
                                        onClick = { questionType = "meaning-to-word" },
                                        label = { Text("뜻 보고 단어 맞추기") }
                                    )
                                    FilterChip(
                                        selected = questionType == "word-to-meaning",
                                        onClick = { questionType = "word-to-meaning" },
                                        label = { Text("단어 보고 뜻 맞추기") }
                                    )
                                }
                            }
                        }

                        // Multiple Choice Option Count
                        if (selectedMode == QuizMode.MULTIPLE_CHOICE) {
                            Column {
                                Text(
                                    text = "보기 개수",
                                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium),
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    FilterChip(
                                        selected = choiceCount == 4,
                                        onClick = { choiceCount = 4 },
                                        label = { Text("4지선다") }
                                    )
                                    FilterChip(
                                        selected = choiceCount == 5,
                                        onClick = { choiceCount = 5 },
                                        label = { Text("5지선다") }
                                    )
                                }
                            }
                        }

                        // Random Order Switch
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column {
                                Text(
                                    text = "무작위 순서",
                                    style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.Medium),
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    text = "단어 순서를 섞어서 출제합니다",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }

                            Switch(
                                checked = isRandom,
                                onCheckedChange = { isRandom = it },
                                colors = SwitchDefaults.colors(checkedThumbColor = JunsukBlue)
                            )
                        }
                    }
                }
            }

            // Start Quiz Button
            item {
                Button(
                    onClick = {
                        val count = questionCount.coerceAtMost(words.size.coerceAtLeast(1))
                        when (selectedMode) {
                            QuizMode.MULTIPLE_CHOICE -> {
                                onNavigate(
                                    Screen.QuizMultiple.createRoute(
                                        id = vocabularyId,
                                        questionType = questionType,
                                        choiceCount = choiceCount,
                                        isRandom = isRandom,
                                        count = count
                                    )
                                )
                            }
                            QuizMode.WRITING -> {
                                onNavigate(
                                    Screen.QuizWriting.createRoute(
                                        id = vocabularyId,
                                        questionType = questionType,
                                        isRandom = isRandom,
                                        count = count
                                    )
                                )
                            }
                            QuizMode.MATCHING -> {
                                onNavigate(Screen.QuizMatching.createRoute(vocabularyId, false))
                            }
                            QuizMode.SENTENCE -> {
                                onNavigate(Screen.QuizSentence.createRoute(vocabularyId))
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = selectedMode.color),
                    shape = RoundedCornerShape(16.dp),
                    enabled = words.size >= 2,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp)
                        .testTag("button_start_quiz")
                ) {
                    Icon(Icons.Filled.PlayArrow, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "${selectedMode.title} 시작하기",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                    )
                }
            }
        }
    }
}
