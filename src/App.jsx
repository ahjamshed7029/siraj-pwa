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

    const recognitionRef = useRef(null);
    const isManualStopRef = useRef(false);

    // Инициализация Speech Recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Ваш браузер не поддерживает распознавание речи');
            return;
        }

        const rec = new SpeechRecognition();
        rec.lang = 'ru-RU';
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        rec.continuous = false;

        rec.onstart = () => {
            console.log('🎤 Микрофон ВКЛЮЧЕН');
            setIsListening(true);
        };

        rec.onend = () => {
            console.log('🎤 Микрофон выключен');
            setIsListening(false);

            // Автоперезапуск только если не ручная остановка и мы ждем имя
            if (!isManualStopRef.current && step === 'ask_name') {
                console.log('🔄 Автоперезапуск через 500мс...');
                setTimeout(() => {
                    try {
                        if (recognitionRef.current) {
                            recognitionRef.current.start();
                            console.log('✅ Автоперезапуск успешен');
                        }
                    } catch (e) {
                        console.log('❌ Ошибка автоперезапуска:', e.message);
                    }
                }, 500);
            }
        };

        rec.onerror = (e) => {
            console.error('❌ Ошибка:', e.error);
            setIsListening(false);

            if (e.error === 'no-speech') {
                console.log('🔇 Тишина, перезапускаем...');
                setTimeout(() => {
                    try {
                        recognitionRef.current?.start();
                    } catch (err) {
                        console.log('Не удалось перезапустить после ошибки');
                    }
                }, 300);
            }
        };

        rec.onresult = (event) => {
            const resultText = event.results[0][0].transcript.trim();
            console.log('🗣️ Распознано:', resultText);

            if (resultText) {
                processVoiceInput(resultText);
            }
        };

        recognitionRef.current = rec;

        return () => {
            isManualStopRef.current = true;
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, [step]);

    const speakAndListen = (text) => {
        // Останавливаем текущую речь и микрофон
        window.speechSynthesis.cancel();

        isManualStopRef.current = true;
        if (recognitionRef.current) {
            try {
                recognitionRef.current.abort();
            } catch (e) { }
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ru-RU';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;

        utterance.onstart = () => {
            console.log('🔊 Учитель говорит...');
            setIsSpeaking(true);
        };

        utterance.onend = () => {
            console.log('🔇 Учитель закончил');
            setIsSpeaking(false);
            isManualStopRef.current = false;

            // Запускаем микрофон с задержкой
            setTimeout(() => {
                if (step === 'ask_name' && recognitionRef.current) {
                    try {
                        recognitionRef.current.start();
                        console.log('🎤 Микрофон запущен после речи');
                    } catch (e) {
                        console.error('❌ Ошибка запуска:', e.message);
                        // Пробуем еще раз
                        setTimeout(() => {
                            try {
                                recognitionRef.current?.start();
                            } catch (e2) {
                                console.error('❌ Повторная ошибка');
                            }
                        }, 1000);
                    }
                }
            }, 300);
        };

        utterance.onerror = (e) => {
            console.error('Ошибка синтеза речи:', e);
            setIsSpeaking(false);
            isManualStopRef.current = false;
        };

        window.speechSynthesis.speak(utterance);
    };

    const handleStartClick = () => {
        setStep('ask_name');
        speakAndListen("Ассаляму алейкум! Скажи, пожалуйста, как тебя зовут?");
    };

    const autoSelectTeacher = (name) => {
        const lowerName = name.toLowerCase().trim();

        // Женские имена и окончания
        const femalePatterns = ['а', 'я', 'ия', 'ья'];
        const isFemaleEnding = femalePatterns.some(end => lowerName.endsWith(end));

        const femaleNames = ['марьям', 'аиша', 'фатима', 'зейнаб', 'хадиджа', 'амина',
            'сара', 'мария', 'анна', 'софия', 'алиса', 'милана', 'алина',
            'мадина', 'айша', 'хава', 'асия'];
        const isFemaleName = femaleNames.some(n => lowerName.includes(n));

        const childPatterns = ['чка', 'нька', 'ушка', 'ик', 'ек'];
        const isChildish = childPatterns.some(p => lowerName.includes(p));

        return (isFemaleEnding || isFemaleName || isChildish) ? 'ayisha' : 'hasan';
    };

    const processVoiceInput = (voiceText) => {
        if (!voiceText || step !== 'ask_name') return;

        // Останавливаем микрофон
        isManualStopRef.current = true;
        if (recognitionRef.current) {
            recognitionRef.current.abort();
        }

        setUserName(voiceText);
        const assignedTeacher = autoSelectTeacher(voiceText);
        setTeacher(assignedTeacher);
        setStep('learning');

        const welcomeText = assignedTeacher === 'ayisha'
            ? `Здравствуй, ${voiceText}! Я Аиша. Давай изучать Коран вместе. Выбери суру.`
            : `Приветствую, ${voiceText}! Я Хасан. Начнем изучение. Выбери суру.`;

        const utterance = new SpeechSynthesisUtterance(welcomeText);
        utterance.lang = 'ru-RU';
        utterance.rate = 0.9;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
    };

    const loadSurah = async (surahNum) => {
        try {
            const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/ar.alafasy`);
            const data = await res.json();

            if (data.data?.verses) {
                setVerses(data.data.verses);
                setCurrentSurah(surahNum);

                const text = teacher === 'hasan'
                    ? "Слушай аяты и повторяй."
                    : "Слушай внимательно, я помогу.";

                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'ru-RU';
                utterance.onstart = () => setIsSpeaking(true);
                utterance.onend = () => setIsSpeaking(false);
                window.speechSynthesis.speak(utterance);
            }
        } catch (e) {
            console.error('Ошибка загрузки:', e);
        }
    };

    const getGlowColor = () => {
        if (isSpeaking) return '#9C27B0';
        if (isListening) return '#4CAF50';
        if (step === 'greeting') return '#FFD700';
        return '#2196F3';
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
                animation: isListening ? 'pulse 1.5s infinite' : 'none',
                cursor: step === 'greeting' ? 'pointer' : 'default',
                border: `2px solid ${glowColor}60`
            }}
                onClick={step === 'greeting' ? handleStartClick : undefined}>
                <span style={{ fontSize: '40px' }}>
                    {step === 'greeting' && '🌟'}
                    {step === 'ask_name' && isListening && '🎤'}
                    {step === 'ask_name' && isSpeaking && '👤'}
                    {step === 'learning' && '📖'}
                </span>
            </div>

            <div style={{
                marginTop: '24px',
                color: glowColor,
                fontSize: '14px',
                textAlign: 'center',
                opacity: 0.9
            }}>
                {step === 'greeting' && 'Нажми на свет'}
                {step === 'ask_name' && isListening && 'Говорите...'}
                {step === 'ask_name' && isSpeaking && 'Учитель говорит...'}
                {step === 'learning' && `${teacher === 'hasan' ? 'Хасан' : 'Аиша'} с вами`}
            </div>

            {step === 'learning' && (
                <div style={{ marginTop: '40px', display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {[
                        { num: 112, name: 'Аль-Ихляс' },
                        { num: 1, name: 'Аль-Фатиха' },
                        { num: 103, name: 'Аль-Аср' }
                    ].map(s => (
                        <button
                            key={s.num}
                            onClick={() => loadSurah(s.num)}
                            style={{
                                padding: '12px 20px',
                                background: `${glowColor}20`,
                                border: `1px solid ${glowColor}40`,
                                borderRadius: '10px',
                                color: glowColor,
                                cursor: 'pointer',
                                fontSize: '13px'
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
                    width: '400px'
                }}>
                    <p style={{
                        fontSize: '24px',
                        textAlign: 'right',
                        fontFamily: 'serif',
                        lineHeight: 2,
                        color: glowColor,
                        margin: 0,
                        direction: 'rtl'
                    }}>
                        {verses[currentIndex]?.text}
                    </p>
                </div>
            )}

            <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>
        </div>
    );
}