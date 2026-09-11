package com.example.amgijunsuk.ui.components

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.amgijunsuk.R
import com.example.amgijunsuk.ui.theme.JunsukBlue
import com.example.amgijunsuk.ui.theme.JunsukYellow

enum class JunsukMood {
    HAPPY,
    STUDYING,
    SURPRISED,
    RELAXED,
    CHEERING
}

@Composable
fun JunsukMascot(
    mood: JunsukMood = JunsukMood.HAPPY,
    size: Dp = 90.dp,
    speechBubbleText: String? = null,
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "junsuk_bob")
    val bounceY by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = -6f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "bounce"
    )

    val drawableRes = when (mood) {
        JunsukMood.HAPPY -> R.drawable.junsuk_01
        JunsukMood.STUDYING -> R.drawable.junsuk_04
        JunsukMood.SURPRISED -> R.drawable.junsuk_08
        JunsukMood.RELAXED -> R.drawable.junsuk_19_2
        JunsukMood.CHEERING -> R.drawable.junsuk_30
    }

    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(size)
                .graphicsLayer { translationY = bounceY }
        ) {
            // Subtle glow backdrop
            Box(
                modifier = Modifier
                    .size(size * 0.85f)
                    .clip(CircleShape)
                    .background(
                        Brush.radialGradient(
                            colors = listOf(JunsukYellow.copy(alpha = 0.35f), Color.Transparent)
                        )
                    )
            )

            Image(
                painter = painterResource(id = drawableRes),
                contentDescription = "준섹이 마스코트",
                modifier = Modifier.size(size)
            )
        }

        if (speechBubbleText != null) {
            Spacer(modifier = Modifier.width(12.dp))
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.surface,
                shadowElevation = 4.dp,
                modifier = Modifier.padding(vertical = 4.dp)
            ) {
                Text(
                    text = speechBubbleText,
                    style = MaterialTheme.typography.bodyMedium.copy(
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface
                    ),
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
                )
            }
        }
    }
}
