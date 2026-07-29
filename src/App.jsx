import { useState, useEffect, useRef } from 'react';
import { getAyahData, findSurahNumberByText } from './services/quranApi';
import { VoiceRecorder } from './services/voiceService';
import { transcribeWithGroq } from './services/whisperService';
import { callGemini } from './services/geminiClient';
import { speakTeacherComment, stopTTS } from './services/ttsService';

const SURAH_NAMES = {
  1: 'Аль-Фатиха', 2: 'Аль-Бакара', 3: 'Аль-Имран', 4: 'Ан-Ниса',
  5: 'Аль-Маида', 6: 'Аль-Анам', 7: 'Аль-Араф', 8: 'Аль-Анфаль',
  9: 'Ат-Тауба', 10: 'Юнус', 11: 'Худ', 12: 'Юсуф', 13: 'Ар-Раад',
  14: 'Ибрахим', 15: 'Аль-Хиджр', 16: 'Ан-Нахль', 17: 'Аль-Исра',
  18: 'Аль-Кахф', 19: 'Марьям', 20: 'Та-Ха', 21: 'Аль-Анбия',
  22: 'Аль-Хадж', 23: 'Аль-Муминун', 24: 'Ан-Нур', 25: 'Аль-Фуркан',
  26: 'Аш-Шуара', 27: 'Ан-Намль', 28: 'Аль-Касас', 29: 'Аль-Анкабут',
  30: 'Ар-Рум', 31: 'Лукман', 32: 'Ас-Саджда', 33: 'Аль-Ахзаб',
  34: 'Саба', 35: 'Фатир', 36: 'Ясин', 37: 'Ас-Саффат', 38: 'Сад',
  39: 'Аз-Зумар', 40: 'Гафир', 41: 'Фуссилат', 42: 'Аш-Шура',
  43: 'Аз-Зухруф', 44: 'Ад-Духан', 45: 'Аль-Джасия', 46: 'Аль-Ахкаф',
  47: 'Мухаммад', 48: 'Аль-Фатх', 49: 'Аль-Худжурат', 50: 'Каф',
  51: 'Аз-Зарият', 52: 'Ат-Тур', 53: 'Ан-Наджм', 54: 'Аль-Камар',
  55: 'Ар-Рахман', 56: 'Аль-Вакиа', 57: 'Аль-Хадид', 58: 'Аль-Муджадала',
  59: 'Аль-Хашр', 60: 'Аль-Мумтахана', 61: 'Ас-Сафф', 62: 'Аль-Джумуа',
  63: 'Аль-Мунафикун', 64: 'Ат-Тагабун', 65: 'Ат-Талак', 66: 'Ат-Тахрим',
  67: 'Аль-Мульк', 68: 'Аль-Калам', 69: 'Аль-Хакка', 70: 'Аль-Мааридж',
  71: 'Нух', 72: 'Аль-Джинн', 73: 'Аль-Муззаммиль', 74: 'Аль-Муддассир',
  75: 'Аль-Кияма', 76: 'Аль-Инсан', 77: 'Аль-Мурсалят', 78: 'Ан-Наба',
  79: 'Ан-Назиат', 80: 'Абаса', 81: 'Ат-Таквир', 82: 'Аль-Инфитар',
  83: 'Аль-Мутаффифин', 84: 'Аль-Иншикак', 85: 'Аль-Бурудж', 86: 'Ат-Тарик',
  87: 'Аль-Аля', 88: 'Аль-Гашия', 89: 'Аль-Фаджр', 90: 'Аль-Балад',
  91: 'Аш-Шамс', 92: 'Аль-Лайль', 93: 'Ад-Духа', 94: 'Аш-Шарх',
  95: 'Ат-Тин', 96: 'Аль-Алак', 97: 'Аль-Кадр', 98: 'Аль-Баййина',
  99: 'Аз-Зальзаля', 100: 'Аль-Адият', 101: 'Аль-Кариа', 102: 'Ат-Такасур',
  103: 'Аль-Аср', 104: 'Аль-Хумаза', 105: 'Аль-Филь', 106: 'Курайш',
  107: 'Аль-Маун', 108: 'Аль-Кавсар', 109: 'Аль-Кафирун', 110: 'Ан-Наср',
  111: 'Аль-Масад', 112: 'Аль-Ихлас', 113: 'Аль-Фалак', 114: 'Ан-Нас'
};

