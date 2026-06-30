import { useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';

export function useSpeechRecognition() {
    const setListening = useAppStore((s) => s.setListening);
    const setTranscript = useAppStore((s) => s.setTranscript);
    const detectedLang = useAppStore((s) => s.detectedLang);

    // Ссылка на инстанс распознавания
    const recognitionRef = useRef(null);
    // Флаг для предотвращения race conditions при остановке
    const isStoppingRef = useRef(false);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            isStoppingRef.current = true;

            // Отвязываем обработчик завершения, чтобы не дергать стейты лишний раз
            recognitionRef.current.onend = null;
            recognitionRef.current.onerror = null;

            try {
                recognitionRef.current.stop(); // Мягкая остановка (сохраняет надиктованный текст)
            } catch (e) {
                try {
                    recognitionRef.current.abort(); // Жесткий сброс, если stop() не сработал
                } catch (err) {
                    console.warn("Поток уже был остановлен:", err);
                }
            }

            recognitionRef.current = null;
            setListening(false);
        }
    }, [setListening]);

    const startListening = useCallback(async (onResult) => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Speech recognition is not supported. Please use Chrome.');
            return null;
        }

        // 1. Проверяем / запрашиваем доступ к микрофону перед запуском логики
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e) {
            alert("Нет доступа к микрофону");
            console.error(e);
            return null;
        }

        // 2. ЗАЩИТА: Если старый инстанс уже существует и работает — полностью обнуляем его
        if (recognitionRef.current) {
            try {
                recognitionRef.current.onstart = null;
                recognitionRef.current.onend = null;
                recognitionRef.current.onerror = null;
                recognitionRef.current.onresult = null;
                recognitionRef.current.abort(); // Выжигаем старый процесс
            } catch (e) {
                console.warn("Ошибка при сбросе старого инстанса:", e);
            }
        }

        isStoppingRef.current = false;
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        // Настройки Web Speech API
        recognition.continuous = false; // Выключаемся автоматически после одной законченной фразы
        recognition.interimResults = false; // Игнорируем промежуточные результаты, ждем финал
        recognition.lang = detectedLang || navigator.language || 'ru-RU';

        // Handler начала записи
        recognition.onstart = () => {
            if (!isStoppingRef.current) {
                setListening(true);
            }
        };

        // Handler успешного получения текста
        recognition.onresult = (event) => {
            const lastIndex = event.results.length - 1;
            const transcript = event.results[lastIndex][0].transcript;
            const confidence = event.results[lastIndex][0].confidence;

            setTranscript(transcript);

            const detected = event.results[lastIndex][0].lang;
            if (detected) {
                useAppStore.getState().setDetectedLang(detected);
            }

            // Мягко гасим микрофон, так как фраза уже получена
            stopListening();

            // Передаем текст в ИИ (FastAPI / Next.js роут)
            if (onResult) {
                onResult(transcript, confidence);
            }
        };

        // Handler ошибок (главный щит от зацикливания)
        recognition.onerror = (event) => {
            // Если это штатный сброс микрофона или пользователь промолчал — просто выходим
            if (event.error === 'aborted' || event.error === 'no-speech') {
                console.warn('Распознавание остановлено в штатном режиме:', event.error);
                return;
            }

            // Любые другие критические ошибки (audio-capture, not-allowed)
            console.error('Критическая ошибка Speech Recognition:', event.error);
            stopListening();
        };

        // Handler полного закрытия потока браузером
        recognition.onend = () => {
            if (!isStoppingRef.current) {
                setListening(false);
                recognitionRef.current = null;
            }
        };

        // Запуск сессии распознавания
        try {
            recognition.start();
        } catch (e) {
            console.error("Не удалось запустить Speech Recognition:", e);
        }

        return recognition;
    }, [detectedLang, setListening, setTranscript, stopListening]);

    return { startListening, stopListening };
}