package com.example.amgijunsuk

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.example.amgijunsuk.ui.MainViewModel
import com.example.amgijunsuk.ui.components.BottomNavigationBar
import com.example.amgijunsuk.ui.navigation.Screen
import com.example.amgijunsuk.ui.screens.GroupsScreen
import com.example.amgijunsuk.ui.screens.HomeScreen
import com.example.amgijunsuk.ui.screens.PublicVocabulariesScreen
import com.example.amgijunsuk.ui.screens.QuizHubScreen
import com.example.amgijunsuk.ui.screens.QuizMatchingScreen
import com.example.amgijunsuk.ui.screens.QuizMultipleChoiceScreen
import com.example.amgijunsuk.ui.screens.QuizResultScreen
import com.example.amgijunsuk.ui.screens.QuizSentenceScreen
import com.example.amgijunsuk.ui.screens.QuizWritingScreen
import com.example.amgijunsuk.ui.screens.SettingsScreen
import com.example.amgijunsuk.ui.screens.StatisticsScreen
import com.example.amgijunsuk.ui.screens.StudyScreen
import com.example.amgijunsuk.ui.screens.VocabularyDetailScreen
import com.example.amgijunsuk.ui.screens.VocabularyListScreen
import com.example.amgijunsuk.ui.screens.WordBulkAddScreen
import com.example.amgijunsuk.ui.theme.AmgiJunsukTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            AmgiJunsukTheme {
                MainApp()
            }
        }
    }
}

