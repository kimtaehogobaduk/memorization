package com.example.amgijunsuk.ui.navigation

sealed class Screen(val route: String) {
    object Home : Screen("home")
    object Vocabularies : Screen("vocabularies")
    object VocabularyDetail : Screen("vocabulary_detail/{id}") {
        fun createRoute(id: String) = "vocabulary_detail/$id"
    }
    object CreateVocabulary : Screen("create_vocabulary")
    object BulkAddWords : Screen("bulk_add/{id}") {
        fun createRoute(id: String) = "bulk_add/$id"
    }
    object Study : Screen("study/{id}") {
        fun createRoute(id: String) = "study/$id"
    }
    object QuizHub : Screen("quiz_hub/{id}") {
        fun createRoute(id: String) = "quiz_hub/$id"
    }
    object QuizMultiple : Screen("quiz_multiple/{id}/{questionType}/{choiceCount}/{isRandom}/{count}") {
        fun createRoute(
            id: String,
            questionType: String = "meaning-to-word",
            choiceCount: Int = 4,
            isRandom: Boolean = true,
            count: Int = 10
        ) = "quiz_multiple/$id/$questionType/$choiceCount/$isRandom/$count"
    }
    object QuizWriting : Screen("quiz_writing/{id}/{questionType}/{isRandom}/{count}") {
        fun createRoute(
            id: String,
            questionType: String = "meaning-to-word",
            isRandom: Boolean = true,
            count: Int = 10
        ) = "quiz_writing/$id/$questionType/$isRandom/$count"
    }
    object QuizMatching : Screen("quiz_matching/{id}/{dynamic}") {
        fun createRoute(id: String, dynamic: Boolean = false) = "quiz_matching/$id/$dynamic"
    }
    object QuizSentence : Screen("quiz_sentence/{id}") {
        fun createRoute(id: String) = "quiz_sentence/$id"
    }
    object QuizResult : Screen("quiz_result/{vocabId}/{score}/{total}/{time}/{quizType}?incorrectIds={incorrectIds}") {
        fun createRoute(
            vocabId: String,
            score: Int,
            total: Int,
            time: Int,
            quizType: String,
            incorrectIds: String = ""
        ) = "quiz_result/$vocabId/$score/$total/$time/$quizType?incorrectIds=$incorrectIds"
    }
    object PublicVocabularies : Screen("public_vocabularies")
    object Groups : Screen("groups")
    object Statistics : Screen("statistics")
    object Settings : Screen("settings")
}
