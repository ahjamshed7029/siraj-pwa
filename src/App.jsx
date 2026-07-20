import React, { useState, useEffect, useRef } from 'react';
import { callGemini } from './services/geminiClient'; // Импортируем ИИ

export default function App() {
    const [step, setStep] = useState('greeting'); // greeting, ask_name, learning
    const [userName, setUserName] = useState('');
    const [teacher, setTeacher] = useState(null);
    const [verses, setVerses] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentSurah, setCurrentSurah] = useState(null);
    
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    
    // Динамический язык (по умолчанию арабский)
    const [detectedLang, setDetectedLang] = useState('ar-SA');

    const recognitionRef = useRef(null);
    const isManualStopRef = useRef(false);

    // 1. Инициализация Speech Recognition ТОЛЬКО ОДИН РАЗ (убрали зависимость от step)
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('Speech recognition not supported');
            return;
        }

        const rec = new SpeechRecognition();
        rec.lang = detectedLang; // Используем динамический язык
        rec.interimResults = false;
        rec.continuous = false;

        rec.onstart = () => {
            console.log('🎤 Микрофон ВКЛЮЧЕН');
            setIsListening(true);
        };

        rec.onend = () => {
            console.log('🎤 Микрофон выключен');
            setIsListening(false);
        };

        rec.onerror = (e) => {
            console.error('❌ Ошибка микрофона:', e.error);
            setIsListening(false);
            isManualStopRef.current = false;
        };

        rec.onresult = async (event) => {
            const resultText = event.results[0][0].transcript.trim();
            // Браузер возвращает реальный распознанный язык (например, 'ru-RU' или 'ar-SA')
            const browserDetectedLang = event.results[0][0].lang || detectedLang;
            setDetectedLang(browserDetectedLang);
            
            console.log(`🗣️ Распознано (${browserDetectedLang}):`, resultText);

            if (resultText && !isManualStopRef.current) {
                await processVoiceInput(resultText, browserDetectedLang);
            }
        };

        recognitionRef.current = rec;

        return () => {
            isManualStopRef.current = true;
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, [detectedLang]); // Пересоздаем только если язык сменился

    // 2. Функция "Сказать и потом слушать" (исправленная, без багов)
    const speakThenListen = async (text, lang = 'ar-SA') => {
        window.speechSynthesis.cancel();
        isManualStopRef.current = true;
        if (recognitionRef.current) recognitionRef.current.abort();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.9;

        utterance.onstart = () => setIsSpeaking(true);
        
        utterance.onend = () => {
            setIsSpeaking(false);
            isManualStopRef.current = false;
            
            // Запускаем микрофон после того, как агент закончил говорить
            setTimeout(() => {
                if (recognitionRef.current && !isManualStopRef.current) {
                    try {
                        recognitionRef.current.start();
                    } catch (e) {
                        console.error('Ошибка запуска микрофона:', e);
                    }
                }
            }, 500);
        };

        window.speechSynthesis.speak(utterance);
    };

    // 3. Обработка голоса пользователя
    const processVoiceInput = async (voiceText, lang) => {
        if (step === 'ask_name') {
            setUserName(voiceText);
            const isFemale = voiceText.toLowerCase().match(/(а|я|ия|марьям|аиша|фатима)$/);
            const assignedTeacher = isFemale ? 'ayisha' : 'hasan';
            setTeacher(assignedTeacher);
            setStep('learning');
            
            const welcome = assignedTeacher === 'ayisha' 
                ? `Здравствуй, ${voiceText}! Я Аиша. Давай изучать Коран вместе.` 
                : `Приветствую, ${voiceText}! Я Хасан. Начнем изучение.`;
            
            speakThenListen(welcome, lang);
            return;
        }

        if (step === 'learning') {
            setIsThinking(true);
            // Отправляем в ИИ (Gemini)
            const aiResponse = await callGemini(voiceText, lang);
            setIsThinking(false);
            
            // Агент говорит ответ ИИ
            speakThenListen(aiResponse, lang);
        }
    };

    const handleStartClick = () => {
        setStep('ask_name');
        speakThenListen("أهلاً بك! من فضلك، ما اسمك؟", 'ar-SA'); // Начинаем с арабского приветствия
    };

    const loadSurah = async (surahNum) => {
        try {
            const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/ar.alafasy`);
            const data = await res.json();
            if (data.data?.verses) {
                setVerses(data.data.verses);
                setCurrentSurah(surahNum);
                setCurrentIndex(0);
                speakThenListen("Слушай аяты и повторяй за мной.", detectedLang);
            }
        } catch (e) {
            console.error('Ошибка загрузки суры:', e);
        }
    };

    const getGlowColor = () => {
        if (isThinking) return '#9C27B0'; // Фиолетовый: думает
        if (isSpeaking) return '#2196F3'; // Синий: говорит
        if (isListening) return '#4CAF50'; // Зеленый: слушает
        return '#FFD700'; // Золотой: ожидание
    };

    const glowColor = getGlowColor();

    return (
        <div style={{
            minHeight: '100vh',
            background: '#0a0a0a',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, sans-serif',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{
                position: 'absolute',
                width: '300px',
                height: '300px',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${glowColor}40 0%, transparent 70%)`,
                filter: 'blur(50px)',
                transition: 'all 1s ease'
            }} />

            <div style={{
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${glowColor} 0%, ${glowColor}80 40%, ${glowColor}20 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 0 50px ${glowColor}80, 0 0 100px ${glowColor}40`,
                transition: 'all 0.8s ease',
                animation: (isListening || isThinking) ? 'pulse 1.5s infinite' : 'none',
                cursor: step === 'greeting' ? 'pointer' : 'default',
                border: `2px solid ${glowColor}60`
            }} onClick={step === 'greeting' ? handleStartClick : undefined}>
                <span style={{ fontSize: '40px' }}>
                    {step === 'greeting' && '🌟'}
                    {isListening && '🎤'}
                    {isThinking && '🧠'}
                    {isSpeaking && '🔊'}
                    {step === 'learning' && !isListening && !isSpeaking && '📖'}
                </span>
            </div>

            <div style={{
                marginTop: '24px',
                color: glowColor,
                fontSize: '16px',
                textAlign: 'center',
                opacity: 0.9,
                fontWeight: 500
            }}>
                {step === 'greeting' && 'Нажми на свет, чтобы начать / اضغط للبدء'}
                {isListening && 'Слушаю... / أستمع...'}
                {isThinking && 'Думаю... / أفكر...'}
                {isSpeaking && 'Говорю... / أتحدث...'}
                {step === 'learning' && !isListening && !isSpeaking && 'Готов к вопросам / أنا جاهز'}
            </div>

            {step === 'learning' && (
                <div style={{ marginTop: '40px', display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {[
                        { num: 112, name: 'Аль-Ихляс' },
                        { num: 1, name: 'Аль-Фатиха' },
                        { num: 103, name: 'Аль-Аср' }
                    ].map(s => (
                        <button key={s.num} onClick={() => loadSurah(s.num)} style={{
                            padding: '12px 20px',
                            background: `${glowColor}20`,
                            border: `1px solid ${glowColor}40`,
                            borderRadius: '10px',
                            color: glowColor,
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}>
                            {s.name}
                        </button>
                    ))}
                </div>
            )}

            {verses.length > 0 && (
                <div style={{
                    marginTop: '24px',
                    padding: '20px',
                    background: '#1a1a1a',
                    borderRadius: '12px',
                    maxWidth: '90%',
                    width: '400px',
                    border: `1px solid ${glowColor}30`
                }}>
                    <p style={{
                        fontSize: '26px',
                        textAlign: 'right',
                        fontFamily: 'serif',
                        lineHeight: 2,
                        color: '#FFD700',
                        margin: 0,
                        direction: 'rtl'
                    }}>
                        {verses[currentIndex]?.text}
                    </p>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '15px'}}>
                         <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0} style={{color: '#fff', background: 'transparent', border: 'none', cursor: 'pointer'}}>◀️ Назад</button>
                         <button onClick={() => setCurrentIndex(Math.min(verses.length - 1, currentIndex + 1))} disabled={currentIndex === verses.length - 1} style={{color: '#fff', background: 'transparent', border: 'none', cursor: 'pointer'}}>Вперёд ▶️</button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); box-shadow: 0 0 50px ${glowColor}80; }
                    50% { transform: scale(1.05); box-shadow: 0 0 80px ${glowColor}cc; }
                    100% { transform: scale(1); box-shadow: 0 0 50px ${glowColor}80; }
                }
            `}</style>
        </div>
    );
}