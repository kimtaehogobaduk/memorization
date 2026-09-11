package com.example.amgijunsuk.data.model

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(tableName = "vocabularies")
data class VocabularyEntity(
    @PrimaryKey val id: String,
    val name: String,
    val description: String?,
    val language: String = "en",
    val createdAt: Long = System.currentTimeMillis(),
    val isPublic: Boolean = false,
    val category: String = "일반"
)

@Entity(
    tableName = "words",
    foreignKeys = [
        ForeignKey(
            entity = VocabularyEntity::class,
            parentColumns = ["id"],
            childColumns = ["vocabularyId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index(value = ["vocabularyId"])]
)
data class WordEntity(
    @PrimaryKey val id: String,
    val vocabularyId: String,
    val word: String,
    val meaning: String,
    val example: String? = null,
    val partOfSpeech: String? = null,
    val synonyms: String? = null,
    val antonyms: String? = null,
    val frequency: Int = 3,
    val difficulty: Int = 2,
    val orderIndex: Int = 0,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "study_progress")
data class StudyProgressEntity(
    @PrimaryKey val id: String,
    val wordId: String,
    val vocabularyId: String,
    val correctCount: Int = 0,
    val incorrectCount: Int = 0,
    val lastStudiedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "quiz_history")
data class QuizHistoryEntity(
    @PrimaryKey val id: String,
    val vocabularyId: String,
    val vocabularyName: String,
    val quizType: String,
    val score: Int,
    val totalQuestions: Int,
    val durationSeconds: Int,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "study_groups")
data class StudyGroupEntity(
    @PrimaryKey val id: String,
    val name: String,
    val description: String,
    val memberCount: Int = 1,
    val targetGoal: String = "하루 20단어 마스터",
    val createdAt: Long = System.currentTimeMillis()
)

data class VocabularyWithCount(
    val vocabulary: VocabularyEntity,
    val wordCount: Int
)