export default function App() {
  const [appState, setAppState] = useState('sleeping');
  const [teacher, setTeacher] = useState('aisha');
  const [currentSurah, setCurrentSurah] = useState(1);
  const [surahName, setSurahName] = useState('Аль-Фатиха');

  const audioPlayerRef = useRef(new Audio());
  const recorderRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const isSpeakingRef = useRef(false);

  const appStateRef = useRef('sleeping');
  const teacherRef = useRef('aisha');
  const currentSurahRef = useRef(1);
  const surahNameRef = useRef('Аль-Фатиха');

  useEffect(() => { appStateRef.current = appState; }, [appState]);
  useEffect(() => { teacherRef.current = teacher; }, [teacher]);
  useEffect(() => { currentSurahRef.current = currentSurah; }, [currentSurah]);
  useEffect(() => { surahNameRef.current = surahName; }, [surahName]);

  // Инициализация VoiceRecorder
  useEffect(() => {
    recorderRef.current = new VoiceRecorder();
    return () => {
      if (recorderRef.current) recorderRef.current.stop();
    };
  }, []);

  const playAudio = (url) => {
    return new Promise((resolve) => {
      if (!url) return resolve();
      const player = audioPlayerRef.current;
      player.src = url;
      player.onended = resolve;
      player.onerror = resolve;
      player.play().catch(resolve);
    });
  };

  // === ЗАПУСК ===
  useEffect(() => {
    handleAutoStart();
    return () => {
      if (recorderRef.current) recorderRef.current.stop();
      stopTTS();
    };
  }, []);

  const handleAutoStart = async () => {
    await new Promise(r => setTimeout(r, 600));

    setAppState('speaking');
    isSpeakingRef.current = true;
    await speakTeacherComment(
      "Ассаляму алейкум! Назовите имя учителя: Аиша или Хасан.",
      'aisha'
    );
    isSpeakingRef.current = false;

    startListeningForTeacher();
  };

  // === СЛУШАЕМ ИМЯ УЧИТЕЛЯ ===
  const startListeningForTeacher = async () => {
    setAppState('ask_surah');
    await new Promise(r => setTimeout(r, 600));
    await startRecording();

    clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(async () => {
      const audioBlob = await stopRecording();
      await processTeacherChoice(audioBlob);
    }, 5000);
  };

  const processTeacherChoice = async (audioBlob) => {
    if (!audioBlob || audioBlob.size < 1000) {
      await speakTeacherComment("Я вас не услышала. Скажите: Аиша или Хасан.", 'aisha');
      startListeningForTeacher();
      return;
    }

    let transcript = await transcribeWithGroq(audioBlob);

    // Явный фолбэк, только если сервер не распознал ничего
    if (!transcript) {
      console.warn('⚠️ Groq/Whisper вернул пустой текст, пробуем WebSpeech-фолбэк');
      transcript = await recorderRef.current.fallbackToWebSpeech();
    }

    console.log("📝 Имя учителя:", transcript);

    const t = (transcript || '').toLowerCase();
    let selectedTeacher = 'aisha';

    if (t.includes('хасан') || t.includes('hassan')) {
      selectedTeacher = 'hassan';
    }

    setTeacher(selectedTeacher);
    teacherRef.current = selectedTeacher;

    await speakTeacherComment(
      `Хорошо, я ${selectedTeacher === 'aisha' ? 'Аиша' : 'Хасан'}. Какую суру будем читать?`,
      selectedTeacher
    );

    startListeningForSurah();
  };

  // === СЛУШАЕМ НАЗВАНИЕ СУРЫ ===
  const startListeningForSurah = async () => {
    setAppState('ask_surah');
    await new Promise(r => setTimeout(r, 600));
    await startRecording();

    clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(async () => {
      const audioBlob = await stopRecording();
      await processSurahChoice(audioBlob);
    }, 8000);
  };

  const processSurahChoice = async (audioBlob) => {
    if (!audioBlob || audioBlob.size < 1000) {
      await speakTeacherComment("Я вас не услышала. Назовите суру ещё раз.", teacherRef.current);
      startListeningForSurah();
      return;
    }

    let transcript = await transcribeWithGroq(audioBlob);

    if (!transcript) {
      console.warn('⚠️ Groq/Whisper вернул пустой текст, пробуем WebSpeech-фолбэк');
      transcript = await recorderRef.current.fallbackToWebSpeech();
    }

    console.log("📝 Ищем суру по тексту:", transcript);

    const surahNumber = findSurahNumberByText(transcript || '');

    if (surahNumber) {
      console.log(`✅ Найдена сура №${surahNumber}`);
      setCurrentSurah(surahNumber);
      currentSurahRef.current = surahNumber;
      setSurahName(SURAH_NAMES[surahNumber] || `Сура ${surahNumber}`);
      surahNameRef.current = SURAH_NAMES[surahNumber] || `Сура ${surahNumber}`;

      await speakTeacherComment(
        `Отлично! Открываем суру ${SURAH_NAMES[surahNumber]}. Прочитайте первый аят.`,
        teacherRef.current
      );
      startStudentSession();
    } else {
      console.warn("❌ Сура не найдена в тексте:", transcript);
      await speakTeacherComment(
        "Извините, не разобрала название. Повторите, пожалуйста.",
        teacherRef.current
      );
      startListeningForSurah();
    }
  };

  // === СЕССИЯ ЧТЕНИЯ ===
  const startStudentSession = async () => {
    setAppState('listening');
    await new Promise(r => setTimeout(r, 600));
    await startRecording();

    clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(async () => {
      await processCompletedReading();
    }, 12000);
  };

  const processCompletedReading = async () => {
    if (isSpeakingRef.current) return;

    setAppState('processing');
    isSpeakingRef.current = true;

    const selectedTeacher = teacherRef.current;
    const selectedSurahNum = currentSurahRef.current;
    const selectedSurahName = surahNameRef.current;
    const studentAudioBlob = await stopRecording();

    let studentText = "";
    if (studentAudioBlob && studentAudioBlob.size >= 1000) {
      try {
        studentText = await transcribeWithGroq(studentAudioBlob);
        if (!studentText) {
          console.warn('⚠️ Groq/Whisper вернул пустой текст, пробуем WebSpeech-фолбэк');
          studentText = await recorderRef.current.fallbackToWebSpeech();
        }
        console.log('📝 Whisper recitation text:', studentText);
      } catch (err) {
        console.error("Whisper Recitation Error:", err);
        studentText = 'Не удалось распознать текст.';
      }
    } else {
      studentText = 'Ученик не прочитал аят вслух.';
    }

    // А. Объявляем чтение ученика
    setAppState('speaking');
    await speakTeacherComment("Послушайте ваше чтение.", selectedTeacher);
    await new Promise(r => setTimeout(r, 600));
    isSpeakingRef.current = false;

    // Б. Воспроизводим запись ученика
    if (studentAudioBlob && studentAudioBlob.size >= 1000) {
      setAppState('playing');
      const studentUrl = URL.createObjectURL(studentAudioBlob);
      await playAudio(studentUrl);
      URL.revokeObjectURL(studentUrl);
      await new Promise(r => setTimeout(r, 300));
    }

    // В. Эталонное чтение
    setAppState('speaking');
    isSpeakingRef.current = true;
    await speakTeacherComment("А теперь эталонное чтение.", selectedTeacher);
    await new Promise(r => setTimeout(r, 600));
    isSpeakingRef.current = false;

    const referenceAyahData = await getAyahData(selectedSurahNum, 1);
    if (referenceAyahData && referenceAyahData.audioUrl) {
      setAppState('playing');
      await playAudio(referenceAyahData.audioUrl);
      await new Promise(r => setTimeout(r, 300));
    }

    // Г. Gemini — разбор
    setAppState('processing');
    isSpeakingRef.current = true;

    const finalFeedback = await callGemini(
      studentText || 'Ученик прочитал аят.',
      'ru-RU',
      selectedSurahName
    );

    setAppState('speaking');
    await speakTeacherComment(finalFeedback, selectedTeacher);
    await new Promise(r => setTimeout(r, 600));
    isSpeakingRef.current = false;

    // Завершение
    setAppState('sleeping');
    await new Promise(r => setTimeout(r, 2000));

    // Предлагаем продолжить
    setAppState('speaking');
    isSpeakingRef.current = true;
    await speakTeacherComment("Хотите продолжить? Назовите следующую суру.", selectedTeacher);
    isSpeakingRef.current = false;

    startListeningForSurah();
  };

  // === ЗАПИСЬ ЧЕРЕЗ VoiceRecorder ===
  const startRecording = async () => {
    if (!recorderRef.current) recorderRef.current = new VoiceRecorder();

    return new Promise((resolve) => {
      recorderRef.current.onStart = () => resolve();
      recorderRef.current.start();
    });
  };

  const stopRecording = async () => {
    return new Promise((resolve) => {
      if (!recorderRef.current) return resolve(null);

      recorderRef.current.onEnd = () => {
        // Собираем Blob здесь — единственное место, где это происходит.
        if (recorderRef.current.audioChunks && recorderRef.current.audioChunks.length > 0) {
          const mimeType = recorderRef.current.mediaRecorder?.mimeType || 'audio/webm';
          const blob = new Blob(recorderRef.current.audioChunks, { type: mimeType });
          recorderRef.current.audioChunks = [];
          resolve(blob);
        } else {
          resolve(null);
        }
      };

      recorderRef.current.stop();
    });
  };

  // === UI ===
  return (
    <div style={{
      height: '100vh', width: '100vw',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: appState === 'sleeping' ? '#071e1b'
        : appState === 'ask_surah' || appState === 'listening' ? '#0d5c52'
          : appState === 'playing' ? '#8a6d0b'
            : appState === 'processing' ? '#4a148c'
              : (teacher === 'aisha' ? '#781d42' : '#1d4878'),
      transition: 'background 0.8s ease',
      margin: 0, overflow: 'hidden'
    }}>
      <div style={{
        width: 240, height: 240, borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.1)',
        boxShadow: appState === 'ask_surah' || appState === 'listening'
          ? '0 0 80px rgba(80, 227, 194, 0.9)'
          : appState === 'playing'
            ? '0 0 80px rgba(255, 215, 0, 0.9)'
            : appState === 'processing'
              ? '0 0 80px rgba(156, 39, 176, 0.9)'
              : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.5s ease'
      }}>
        <div style={{
          width: 140, height: 140, borderRadius: '50%',
          background: appState === 'sleeping' ? 'rgba(255,255,255,0.2)' : '#ffffff',
          opacity: appState === 'sleeping' ? 0.3 : 0.9,
          transform: appState === 'ask_surah' || appState === 'listening' || appState === 'processing'
            ? 'scale(1.15)' : 'scale(1)',
          transition: 'all 0.4s ease'
        }} />
      </div>

      <div style={{
        position: 'fixed', bottom: 16, left: 0, right: 0,
        textAlign: 'center', color: 'rgba(255,255,255,0.4)',
        fontSize: 12, fontFamily: 'monospace', pointerEvents: 'none'
      }}>
        {appState} · {teacher} · {surahName}
      </div>
    </div>
  );
}