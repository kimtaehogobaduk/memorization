package com.example.amgijunsuk.data.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.example.amgijunsuk.data.model.QuizHistoryEntity
import com.example.amgijunsuk.data.model.StudyGroupEntity
import com.example.amgijunsuk.data.model.StudyProgressEntity
import com.example.amgijunsuk.data.model.VocabularyEntity
import com.example.amgijunsuk.data.model.WordEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface AppDao {
    // Vocabularies
    @Query("SELECT * FROM vocabularies ORDER BY createdAt DESC")
    fun getAllVocabularies(): Flow<List<VocabularyEntity>>

    @Query("SELECT * FROM vocabularies WHERE isPublic = 1 ORDER BY createdAt DESC")
    fun getPublicVocabularies(): Flow<List<VocabularyEntity>>

    @Query("SELECT * FROM vocabularies WHERE id = :id")
    fun getVocabularyById(id: String): Flow<VocabularyEntity?>

    @Query("SELECT * FROM vocabularies WHERE id = :id")
    suspend fun getVocabularyByIdSync(id: String): VocabularyEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertVocabulary(vocab: VocabularyEntity)

    @Update
    suspend fun updateVocabulary(vocab: VocabularyEntity)

    @Query("DELETE FROM vocabularies WHERE id = :id")
    suspend fun deleteVocabularyById(id: String)

    // Words
    @Query("SELECT * FROM words WHERE vocabularyId = :vocabularyId ORDER BY orderIndex ASC, createdAt ASC")
    fun getWordsByVocabulary(vocabularyId: String): Flow<List<WordEntity>>

    @Query("SELECT * FROM words WHERE vocabularyId = :vocabularyId ORDER BY orderIndex ASC, createdAt ASC")
    suspend fun getWordsByVocabularySync(vocabularyId: String): List<WordEntity>

    @Query("SELECT * FROM words WHERE id = :id")
    suspend fun getWordById(id: String): WordEntity?

    @Query("SELECT COUNT(*) FROM words WHERE vocabularyId = :vocabularyId")
    fun getWordCount(vocabularyId: String): Flow<Int>

    @Query("SELECT COUNT(*) FROM words WHERE vocabularyId = :vocabularyId")
    suspend fun getWordCountSync(vocabularyId: String): Int

    @Query("SELECT COUNT(*) FROM words")
    fun getTotalWordCount(): Flow<Int>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertWord(word: WordEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertWords(words: List<WordEntity>)

    @Update
    suspend fun updateWord(word: WordEntity)

    @Query("DELETE FROM words WHERE id = :id")
    suspend fun deleteWordById(id: String)

    // Study Progress
    @Query("SELECT * FROM study_progress WHERE wordId = :wordId")
    suspend fun getProgressForWord(wordId: String): StudyProgressEntity?

    @Query("SELECT * FROM study_progress WHERE vocabularyId = :vocabularyId")
    fun getProgressByVocabulary(vocabularyId: String): Flow<List<StudyProgressEntity>>

    @Query("SELECT COUNT(*) FROM study_progress WHERE correctCount > 0")
    fun getMasteredWordCount(): Flow<Int>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdateProgress(progress: StudyProgressEntity)

    // Quiz History
    @Query("SELECT * FROM quiz_history ORDER BY createdAt DESC")
    fun getAllQuizHistory(): Flow<List<QuizHistoryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertQuizHistory(history: QuizHistoryEntity)

    // Study Groups
    @Query("SELECT * FROM study_groups ORDER BY createdAt DESC")
    fun getAllStudyGroups(): Flow<List<StudyGroupEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertStudyGroup(group: StudyGroupEntity)

    @Query("DELETE FROM study_groups WHERE id = :id")
    suspend fun deleteStudyGroup(id: String)
}
