package com.example.amgijunsuk.data

import com.example.amgijunsuk.data.dao.AppDao
import com.example.amgijunsuk.data.model.QuizHistoryEntity
import com.example.amgijunsuk.data.model.StudyGroupEntity
import com.example.amgijunsuk.data.model.StudyProgressEntity
import com.example.amgijunsuk.data.model.VocabularyEntity
import com.example.amgijunsuk.data.model.VocabularyWithCount
import com.example.amgijunsuk.data.model.WordEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.util.UUID

class VocabularyRepository(private val appDao: AppDao) {

    suspend fun checkAndSeedInitialData() {
        val currentVocabs = appDao.getWordsByVocabularySync("vocab_sat_core")
        if (currentVocabs.isEmpty()) {
            DefaultVocabularies.sampleVocabularies.forEach { vocab ->
                appDao.insertVocabulary(vocab)
            }
            appDao.insertWords(DefaultVocabularies.getSampleWords())
            DefaultVocabularies.sampleGroups.forEach { group ->
                appDao.insertStudyGroup(group)
            }
        }
    }

    fun getAllVocabularies(): Flow<List<VocabularyWithCount>> {
        return appDao.getAllVocabularies().map { vocabs ->
            vocabs.map { vocab ->
                val count = appDao.getWordCountSync(vocab.id)
                VocabularyWithCount(vocab, count)
            }
        }
    }

    fun getPublicVocabularies(): Flow<List<VocabularyWithCount>> {
        return appDao.getPublicVocabularies().map { vocabs ->
            vocabs.map { vocab ->
                val count = appDao.getWordCountSync(vocab.id)
                VocabularyWithCount(vocab, count)
            }
        }
    }

    fun getVocabulary(id: String): Flow<VocabularyEntity?> {
        return appDao.getVocabularyById(id)
    }

    suspend fun getVocabularySync(id: String): VocabularyEntity? {
        return appDao.getVocabularyByIdSync(id)
    }

    fun getWordsByVocabulary(vocabularyId: String): Flow<List<WordEntity>> {
        return appDao.getWordsByVocabulary(vocabularyId)
    }

    suspend fun getWordsByVocabularySync(vocabularyId: String): List<WordEntity> {
        return appDao.getWordsByVocabularySync(vocabularyId)
    }

    suspend fun insertVocabulary(
        name: String,
        description: String?,
        category: String = "일반"
    ): String {
        val id = "vocab_${System.currentTimeMillis()}"
        val vocab = VocabularyEntity(
            id = id,
            name = name,
            description = description,
            language = "en",
            category = category
        )
        appDao.insertVocabulary(vocab)
        return id
    }

    suspend fun updateVocabulary(vocab: VocabularyEntity) {
        appDao.updateVocabulary(vocab)
    }

    suspend fun deleteVocabulary(id: String) {
        appDao.deleteVocabularyById(id)
    }

    suspend fun insertWord(
        vocabularyId: String,
        word: String,
        meaning: String,
        example: String? = null,
        partOfSpeech: String? = null
    ): String {
        val id = "word_${System.currentTimeMillis()}_${(100..999).random()}"
        val wordEntity = WordEntity(
            id = id,
            vocabularyId = vocabularyId,
            word = word.trim(),
            meaning = meaning.trim(),
            example = example?.trim(),
            partOfSpeech = partOfSpeech?.trim(),
            orderIndex = appDao.getWordCountSync(vocabularyId)
        )
        appDao.insertWord(wordEntity)
        return id
    }

    suspend fun parseAndInsertWords(
        vocabularyId: String,
        rawText: String
    ): Int {
        val lines = rawText.lines()
        val wordsToInsert = mutableListOf<WordEntity>()
        var baseOrder = appDao.getWordCountSync(vocabularyId)

        for (line in lines) {
            val trimmed = line.trim()
            if (trimmed.isEmpty()) continue

            // Support tab-separated, comma-separated, or dash-separated
            val parts = when {
                trimmed.contains("\t") -> trimmed.split("\t")
                trimmed.contains(",") -> trimmed.split(",")
                trimmed.contains(" - ") -> trimmed.split(" - ")
                trimmed.contains(" : ") -> trimmed.split(" : ")
                else -> listOf(trimmed)
            }

            if (parts.size >= 2) {
                val word = parts[0].trim()
                val meaning = parts[1].trim()
                val example = if (parts.size >= 3) parts[2].trim() else null

                if (word.isNotEmpty() && meaning.isNotEmpty()) {
                    wordsToInsert.add(
                        WordEntity(
                            id = "word_${System.currentTimeMillis()}_${UUID.randomUUID().toString().take(6)}",
                            vocabularyId = vocabularyId,
                            word = word,
                            meaning = meaning,
                            example = example,
                            orderIndex = baseOrder++
                        )
                    )
                }
            }
        }

        if (wordsToInsert.isNotEmpty()) {
            appDao.insertWords(wordsToInsert)
        }
        return wordsToInsert.size
    }

    suspend fun updateWord(word: WordEntity) {
        appDao.updateWord(word)
    }

    suspend fun deleteWord(id: String) {
        appDao.deleteWordById(id)
    }

    suspend fun recordStudyProgress(wordId: String, vocabularyId: String, isCorrect: Boolean) {
        val existing = appDao.getProgressForWord(wordId)
        if (existing != null) {
            val updated = existing.copy(
                correctCount = if (isCorrect) existing.correctCount + 1 else existing.correctCount,
                incorrectCount = if (!isCorrect) existing.incorrectCount + 1 else existing.incorrectCount,
                lastStudiedAt = System.currentTimeMillis()
            )
            appDao.insertOrUpdateProgress(updated)
        } else {
            val newProgress = StudyProgressEntity(
                id = "prog_${wordId}",
                wordId = wordId,
                vocabularyId = vocabularyId,
                correctCount = if (isCorrect) 1 else 0,
                incorrectCount = if (!isCorrect) 1 else 0,
                lastStudiedAt = System.currentTimeMillis()
            )
            appDao.insertOrUpdateProgress(newProgress)
        }
    }

    suspend fun recordQuizHistory(
        vocabularyId: String,
        vocabularyName: String,
        quizType: String,
        score: Int,
        totalQuestions: Int,
        durationSeconds: Int
    ) {
        val history = QuizHistoryEntity(
            id = "quiz_${System.currentTimeMillis()}",
            vocabularyId = vocabularyId,
            vocabularyName = vocabularyName,
            quizType = quizType,
            score = score,
            totalQuestions = totalQuestions,
            durationSeconds = durationSeconds
        )
        appDao.insertQuizHistory(history)
    }

    fun getAllQuizHistory(): Flow<List<QuizHistoryEntity>> = appDao.getAllQuizHistory()

    fun getAllStudyGroups(): Flow<List<StudyGroupEntity>> = appDao.getAllStudyGroups()

    suspend fun createStudyGroup(name: String, description: String, goal: String) {
        val group = StudyGroupEntity(
            id = "group_${System.currentTimeMillis()}",
            name = name,
            description = description,
            targetGoal = goal
        )
        appDao.insertStudyGroup(group)
    }

    fun getTotalWordCount(): Flow<Int> = appDao.getTotalWordCount()
    fun getMasteredWordCount(): Flow<Int> = appDao.getMasteredWordCount()
}
