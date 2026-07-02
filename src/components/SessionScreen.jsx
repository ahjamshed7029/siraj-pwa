import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getTeacherResponse } from '../services/teacherService';
import { getAyahText, getAyahAudioUrl } from '../services/quranApi';
import { playFeedbackSound, playAyahAudio } from '../services/soundPlayer';

export default function SessionScreen() {
    const stage = useAppStore((s) => s.stage);
    const mentorName = useAppStore((s) => s.mentorName);
    const isListening = useAppStore((s) => s.isListening);
    const lastResponse = useAppStore((s) => s.lastResponse);
    const lastTranscript = useAppStore((s) => s.lastTranscript);
    const currentSurah = useAppStore((s) => s.currentSurah);
    const currentAyah = useAppStore((s) => s.currentAyah);
    const ayahText = useAppStore((s) => s.ayahText);
    const detectedLang = useAppStore((s) => s.detectedLang);

    const setStage = useAppStore((s) => s.setStage);
    const setAyah = useAppStore((s) => s.setAyah);
    const setGlow = useAppStore((s) => s.setGlow);
    const setResponse = useAppStore((s) => s.setResponse);
    const setListening = useAppStore((s) => s.setListening);
    const setTranscript = useAppStore((s) => s.setTranscript);
    const setDetectedLang = useAppStore((s) => s.setDetectedLang);

    const recognitionRef = useRef(null);
    const [debug, setDebug] = useState('Нажми кнопку');
    const [isProcessing, setIsProcessing] = useState(false);

    // ПРОСТАЯ ФУНКЦИЯ ЗАПУСКА
    function startListening() {
        // Проверяем поддержку
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            setDebug('❌ Браузер не поддерживает голос');
            setResponse('Используй Google Chrome');
            return;
        }

        // Если уже слушаем - останавливаем
        if (recognitionRef.current) {
            try {
                recognitionRef.current.abort();
            } catch (e) { }
            recognitionRef.current = null;
            setListening(false);
            setDebug('⏹️ Остановлено');
            return;
        }

        setDebug('🎤 Запускаю...');

        const r = new SR();
        r.continuous = false;
        r.interimResults = true;
        r.maxAlternatives = 1;
        r.lang = 'ru-RU';

        // Таймаут 10 секунд
        let timeoutId = setTimeout(() => {
            setDebug('⏱️ Таймаут');
            setListening(false);
            try { r.abort(); } catch (e) { }
            recognitionRef.current = null;
        }, 10000);

        r.onstart = () => {
            clearTimeout(timeoutId);
            setListening(true);
            setDebug('🎤 СЛУШАЮ... Говори!');
        };

        r.onresult = (ev) => {
            clearTimeout(timeoutId);
            setListening(false);

            const text = ev.results[ev.results.length - 1][0].transcript;
            const confidence = ev.results[ev.results.length - 1][0].confidence || 0;

            setDebug(`✅ "${text}" (${Math.round(confidence * 100)}%)`);
            setTranscript(text);

            if (ev.results[0][0].lang) {
                setDetectedLang(ev.results[0][0].lang);
            }

            recognitionRef.current = null;

            // Обрабатываем текст
            if (text && text.trim().length > 0) {
                processText(text);
            } else {
                setDebug('⚠️ Пусто, попробуй еще раз');
                setTimeout(() => startListening(), 1000);
            }
        };

        r.onerror = (ev) => {
            clearTimeout(timeoutId);
            setListening(false);
            const err = ev.error;

            // Игнорируем aborted - это нормально
            if (err === 'aborted') {
                setDebug('⏹️ Отменено');
                recognitionRef.current = null;
                return;
            }

            setDebug(`❌ Ошибка: ${err}`);

            if (err === 'no-speech') {
                setResponse('🔇 Не услышал. Попробуй громче');
                // Автоповтор
                setTimeout(() => {
                    if (!recognitionRef.current && !isProcessing) {
                        startListening();
                    }
                }, 2000);
            } else if (err === 'not-allowed') {
                setResponse('🔒 Разреши микрофон в настройках');
                setDebug('🔒 Нажми на 🔒 в адресной строке → Микрофон → Разрешить');
            } else if (err === 'audio-capture') {
                setResponse('🎙️ Ошибка микрофона. Перезагрузи страницу');
            } else if (err === 'network') {
                setResponse('🌐 Ошибка сети');
            } else {
                setResponse(`⚠️ ${err}`);
            }

            recognitionRef.current = null;
        };

        r.onend = () => {
            clearTimeout(timeoutId);
            setListening(false);
            setDebug('⏹️ Завершено');
            // Не обнуляем ref здесь
        };

        // ЗАПУСКАЕМ
        try {
            recognitionRef.current = r;
            r.start();
            setDebug('▶️ Старт!');
        } catch (e) {
            clearTimeout(timeoutId);
            setListening(false);
            setDebug('💥 Ошибка: ' + e.message);
            recognitionRef.current = null;
        }
    }

    // ОБРАБОТКА ТЕКСТА
    async function processText(text) {
        if (isProcessing) return;
        setIsProcessing(true);
        setListening(false);

        try {
            const result = await getTeacherResponse(text);

            if (result.language) setDetectedLang(result.language);

            if (result.color) {
                setGlow(result.color);
                playFeedbackSound(result.color);
            }

            if (result.text) {
                setResponse(result.text);
                speakText(result.text, result.language || detectedLang || 'ru-RU');
            } else {
                // Если нет текста - слушаем снова
                setTimeout(() => {
                    if (!recognitionRef.current) {
                        startListening();
                    }
                }, 1000);
            }
        } catch (e) {
            console.error('Process error:', e);
            setResponse('Ошибка. Попробуй еще раз.');
            setTimeout(() => {
                if (!recognitionRef.current) {
                    startListening();
                }
            }, 2000);
        }

        setIsProcessing(false);
    }

    // ОЗВУЧИВАНИЕ
    function speakText(text, lang) {
        window.speechSynthesis.cancel();

        const u = new SpeechSynthesisUtterance(text);
        if (lang) u.lang = lang;
        u.rate = 0.9;
        u.pitch = 1;
        u.volume = 1;

        u.onend = () => {
            // После успешного завершения речи бота — плавно включаем микрофон
            setTimeout(() => {
                if (!recognitionRef.current && !isProcessing) {
                    console.log("Бот договорил, запускаем микрофон...");
                    startListening();
                }
            }, 800); // Немного увеличили паузу (до 800мс), чтобы аудио-канал успел полностью освободиться
        };

        u.onerror = (event) => {
            console.error("Ошибка синтеза речи (TTS):", event);

            // Защита: Если озвучка упала, НЕ запускаем микрофон автоматически!
            // Это разрывает бесконечную петлю [Anti-Loop]
            setDebug('⚠️ Ошибка вывода звука. Нажми на микрофон вручную.');
            setListening(false);
        };

        window.speechSynthesis.speak(u);
    }

    // КНОПКА
    function handleClick() {
        if (isProcessing) {
            setDebug('⏳ Обрабатываю...');
            return;
        }

        // Если слушаем - останавливаем
        if (recognitionRef.current) {
            try {
                recognitionRef.current.abort();
            } catch (e) { }
            recognitionRef.current = null;
            setListening(false);
            setDebug('⏹️ Остановлено');
            return;
        }

        // Иначе запускаем вручную
        setDebug('👆 Нажата кнопка');
        startListening();
    }
    // ИНИЦИАЛИЗАЦИЯ
    useEffect(() => {
        // Проверка поддержки
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            setDebug('❌ SpeechRecognition не поддерживается');
            setResponse('Используй Google Chrome');
        } else {
            setDebug('✅ Готов. Нажми кнопку');
        }

        // Приветствие
        setTimeout(() => {
            const greeting = 'Ассаляму алейкум. Вы брат или сестра?';
            setResponse(greeting);
            speakText(greeting, 'ru-RU');
        }, 1000);

        return () => {
            if (recognitionRef.current) {
                try { recognitionRef.current.abort(); } catch (e) { }
            }
            window.speechSynthesis.cancel();
        };
    }, []);

    const mentorLabel = mentorName === 'hassan' ? 'HASSAN' : 'AISHA';

    return (
        <div style={{
            height: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '30px 16px',
            background: '#0a0a0a'
        }}>
            {/* Top */}
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    fontSize: '12px',
                    letterSpacing: '3px',
                    color: '#d4af37',
                    textTransform: 'uppercase',
                    marginBottom: '4px'
                }}>
                    {mentorLabel}
                </div>
                <div style={{
                    fontSize: '11px',
                    color: isListening ? '#4caf50' : '#555',
                    transition: 'color 0.3s'
                }}>
                    {isListening ? '● LISTENING' : '○ WAITING'}
                </div>
            </div>

            {/* Ayah */}
            {stage === 'quran_practice' && ayahText && (
                <div style={{
                    fontSize: '28px',
                    lineHeight: '2',
                    color: '#e0e0e0',
                    textAlign: 'center',
                    direction: 'rtl',
                    padding: '16px'
                }}>
                    {ayahText}
                </div>
            )}

            {/* Response */}
            <div style={{
                fontSize: '15px',
                color: '#999',
                textAlign: 'center',
                minHeight: '60px',
                maxWidth: '90%',
                lineHeight: '1.6'
            }}>
                {lastResponse || '...'}
            </div>

            {/* Debug */}
            <div style={{
                fontSize: '11px',
                color: '#f44336',
                textAlign: 'center',
                minHeight: '30px',
                maxWidth: '90%',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                background: 'rgba(255,0,0,0.05)',
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid rgba(255,0,0,0.1)'
            }}>
                {debug}
            </div>

            {/* Bottom */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                {/* Waves */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '24px' }}>
                    {isListening &&
                        [0, 1, 2, 3, 4].map((i) => (
                            <div key={i} style={{
                                width: '5px',
                                height: '18px',
                                background: '#4caf50',
                                borderRadius: '3px',
                                animation: `bpulse ${0.3 + i * 0.1}s ease-in-out infinite alternate`
                            }} />
                        ))}
                    {!isListening && lastTranscript && (
                        <div style={{ fontSize: '11px', color: '#444' }}>"{lastTranscript}"</div>
                    )}
                </div>

                {/* BIG Mic button */}
                <button
                    onClick={handleClick}
                    disabled={isProcessing}
                    style={{
                        width: '140px',
                        height: '140px',
                        borderRadius: '50%',
                        border: isListening ? '3px solid #4caf50' : '3px solid #d4af37',
                        background: isListening ? 'rgba(76,175,80,0.2)' : 'rgba(212,175,55,0.1)',
                        color: isListening ? '#4caf50' : '#d4af37',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                        WebkitTapHighlightColor: 'transparent',
                        touchAction: 'manipulation',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.3s ease',
                        opacity: isProcessing ? 0.5 : 1,
                        userSelect: 'none'
                    }}
                >
                    <span style={{ fontSize: '36px' }}>
                        {isListening ? '⏹️' : '🎤'}
                    </span>
                    <span>
                        {isListening ? 'СТОП' :
                            isProcessing ? 'ЖДИ' :
                                'ГОВОРИ'}
                    </span>
                </button>
            </div>

            <style>{`
                @keyframes bpulse {
                    from { transform: scaleY(0.5); opacity: 0.4; }
                    to { transform: scaleY(1); opacity: 1; }
                }
                button {
                    touch-action: manipulation;
                    -webkit-tap-highlight-color: transparent;
                }
            `}</style>
        </div>
    );
}