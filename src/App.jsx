import React, { useState, useEffect, useRef } from 'react';

export default function App() {
    const [step, setStep] = useState('greeting');
    const [userName, setUserName] = useState('');
    const [teacher, setTeacher] = useState(null);
    const [verses, setVerses] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentSurah, setCurrentSurah] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [lightColor, setLightColor] = useState('#e0a92a'); // Цвет свечения

    const recognitionRef = useRef(null);
    const restartTimeoutRef = useRef(null);
    const isRestartingRef = useRef(false);
    const lastSpeechTimeRef = useRef(0);

    // Сброс защиты при монтировании
    useEffect(() => {
        // Чистим все таймеры при размонтировании
        return () => {
            if (restartTimeoutRef.current) {
                clearTimeout(restartTimeoutRef.current);
            }
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    // Инициализация микрофона
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error("Speech Recognition не поддерживается");
            return;
        }

        const rec = new SpeechRecognition();
        rec.lang = 'ru-RU';
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        rec.continuous = false;

        rec.onstart = () => {
            console.log('🎤 Микрофон включен');
            setIsListening(true);
            setLightColor('#4CAF50'); // Зеленый - слушаем
        };

        rec.onend = () => {
            console.log('🎤 Микрофон выключен');
            setIsListening(false);

            // Автоматический перезапуск только если мы на шаге ask_name
            // и не было речи последние 2 секунды
            if (step === 'ask_name' && !isRestartingRef.current) {
                const timeSinceLastSpeech = Date.now() - lastSpeechTimeRef.current;
                if (timeSinceLastSpeech > 2000) {
                    isRestartingRef.current = true;
                    restartTimeoutRef.current = setTimeout(() => {
                        tryRestartRecognition();
                        isRestartingRef.current = false;
                    }, 800);
                }
            }
        };

        rec.onerror = (e) => {
            console.error('❌ Ошибка микрофона:', e.error);
            setIsListening(false);
            setLightColor('#f44336'); // Красный при ошибке

            // Игнорируем aborted при ручной остановке
            if (e.error === 'aborted') return;

            // Для no-speech просто пытаемся перезапустить с задержкой
            if (e.error === 'no-speech' && step === 'ask_name' && !isRestartingRef.current) {
                isRestartingRef.current = true;
                restartTimeoutRef.current = setTimeout(() => {
                    tryRestartRecognition();
                    isRestartingRef.current = false;
                }, 1000);
            }
        };

        rec.onresult = (event) => {
            lastSpeechTimeRef.current = Date.now();
            const resultText = event.results[0][0].transcript.replace(/\.$/, '').trim();
            setLightColor('#FFD700'); // Золотой - обрабатываем речь
            console.log('🗣️ Распознано:', resultText);
            processVoiceInput(resultText);
        };

        recognitionRef.current = rec;
    }, [step]);

    const tryRestartRecognition = () => {
        if (!recognitionRef.current || step !== 'ask_name') return;

        try {
            recognitionRef.current.start();
            console.log('🔄 Перезапуск микрофона');
        } catch (e) {
            console.log('⚠️ Не удалось перезапустить:', e.message);
            // Если не удалось, пробуем еще раз через секунду
            setTimeout(() => {
                try {
                    recognitionRef.current?.start();
                } catch (e2) {
                    console.log('❌ Повторный перезапуск не удался');
                }
            }, 1000);
        }
    };

    const speakAndListen = (text) => {
        // Отменяем предыдущую речь
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ru-RU';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;

        utterance.onstart = () => {
            setIsSpeaking(true);
            setLightColor('#9C27B0'); // Фиолетовый - учитель говорит
            // Останавливаем микрофон пока говорит учитель
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.abort();
                } catch (e) { }
            }
        };

        utterance.onend = () => {
            setIsSpeaking(false);
            console.log('🔇 Учитель закончил говорить');

            // Запускаем микрофон с задержкой после речи
            setTimeout(() => {
                if (step === 'ask_name' && recognitionRef.current) {
                    try {
                        recognitionRef.current.start();
                        console.log('🎤 Микрофон включен после речи учителя');
                    } catch (e) {
                        console.log('⚠️ Ошибка запуска после речи:', e.message);
                    }
                }
            }, 500);
        };

        window.speechSynthesis.speak(utterance);
    };

    const handleStartClick = () => {
        setStep('ask_name');
        const text = "Скажи, пожалуйста, как тебя зовут?";
        speakAndListen(text);
    };

    const autoSelectTeacher = (name) => {
        const lowerName = name.toLowerCase();

        const femaleIndicators = ['а', 'я', 'ия', 'ья'];
        const endsWithFemale = femaleIndicators.some(end => lowerName.endsWith(end));

        const childIndicators = ['чик', 'нек', 'еньк', 'ушк', 'ик', 'ок'];
        const isChildish = childIndicators.some(ind => lowerName.includes(ind));

        const femaleNames = ['марьям', 'аиша', 'фатима', 'зейнаб', 'хадиджа', 'амина', 'сара', 'мария', 'анна', 'софия', 'алиса', 'милана'];
        const isFemaleName = femaleNames.some(name => lowerName.includes(name));

        if (endsWithFemale || isChildish || isFemaleName) {
            return 'ayisha';
        }
        return 'hasan';
    };

    const processVoiceInput = (voiceText) => {
        if (!voiceText || step !== 'ask_name') return;

        // Останавливаем микрофон
        if (recognitionRef.current) {
            try {
                recognitionRef.current.abort();
            } catch (e) { }
        }

        setUserName(voiceText);
        const assignedTeacher = autoSelectTeacher(voiceText);
        setTeacher(assignedTeacher);
        setStep('learning');

        let welcomeText = assignedTeacher === 'ayisha'
            ? `Здравствуй, ${voiceText}! Меня зовут Аиша. Я помогу тебе в изучении Корана. Выбирай суру, и мы начнем.`
            : `Приветствую, ${voiceText}. Я твой наставник Хасан. Вместе мы изучим Коран. Выбирай суру для начала.`;

        // Просто озвучиваем, микрофон больше не включаем
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(welcomeText);
        utt.lang = 'ru-RU';
        utt.rate = 0.9;
        utt.onstart = () => {
            setIsSpeaking(true);
            setLightColor('#9C27B0');
        };
        utt.onend = () => {
            setIsSpeaking(false);
            setLightColor('#e0a92a');
        };
        window.speechSynthesis.speak(utt);
    };

    const loadSurah = async (surahNum) => {
        try {
            const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/ar.alafasy`);
            const result = await res.json();

            if (result.code === 200 && result.data?.verses) {
                setVerses(result.data.verses);
                setCurrentIndex(0);
                setCurrentSurah(surahNum);

                const text = teacher === 'hasan'
                    ? "Слушай внимательно аяты и повторяй. Я исправлю ошибки."
                    : "Слушай эти прекрасные аяты. Я помогу тебе с произношением.";

                const utt = new SpeechSynthesisUtterance(text);
                utt.lang = 'ru-RU';
                utt.onstart = () => {
                    setIsSpeaking(true);
                    setLightColor('#9C27B0');
                };
                utt.onend = () => {
                    setIsSpeaking(false);
                    setLightColor('#e0a92a');
                };
                window.speechSynthesis.speak(utt);
            }
        } catch (e) {
            console.error('Ошибка загрузки суры:', e);
        }
    };

    // Определяем финальный цвет свечения
    const getGlowColor = () => {
        if (isSpeaking) return '#9C27B0'; // Фиолетовый - говорит учитель
        if (isListening) return '#4CAF50'; // Зеленый - слушаем ученика
        if (step === 'greeting') return '#e0a92a'; // Золотой - ожидание
        return '#2196F3'; // Синий - режим обучения
    };

    const finalGlowColor = getGlowColor();

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

            {/* Фоновое свечение */}
            <div style={{
                position: 'absolute',
                width: '400px',
                height: '400px',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${finalGlowColor}40 0%, transparent 70%)`,
                filter: 'blur(60px)',
                transition: 'all 1s ease',
                pointerEvents: 'none'
            }} />

            {/* Центральный индикатор */}
            <div style={{
                width: '200px',
                height: '200px',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${finalGlowColor} 0%, ${finalGlowColor}80 40%, ${finalGlowColor}20 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 0 60px ${finalGlowColor}80, 0 0 120px ${finalGlowColor}40`,
                transition: 'all 0.8s ease',
                animation: isListening ? 'pulse 1.5s infinite' : 'none',
                cursor: step === 'greeting' ? 'pointer' : 'default',
                border: `3px solid ${finalGlowColor}60`
            }}
                onClick={step === 'greeting' ? handleStartClick : undefined}
            >
                <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: '#0a0a0a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '36px',
                    filter: 'brightness(1.2)'
                }}>
                    {step === 'greeting' && '🌟'}
                    {step === 'ask_name' && isListening && '🎤'}
                    {step === 'ask_name' && isSpeaking && '👤'}
                    {step === 'learning' && teacher === 'hasan' && '📖'}
                    {step === 'learning' && teacher === 'ayisha' && '📚'}
                </div>
            </div>

            {/* Статус */}
            <div style={{
                marginTop: '30px',
                color: finalGlowColor,
                fontSize: '16px',
                fontWeight: '500',
                textAlign: 'center',
                opacity: 0.8,
                letterSpacing: '1px',
                transition: 'color 0.8s ease'
            }}>
                {step === 'greeting' && 'Нажми на свет, чтобы начать'}
                {step === 'ask_name' && isListening && 'Я слушаю тебя...'}
                {step === 'ask_name' && isSpeaking && 'Учитель спрашивает...'}
                {step === 'learning' && (teacher === 'hasan' ? 'Хасан ждет твоего выбора' : 'Аиша готова помочь')}
            </div>

            {/* Кнопки выбора суры (только в режиме обучения) */}
            {step === 'learning' && (
                <div style={{
                    marginTop: '40px',
                    display: 'flex',
                    gap: '20px'
                }}>
                    {[
                        { num: 112, name: 'Аль-Ихляс' },
                        { num: 1, name: 'Аль-Фатиха' },
                        { num: 103, name: 'Аль-Аср' }
                    ].map(surah => (
                        <button
                            key={surah.num}
                            onClick={() => loadSurah(surah.num)}
                            style={{
                                padding: '12px 24px',
                                background: 'transparent',
                                border: `2px solid ${finalGlowColor}40`,
                                borderRadius: '12px',
                                color: finalGlowColor,
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = `${finalGlowColor}20`;
                                e.target.style.borderColor = finalGlowColor;
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'transparent';
                                e.target.style.borderColor = `${finalGlowColor}40`;
                            }}
                        >
                            {surah.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Отображение аятов */}
            {verses.length > 0 && (
                <div style={{
                    marginTop: '30px',
                    padding: '30px',
                    background: '#1a1a1a',
                    borderRadius: '16px',
                    border: '1px solid #333',
                    maxWidth: '600px',
                    width: '90%'
                }}>
                    <p style={{
                        fontSize: '28px',
                        textAlign: 'right',
                        fontFamily: 'serif',
                        lineHeight: 2,
                        color: finalGlowColor,
                        margin: 0,
                        direction: 'rtl'
                    }}>
                        {verses[currentIndex]?.text}
                    </p>
                </div>
            )}

            <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
        </div>
    );
}