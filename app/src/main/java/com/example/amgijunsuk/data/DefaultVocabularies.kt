package com.example.amgijunsuk.data

import com.example.amgijunsuk.data.model.StudyGroupEntity
import com.example.amgijunsuk.data.model.VocabularyEntity
import com.example.amgijunsuk.data.model.WordEntity
import java.util.UUID

object DefaultVocabularies {
    val sampleVocabularies = listOf(
        VocabularyEntity(
            id = "vocab_sat_core",
            name = "수능 필수 영단어 60선",
            description = "수능 및 고등 내신 1등급을 위한 핵심 고난도 어휘 모음집",
            language = "en",
            isPublic = true,
            category = "수능/내신"
        ),
        VocabularyEntity(
            id = "vocab_toeic_biz",
            name = "토익 빈출 비즈니스 어휘 40선",
            description = "LC 및 RC에 반복 출제되는 오피스 및 계약 관련 필수 단어",
            language = "en",
            isPublic = true,
            category = "토익/취업"
        ),
        VocabularyEntity(
            id = "vocab_daily_convo",
            name = "기초 일상 회화 단어장",
            description = "원어민이 매일 쓰는 자연스러운 생활 회화 필수 표현",
            language = "en",
            isPublic = true,
            category = "기초/회화"
        ),
        VocabularyEntity(
            id = "vocab_academic_kaist",
            name = "KAIST 연구원 추천 학술 어휘",
            description = "논문 작성 및 테크 컨퍼런스 발표를 위한 학술/과학 영단어",
            language = "en",
            isPublic = true,
            category = "학술/전문"
        )
    )

