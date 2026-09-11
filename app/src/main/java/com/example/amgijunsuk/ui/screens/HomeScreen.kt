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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CollectionsBookmark
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Quiz
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.amgijunsuk.ui.MainViewModel
import com.example.amgijunsuk.ui.components.JunsukMascot
import com.example.amgijunsuk.ui.components.JunsukMood
import com.example.amgijunsuk.ui.navigation.Screen
import com.example.amgijunsuk.ui.theme.HeroGradientEnd
import com.example.amgijunsuk.ui.theme.HeroGradientStart
import com.example.amgijunsuk.ui.theme.JunsukBlue
import com.example.amgijunsuk.ui.theme.JunsukGreen
import com.example.amgijunsuk.ui.theme.JunsukYellow

@Composable
fun HomeScreen(
    viewModel: MainViewModel,
    onNavigate: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val vocabularies by viewModel.vocabularies.collectAsState()
    val totalWords by viewModel.totalWordCount.collectAsState()
    val masteredWords by viewModel.masteredWordCount.collectAsState()

    LazyColumn(
        contentPadding = PaddingValues(bottom = 80.dp),
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Hero Header Banner
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(HeroGradientStart, HeroGradientEnd.copy(alpha = 0.6f))
                        )
                    )
                    .padding(20.dp)
            ) {
                Column {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = JunsukBlue.copy(alpha = 0.15f),
                                modifier = Modifier.padding(bottom = 6.dp)
                            ) {
                                Text(
                                    text = "준섹이와 함께하는 스마트 단어 암기",
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        color = JunsukBlue,
                                        fontWeight = FontWeight.Bold
                                    ),
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                            Text(
                                text = "암기준섹",
                                style = MaterialTheme.typography.displayLarge.copy(
                                    color = MaterialTheme.colorScheme.onSurface,
                                    fontSize = 28.sp
                                )
                            )
                            Text(
                                text = "오늘도 목표를 향해 한 걸음씩!",
                                style = MaterialTheme.typography.bodyMedium.copy(
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            )
                        }

                        JunsukMascot(
                            mood = JunsukMood.HAPPY,
                            size = 84.dp,
                            modifier = Modifier.padding(start = 8.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Quick Stat Badges
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        StatPill(
                            icon = Icons.Filled.CollectionsBookmark,
                            iconColor = JunsukBlue,
                            title = "총 등록 단어",
                            value = "${totalWords}개",
                            modifier = Modifier.weight(1f)
                        )
                        StatPill(
                            icon = Icons.Filled.AutoAwesome,
                            iconColor = JunsukGreen,
                            title = "암기 완료",
                            value = "${masteredWords}개",
                            modifier = Modifier.weight(1f)
                        )
                        StatPill(
                            icon = Icons.Filled.LocalFireDepartment,
                            iconColor = Color(0xFFF97316),
                            title = "연속 학습",
                            value = "3일째",
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }
        }

        // Quick Action Grid
        item {
            Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp)) {
                Text(
                    text = "빠른 시작",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    QuickActionCard(
                        title = "단어장 생성",
                        subtitle = "새 단어 목록 작성",
                        icon = Icons.Filled.Add,
                        containerColor = JunsukBlue,
                        modifier = Modifier.weight(1f)
                    ) {
                        onNavigate(Screen.CreateVocabulary.route)
                    }

                    QuickActionCard(
                        title = "스마트 퀴즈",
                        subtitle = "객관식 / 주관식 / 매칭",
                        icon = Icons.Filled.Quiz,
                        containerColor = JunsukYellow,
                        contentColor = Color(0xFF78350F),
                        modifier = Modifier.weight(1f)
                    ) {
                        if (vocabularies.isNotEmpty()) {
                            onNavigate(Screen.QuizHub.createRoute(vocabularies.first().vocabulary.id))
                        } else {
                            onNavigate(Screen.Vocabularies.route)
                        }
                    }
                }
            }
        }

        // Recent Vocabularies Section
        item {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 4.dp)
            ) {
                Text(
                    text = "내 단어장",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                    color = MaterialTheme.colorScheme.onSurface
                )

                Text(
                    text = "전체보기 >",
                    style = MaterialTheme.typography.labelMedium.copy(
                        color = JunsukBlue,
                        fontWeight = FontWeight.SemiBold
                    ),
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .clickable { onNavigate(Screen.Vocabularies.route) }
                        .padding(4.dp)
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
        }

        if (vocabularies.isEmpty()) {
            item {
                ElevatedCard(
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 8.dp)
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp)
                    ) {
                        JunsukMascot(
                            mood = JunsukMood.STUDYING,
                            size = 72.dp,
                            speechBubbleText = "아직 단어장이 없어요! 하나 만들어볼까요?"
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = { onNavigate(Screen.CreateVocabulary.route) },
                            colors = ButtonDefaults.buttonColors(containerColor = JunsukBlue)
                        ) {
                            Icon(imageVector = Icons.Filled.Add, contentDescription = null)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("첫 단어장 만들기")
                        }
                    }
                }
            }
        } else {
            items(vocabularies.take(4)) { item ->
                ElevatedCard(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.elevatedCardColors(
                        containerColor = MaterialTheme.colorScheme.surface
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 6.dp)
                        .clickable {
                            onNavigate(Screen.VocabularyDetail.createRoute(item.vocabulary.id))
                        }
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
                                    text = item.vocabulary.category,
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        color = JunsukBlue,
                                        fontWeight = FontWeight.Bold
                                    ),
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                )
                            }

                            Text(
                                text = "${item.wordCount}단어",
                                style = MaterialTheme.typography.labelMedium.copy(
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    fontWeight = FontWeight.Bold
                                )
                            )
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            text = item.vocabulary.name,
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                            color = MaterialTheme.colorScheme.onSurface
                        )

                        if (!item.vocabulary.description.isNullOrBlank()) {
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = item.vocabulary.description,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 2
                            )
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Button(
                                onClick = {
                                    onNavigate(Screen.Study.createRoute(item.vocabulary.id))
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = JunsukBlue),
                                modifier = Modifier
                                    .weight(1f)
                                    .testTag("study_button_${item.vocabulary.id}")
                            ) {
                                Icon(imageVector = Icons.Filled.PlayArrow, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("플래시카드")
                            }

                            OutlinedButton(
                                onClick = {
                                    onNavigate(Screen.QuizHub.createRoute(item.vocabulary.id))
                                },
                                modifier = Modifier
                                    .weight(1f)
                                    .testTag("quiz_button_${item.vocabulary.id}")
                            ) {
                                Icon(imageVector = Icons.Filled.Quiz, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("퀴즈 풀기")
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun StatPill(
    icon: ImageVector,
    iconColor: Color,
    title: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 2.dp,
        modifier = modifier
    ) {
        Column(
            modifier = Modifier.padding(10.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = iconColor,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = title,
                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 11.sp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                color = MaterialTheme.colorScheme.onSurface
            )
        }
    }
}

@Composable
fun QuickActionCard(
    title: String,
    subtitle: String,
    icon: ImageVector,
    containerColor: Color,
    contentColor: Color = Color.White,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = containerColor,
        shadowElevation = 3.dp,
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .clickable(onClick = onClick)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(38.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.25f))
            ) {
                Icon(imageVector = icon, contentDescription = null, tint = contentColor)
            }
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                color = contentColor
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = contentColor.copy(alpha = 0.85f)
            )
        }
    }
}
