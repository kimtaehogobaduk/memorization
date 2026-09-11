package com.example.amgijunsuk.ui

import android.app.Application
import android.speech.tts.TextToSpeech
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.amgijunsuk.data.AppDatabase
import com.example.amgijunsuk.data.VocabularyRepository
import com.example.amgijunsuk.data.model.QuizHistoryEntity
import com.example.amgijunsuk.data.model.StudyGroupEntity
import com.example.amgijunsuk.data.model.VocabularyEntity
import com.example.amgijunsuk.data.model.VocabularyWithCount
import com.example.amgijunsuk.data.model.WordEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.util.Locale

class MainViewModel(application: Application) : AndroidViewModel(application), TextToSpeech.OnInitListener {

    private val repository: VocabularyRepository
    private var tts: TextToSpeech? = null
    private val _ttsReady = MutableStateFlow(false)
    val ttsReady: StateFlow<Boolean> = _ttsReady.asStateFlow()

    val vocabularies: StateFlow<List<VocabularyWithCount>>
    val publicVocabularies: StateFlow<List<VocabularyWithCount>>
    val studyGroups: StateFlow<List<StudyGroupEntity>>
    val quizHistory: StateFlow<List<QuizHistoryEntity>>
    val totalWordCount: StateFlow<Int>
    val masteredWordCount: StateFlow<Int>

    init {
        val database = AppDatabase.getDatabase(application)
        repository = VocabularyRepository(database.appDao())

        // TTS Init
        tts = TextToSpeech(application, this)

        // Seed initial data
        viewModelScope.launch {
            repository.checkAndSeedInitialData()
        }

        vocabularies = repository.getAllVocabularies()
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

        publicVocabularies = repository.getPublicVocabularies()
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

        studyGroups = repository.getAllStudyGroups()
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

        quizHistory = repository.getAllQuizHistory()
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

        totalWordCount = repository.getTotalWordCount()
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

        masteredWordCount = repository.getMasteredWordCount()
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val result = tts?.setLanguage(Locale.US)
            if (result != TextToSpeech.LANG_MISSING_DATA && result != TextToSpeech.LANG_NOT_SUPPORTED) {
                _ttsReady.value = true
            }
        }
    }

    fun speakWord(text: String) {
        if (_ttsReady.value && text.isNotBlank()) {
            tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "vcb_speech")
        }
    }

    fun getVocabulary(id: String): Flow<VocabularyEntity?> = repository.getVocabulary(id)

    suspend fun getVocabularySync(id: String): VocabularyEntity? = repository.getVocabularySync(id)

    fun getWords(vocabularyId: String): Flow<List<WordEntity>> = repository.getWordsByVocabulary(vocabularyId)

    suspend fun getWordsSync(vocabularyId: String): List<WordEntity> = repository.getWordsByVocabularySync(vocabularyId)

    fun createVocabulary(name: String, description: String?, category: String = "일반", onCreated: (String) -> Unit) {
        viewModelScope.launch {
            val id = repository.insertVocabulary(name, description, category)
            onCreated(id)
        }
    }

    fun updateVocabulary(vocab: VocabularyEntity) {
        viewModelScope.launch {
            repository.updateVocabulary(vocab)
        }
    }

    fun deleteVocabulary(id: String) {
        viewModelScope.launch {
            repository.deleteVocabulary(id)
        }
    }

    fun addWord(vocabularyId: String, word: String, meaning: String, example: String? = null, partOfSpeech: String? = null) {
        viewModelScope.launch {
            repository.insertWord(vocabularyId, word, meaning, example, partOfSpeech)
        }
    }

    fun bulkAddWords(vocabularyId: String, text: String, onComplete: (Int) -> Unit) {
        viewModelScope.launch {
            val count = repository.parseAndInsertWords(vocabularyId, text)
            onComplete(count)
        }
    }

    fun updateWord(word: WordEntity) {
        viewModelScope.launch {
            repository.updateWord(word)
        }
    }

    fun deleteWord(id: String) {
        viewModelScope.launch {
            repository.deleteWord(id)
        }
    }

    fun recordStudyProgress(wordId: String, vocabularyId: String, isCorrect: Boolean) {
        viewModelScope.launch {
            repository.recordStudyProgress(wordId, vocabularyId, isCorrect)
        }
    }

    fun recordQuizResult(
        vocabularyId: String,
        vocabularyName: String,
        quizType: String,
        score: Int,
        total: Int,
        durationSeconds: Int
    ) {
        viewModelScope.launch {
            repository.recordQuizHistory(
                vocabularyId,
                vocabularyName,
                quizType,
                score,
                total,
                durationSeconds
            )
        }
    }

    fun createStudyGroup(name: String, description: String, goal: String) {
        viewModelScope.launch {
            repository.createStudyGroup(name, description, goal)
        }
    }

    fun copyPublicVocabToMyList(publicVocabId: String, onDone: (String) -> Unit) {
        viewModelScope.launch {
            val original = repository.getVocabularySync(publicVocabId) ?: return@launch
            val words = repository.getWordsByVocabularySync(publicVocabId)
            val newVocabId = repository.insertVocabulary(
                name = "${original.name} (내 단어장)",
                description = original.description,
                category = original.category
            )
            val copiedWords = words.map { w ->
                w.copy(
                    id = "word_${System.currentTimeMillis()}_${(1000..9999).random()}",
                    vocabularyId = newVocabId
                )
            }
            databaseWords(copiedWords)
            onDone(newVocabId)
        }
    }

    private suspend fun databaseWords(words: List<WordEntity>) {
        val db = AppDatabase.getDatabase(getApplication())
        db.appDao().insertWords(words)
    }

    override fun onCleared() {
        super.onCleared()
        tts?.stop()
        tts?.shutdown()
    }
}
