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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
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
import com.example.amgijunsuk.ui.MainViewModel
import com.example.amgijunsuk.ui.components.AppTopBar
import com.example.amgijunsuk.ui.theme.JunsukBlue

@Composable
fun WordBulkAddScreen(
    vocabularyId: String,
    viewModel: MainViewModel,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    var rawInput by remember {
        mutableStateOf(
            "meticulous, 세심한, 꼼꼼한\n" +
            "mitigate, 완화하다, 경감하다\n" +
            "pragmatic, 실용적인, 실제적인\n" +
            "scrutinize, 세밀히 조사하다\n" +
            "lucid, 명료한, 이해하기 쉬운"
        )
    }
    var successCount by remember { mutableStateOf<Int?>(null) }

    Scaffold(
        topBar = {
            AppTopBar(
                title = "단어 대량 등록",
                onBackClick = onBackClick
            )
        },
        modifier = modifier
    ) { paddingValues ->
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(MaterialTheme.colorScheme.background)
        ) {
            // Guide Card
            item {
                ElevatedCard(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.Info, contentDescription = null, tint = JunsukBlue)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "대량 등록 형식 안내",
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "엑셀이나 텍스트에서 복사한 단어를 아래에 붙여넣으세요.\n" +
                                    "줄마다 다음 형식 중 하나를 지원합니다:\n" +
                                    "• 단어, 뜻, 예문 (쉼표 구분)\n" +
                                    "• 단어 [탭] 뜻 (엑셀 복사/붙여넣기)\n" +
                                    "• 단어 - 뜻 또는 단어 : 뜻",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            lineHeight = 18.sp
                        )
                    }
                }
            }

            // Text input area
            item {
                OutlinedTextField(
                    value = rawInput,
                    onValueChange = { rawInput = it },
                    label = { Text("단어 목록 입력") },
                    placeholder = { Text("단어, 뜻, 예문 (줄바꿈으로 구분)") },
                    shape = RoundedCornerShape(12.dp),
                    minLines = 8,
                    maxLines = 15,
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("bulk_input_field")
                )
            }

            // Success feedback
            if (successCount != null) {
                item {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFF10B981).copy(alpha = 0.15f),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "✅ ${successCount}개의 단어가 성공적으로 등록되었습니다!",
                            style = MaterialTheme.typography.bodyMedium.copy(
                                color = Color(0xFF047857),
                                fontWeight = FontWeight.Bold
                            ),
                            modifier = Modifier.padding(16.dp)
                        )
                    }
                }
            }

            // Action button
            item {
                Button(
                    onClick = {
                        viewModel.bulkAddWords(vocabularyId, rawInput) { count ->
                            successCount = count
                            rawInput = ""
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = JunsukBlue),
                    shape = RoundedCornerShape(14.dp),
                    enabled = rawInput.isNotBlank(),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp)
                        .testTag("button_submit_bulk")
                ) {
                    Icon(Icons.Filled.UploadFile, contentDescription = null)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("단어 일괄 등록하기", style = MaterialTheme.typography.titleMedium)
                }
            }
        }
    }
}
