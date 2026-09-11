package com.example.amgijunsuk.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.example.amgijunsuk.data.dao.AppDao
import com.example.amgijunsuk.data.model.QuizHistoryEntity
import com.example.amgijunsuk.data.model.StudyGroupEntity
import com.example.amgijunsuk.data.model.StudyProgressEntity
import com.example.amgijunsuk.data.model.VocabularyEntity
import com.example.amgijunsuk.data.model.WordEntity

@Database(
    entities = [
        VocabularyEntity::class,
        WordEntity::class,
        StudyProgressEntity::class,
        QuizHistoryEntity::class,
        StudyGroupEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun appDao(): AppDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "amgi_junsuk_database"
                ).fallbackToDestructiveMigration().build()
                INSTANCE = instance
                instance
            }
        }
    }
}
