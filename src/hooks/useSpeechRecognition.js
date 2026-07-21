import { useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { isSpeaking, stopTTS } from '../services/ttsService';

export function useSpeechRecognition() {
    const setListening = useAppStore(s => s.setListening);
    const recognitionRef = useRef(null);
    const shouldRestartRef = useRef(true); // главный флаг для Алисы

    const stopListening = useCallback((permanent = false) => {
        if (permanent) shouldRestartRef.current = false;

        if (recognitionRef.current) {
            try {
                recognitionRef.current.onend = null;
                recognitionRef.current.abort();
            } catch(e) {}
            recognitionRef.current = null;
        }
        setListening(false);
    }, [setListening]);

    const startListening = useCallback(async (onResult) => {
        shouldRestartRef.current = true;
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        try { await navigator.mediaDevices.getUserMedia({ audio: true }); } catch(e) { return; }

        // если уже работает - не запускаем второй раз
        if (recognitionRef.current) return;

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = false; // для Алисы лучше false + рестарт
        recognition.interimResults = true; // ВАЖНО для barge-in
        recognition.lang = useAppStore.getState().detectedLang || 'ru-RU';

        recognition.onstart = () => setListening(true);

        // Фишка Алисы - перебивание
        recognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript;
            const isFinal = event.results[event.results.length - 1].isFinal;

            // Если мы говорим и пользователь начал говорить - перебиваем
            if (!isFinal && isSpeaking()) {
                stopTTS();
            }

            if (isFinal) {
                const text = transcript.trim();
                if (text) {
                    useAppStore.getState().setTranscript(text);
                    stopListening(); // стопаем перед обработкой
                    onResult?.(text);
                }
            }
        };

        recognition.onerror = (e) => {
            if (e.error === 'no-speech' || e.error === 'aborted') {
                // просто рестарт
            } else {
                console.error(e);
            }
        };

        recognition.onend = () => {
            recognitionRef.current = null;
            setListening(false);
            // АВТО-РЕСТАРТ как у Алисы, если мы не в режиме SPEAKING/THINKING
            const { glow } = useAppStore.getState();
            if (shouldRestartRef.current &&!glow) {
                setTimeout(() => startListening(onResult), 300);
            }
        };

        try { recognition.start(); } catch(e) { recognitionRef.current = null; }
    }, [setListening, stopListening]);

    return { startListening, stopListening };
}