    fun getSampleWords(): List<WordEntity> {
        val words = mutableListOf<WordEntity>()

        // 1. 수능 필수 영단어
        val satList = listOf(
            Triple("ubiquitous", "어디에나 있는, 흔한", "Smartphones have become ubiquitous in modern society."),
            Triple("conspicuous", "눈에 띄는, 뚜렷한", "Her bright red coat made her conspicuous in the crowd."),
            Triple("substantiate", "입증하다, 실체화하다", "They found evidence to substantiate their claims."),
            Triple("evaluate", "평가하다, 감정하다", "The committee will evaluate the performance of each candidate."),
            Triple("deteriorate", "악화되다, 퇴보하다", "The patient's condition began to deteriorate rapidly."),
            Triple("comprehend", "이해하다, 파악하다", "I could barely comprehend the complexity of the math problem."),
            Triple("perceive", "인지하다, 알아채다", "We often perceive things differently based on our experiences."),
            Triple("diminish", "줄어들다, 약화시키다", "His influence over the company began to diminish."),
            Triple("anticipate", "예상하다, 기대하다", "Economists anticipate a strong economic recovery this year."),
            Triple("elaborate", "정교한; 상세히 설명하다", "Please elaborate on your proposal during the meeting."),
            Triple("profound", "심오한, 깊은, 엄청난", "The discovery had a profound impact on modern medicine."),
            Triple("reluctant", "꺼리는, 마지못해 하는", "He was reluctant to admit his mistake in public."),
            Triple("superficial", "피상적인, 얕은", "The article provides only a superficial analysis of the issue."),
            Triple("obsolete", "더 이상 쓸모없는, 구식의", "Floppy disks have long been obsolete technology."),
            Triple("preliminary", "예비의, 준비의", "The preliminary results of the experiment look very promising."),
            Triple("resilient", "회복력 있는, 탄력 있는", "Children are often remarkably resilient in facing hardships."),
            Triple("vulnerable", "취약한, 상처받기 쉬운", "Elderly people are particularly vulnerable to winter infections."),
            Triple("ambiguous", "모호한, 다의적인", "The contract terms were too ambiguous to enforce legally."),
            Triple("feasible", "실현 가능한, 적절한", "The engineering team concluded the plan was technically feasible."),
            Triple("spontaneous", "자발적인, 즉흥적인", "We took a spontaneous road trip to the beach last weekend."),
            Triple("lucid", "명료한, 이해하기 쉬운", "She gave a lucid explanation of a very complex concept."),
            Triple("meticulous", "꼼꼼한, 세심한", "The detective made a meticulous search of the crime scene."),
            Triple("mitigate", "완화시키다, 경감하다", "Measures were taken to mitigate the environmental impact."),
            Triple("pragmatic", "실용적인, 실제적인", "We need a pragmatic approach rather than theoretical debates."),
            Triple("scrutinize", "세밀히 조사하다, 검토하다", "Accountants will scrutinize all financial statements.")
        )
        satList.forEachIndexed { index, (word, meaning, example) ->
            words.add(
                WordEntity(
                    id = "word_sat_$index",
                    vocabularyId = "vocab_sat_core",
                    word = word,
                    meaning = meaning,
                    example = example,
                    partOfSpeech = "형용사/동사",
                    orderIndex = index
                )
            )
        }

        // 2. 토익 비즈니스 어휘
        val toeicList = listOf(
            Triple("accommodate", "수용하다, 부응하다, 편의를 봐주다", "The conference hall can accommodate up to 500 guests."),
            Triple("implement", "시행하다, 실행하다", "We plan to implement the new software system next month."),
            Triple("collaborate", "협력하다, 공동 작업하다", "The design and marketing teams collaborate closely."),
            Triple("postpone", "연기하다, 미루다", "Due to heavy rain, the outdoor event was postponed."),
            Triple("negotiate", "협상하다, 타결하다", "Both parties are trying to negotiate a fair agreement."),
            Triple("revenue", "수익, 세입", "Company revenue increased by 15% in the fourth quarter."),
            Triple("expenditure", "지출, 비용", "We need to cut down unnecessary operational expenditure."),
            Triple("invoice", "송장, 청구서", "Please send the invoice to our accounting department."),
            Triple("itinerary", "여행 일정표", "Check the attached travel itinerary before boarding."),
            Triple("reimbursement", "환급, 변제", "Submit your receipt to receive travel expense reimbursement."),
            Triple("compliance", "규정 준수", "Safety inspections ensure compliance with state regulations."),
            Triple("prospective", "유망한, 장래의", "The sales manager met with prospective clients today."),
            Triple("mandatory", "의무적인, 필수의", "Attendance at the annual safety training is mandatory."),
            Triple("lucrative", "수익성이 좋은", "Investing in renewable energy proved to be very lucrative."),
            Triple("discrepancy", "불일치, 차이", "There is a minor discrepancy between the two reports.")
        )
        toeicList.forEachIndexed { index, (word, meaning, example) ->
            words.add(
                WordEntity(
                    id = "word_toeic_$index",
                    vocabularyId = "vocab_toeic_biz",
                    word = word,
                    meaning = meaning,
                    example = example,
                    partOfSpeech = "동사/명사",
                    orderIndex = index
                )
            )
        }

        // 3. 기초 일상 회화 단어
        val dailyList = listOf(
            Triple("convenient", "편리한, 가까운", "Living near the subway station is very convenient."),
            Triple("definitely", "분명히, 절대로", "I will definitely visit you when I am in Seoul."),
            Triple("appointment", "약속, 예약", "I have a dental appointment at 3 PM this afternoon."),
            Triple("recommend", "추천하다", "Can you recommend a good Italian restaurant nearby?"),
            Triple("affordable", "가격이 알맞은, 감당할 수 있는", "The store offers high quality clothes at affordable prices."),
            Triple("hesitate", "망설이다, 주저하다", "Don't hesitate to ask if you have any questions."),
            Triple("generous", "관대한, 후한", "Thank you for your generous hospitality during our stay."),
            Triple("exhausted", "몹시 지친, 탈진한", "I was completely exhausted after running the marathon."),
            Triple("immediately", "즉시, 곧바로", "Please report any emergency situations immediately."),
            Triple("grateful", "감사하는, 고마워하는", "I am very grateful for your continuous encouragement.")
        )
        dailyList.forEachIndexed { index, (word, meaning, example) ->
            words.add(
                WordEntity(
                    id = "word_daily_$index",
                    vocabularyId = "vocab_daily_convo",
                    word = word,
                    meaning = meaning,
                    example = example,
                    partOfSpeech = "형용사/부사",
                    orderIndex = index
                )
            )
        }

        // 4. KAIST 학술 어휘
        val academicList = listOf(
            Triple("hypothesis", "가설", "The research team formulated a bold new hypothesis."),
            Triple("empirical", "경험적인, 실증적인", "The theory is supported by strong empirical data."),
            Triple("methodology", "방법론", "The paper outlines an innovative research methodology."),
            Triple("correlation", "상관관계", "There is a positive correlation between study time and scores."),
            Triple("parameter", "매개변수, 한도", "The experiment was conducted within strictly defined parameters.")
        )
        academicList.forEachIndexed { index, (word, meaning, example) ->
            words.add(
                WordEntity(
                    id = "word_acad_$index",
                    vocabularyId = "vocab_academic_kaist",
                    word = word,
                    meaning = meaning,
                    example = example,
                    partOfSpeech = "명사/형용사",
                    orderIndex = index
                )
            )
        }

        return words
    }

    val sampleGroups = listOf(
        StudyGroupEntity(
            id = "group_kaist",
            name = "KAIST 영어 몰입 스터디",
            description = "논문 리딩 및 대학원 연구 발표 대비 영단어 마스터 스터디 그룹입니다.",
            memberCount = 142,
            targetGoal = "매일 30단어 학습"
        ),
        StudyGroupEntity(
            id = "group_sat_perfect",
            name = "수능 영어 1등급 정복반",
            description = "기출 고난도 빈출 어휘 매일 50개 암기 및 퀴즈 인증!",
            memberCount = 89,
            targetGoal = "주 5회 퀴즈 100점 달성"
        ),
        StudyGroupEntity(
            id = "group_toeic_990",
            name = "토익 900+ 벼락치기 챌린지",
            description = "비즈니스 어휘와 파트 5 빈출 표현을 단기간에 완벽 암기합니다.",
            memberCount = 230,
            targetGoal = "단어장 1회독 완료"
        )
    )
}