@Composable
fun MainApp() {
    val navController = rememberNavController()
    val viewModel: MainViewModel = viewModel()

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    // Show bottom bar on primary top-level tabs
    val isBottomBarVisible = when (currentRoute) {
        Screen.Home.route,
        Screen.Vocabularies.route,
        Screen.PublicVocabularies.route,
        Screen.Groups.route,
        Screen.Statistics.route,
        Screen.Settings.route -> true
        else -> false
    }

    Scaffold(
        bottomBar = {
            if (isBottomBarVisible) {
                BottomNavigationBar(
                    currentRoute = currentRoute,
                    onNavigate = { screen ->
                        navController.navigate(screen.route) {
                            popUpTo(Screen.Home.route) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
            }
        },
        modifier = Modifier.fillMaxSize()
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Home.route,
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = innerPadding.calculateBottomPadding())
        ) {
            composable(Screen.Home.route) {
                HomeScreen(
                    viewModel = viewModel,
                    onNavigate = { route -> navController.navigate(route) }
                )
            }

            composable(Screen.Vocabularies.route) {
                VocabularyListScreen(
                    viewModel = viewModel,
                    onNavigate = { route -> navController.navigate(route) }
                )
            }

            composable(
                route = Screen.VocabularyDetail.route,
                arguments = listOf(navArgument("vocabularyId") { type = NavType.StringType })
            ) { backStackEntry ->
                val vocabId = backStackEntry.arguments?.getString("vocabularyId") ?: ""
                VocabularyDetailScreen(
                    vocabularyId = vocabId,
                    viewModel = viewModel,
                    onNavigate = { route -> navController.navigate(route) },
                    onBackClick = { navController.popBackStack() }
                )
            }

            composable(
                route = Screen.Study.route,
                arguments = listOf(navArgument("vocabularyId") { type = NavType.StringType })
            ) { backStackEntry ->
                val vocabId = backStackEntry.arguments?.getString("vocabularyId") ?: ""
                StudyScreen(
                    vocabularyId = vocabId,
                    viewModel = viewModel,
                    onBackClick = { navController.popBackStack() }
                )
            }

            composable(
                route = Screen.QuizHub.route,
                arguments = listOf(navArgument("vocabularyId") { type = NavType.StringType })
            ) { backStackEntry ->
                val vocabId = backStackEntry.arguments?.getString("vocabularyId") ?: ""
                QuizHubScreen(
                    vocabularyId = vocabId,
                    viewModel = viewModel,
                    onNavigate = { route -> navController.navigate(route) },
                    onBackClick = { navController.popBackStack() }
                )
            }

            composable(
                route = Screen.QuizMultiple.route,
                arguments = listOf(
                    navArgument("vocabularyId") { type = NavType.StringType },
                    navArgument("questionType") { type = NavType.StringType; defaultValue = "meaning-to-word" },
                    navArgument("choiceCount") { type = NavType.IntType; defaultValue = 4 },
                    navArgument("isRandom") { type = NavType.BoolType; defaultValue = true },
                    navArgument("count") { type = NavType.IntType; defaultValue = 10 }
                )
            ) { backStackEntry ->
                val vocabId = backStackEntry.arguments?.getString("vocabularyId") ?: ""
                val questionType = backStackEntry.arguments?.getString("questionType") ?: "meaning-to-word"
                val choiceCount = backStackEntry.arguments?.getInt("choiceCount") ?: 4
                val isRandom = backStackEntry.arguments?.getBoolean("isRandom") ?: true
                val count = backStackEntry.arguments?.getInt("count") ?: 10

                QuizMultipleChoiceScreen(
                    vocabularyId = vocabId,
                    questionType = questionType,
                    choiceCount = choiceCount,
                    isRandom = isRandom,
                    questionCountLimit = count,
                    viewModel = viewModel,
                    onNavigate = { route -> navController.navigate(route) },
                    onBackClick = { navController.popBackStack() }
                )
            }

            composable(
                route = Screen.QuizWriting.route,
                arguments = listOf(
                    navArgument("vocabularyId") { type = NavType.StringType },
                    navArgument("questionType") { type = NavType.StringType; defaultValue = "meaning-to-word" },
                    navArgument("isRandom") { type = NavType.BoolType; defaultValue = true },
                    navArgument("count") { type = NavType.IntType; defaultValue = 10 }
                )
            ) { backStackEntry ->
                val vocabId = backStackEntry.arguments?.getString("vocabularyId") ?: ""
                val questionType = backStackEntry.arguments?.getString("questionType") ?: "meaning-to-word"
                val isRandom = backStackEntry.arguments?.getBoolean("isRandom") ?: true
                val count = backStackEntry.arguments?.getInt("count") ?: 10

                QuizWritingScreen(
                    vocabularyId = vocabId,
                    questionType = questionType,
                    isRandom = isRandom,
                    questionCountLimit = count,
                    viewModel = viewModel,
                    onNavigate = { route -> navController.navigate(route) },
                    onBackClick = { navController.popBackStack() }
                )
            }

            composable(
                route = Screen.QuizMatching.route,
                arguments = listOf(
                    navArgument("vocabularyId") { type = NavType.StringType },
                    navArgument("dynamic") { type = NavType.BoolType; defaultValue = false }
                )
            ) { backStackEntry ->
                val vocabId = backStackEntry.arguments?.getString("vocabularyId") ?: ""
                val dynamic = backStackEntry.arguments?.getBoolean("dynamic") ?: false

                QuizMatchingScreen(
                    vocabularyId = vocabId,
                    dynamic = dynamic,
                    viewModel = viewModel,
                    onNavigate = { route -> navController.navigate(route) },
                    onBackClick = { navController.popBackStack() }
                )
            }

            composable(
                route = Screen.QuizSentence.route,
                arguments = listOf(navArgument("vocabularyId") { type = NavType.StringType })
            ) { backStackEntry ->
                val vocabId = backStackEntry.arguments?.getString("vocabularyId") ?: ""

                QuizSentenceScreen(
                    vocabularyId = vocabId,
                    viewModel = viewModel,
                    onNavigate = { route -> navController.navigate(route) },
                    onBackClick = { navController.popBackStack() }
                )
            }

            composable(
                route = Screen.QuizResult.route,
                arguments = listOf(
                    navArgument("vocabularyId") { type = NavType.StringType },
                    navArgument("score") { type = NavType.IntType; defaultValue = 0 },
                    navArgument("total") { type = NavType.IntType; defaultValue = 100 },
                    navArgument("time") { type = NavType.IntType; defaultValue = 0 },
                    navArgument("quizType") { type = NavType.StringType; defaultValue = "퀴즈" },
                    navArgument("incorrectIds") { type = NavType.StringType; defaultValue = "" }
                )
            ) { backStackEntry ->
                val vocabId = backStackEntry.arguments?.getString("vocabularyId") ?: ""
                val score = backStackEntry.arguments?.getInt("score") ?: 0
                val total = backStackEntry.arguments?.getInt("total") ?: 100
                val time = backStackEntry.arguments?.getInt("time") ?: 0
                val quizType = backStackEntry.arguments?.getString("quizType") ?: "퀴즈"
                val incorrectIds = backStackEntry.arguments?.getString("incorrectIds") ?: ""

                QuizResultScreen(
                    vocabularyId = vocabId,
                    score = score,
                    total = total,
                    durationSeconds = time,
                    quizType = quizType,
                    incorrectIds = incorrectIds,
                    viewModel = viewModel,
                    onNavigate = { route -> navController.navigate(route) }
                )
            }

            composable(
                route = Screen.BulkAddWords.route,
                arguments = listOf(navArgument("vocabularyId") { type = NavType.StringType })
            ) { backStackEntry ->
                val vocabId = backStackEntry.arguments?.getString("vocabularyId") ?: ""
                WordBulkAddScreen(
                    vocabularyId = vocabId,
                    viewModel = viewModel,
                    onBackClick = { navController.popBackStack() }
                )
            }

            composable(Screen.PublicVocabularies.route) {
                PublicVocabulariesScreen(
                    viewModel = viewModel,
                    onNavigate = { route -> navController.navigate(route) }
                )
            }

            composable(Screen.Groups.route) {
                GroupsScreen(viewModel = viewModel)
            }

            composable(Screen.Statistics.route) {
                StatisticsScreen(viewModel = viewModel)
            }

            composable(Screen.Settings.route) {
                SettingsScreen(viewModel = viewModel)
            }
        }
    }
}
