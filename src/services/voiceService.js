// voiceService.js - Исправленный способ записи голоса с защитой от Anti-Loop

export class VoiceRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.stream = null;
        this.isRecording = false;
        this.onResult = null;
        this.onError = null;
        this.onStart = null;
        this.onEnd = null;

        // Храним ссылку на встроенное распознавание
        this.activeFallbackRecognition = null;

        // Флаг защиты: предотвращает одновременные круговые перезапуски
        this.isResetting = false;
    }

    async start() {
        if (this.isResetting) return false;

        // Если уже пишем — сначала всё аккуратно чистим
        this.stop();

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000,
                    channelCount: 1
                }
            });

            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.isRecording = false;
                if (this.onEnd) this.onEnd();

                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                this.sendToServer(audioBlob);
            };

            this.mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder error:', event);
                this.handleError('recording_error');
            };

            this.mediaRecorder.start();
            this.isRecording = true;

            if (this.onStart) this.onStart();

            // Автоматическая остановка через 10 секунд
            this.timeoutId = setTimeout(() => {
                if (this.isRecording) {
                    this.stop();
                }
            }, 10000);

            return true;
        } catch (error) {
            console.error('Start recording error:', error);
            this.handleError(error.message);
            return false;
        }
    }

    stop() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }

        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            try {
                this.mediaRecorder.stop();
            } catch (e) {
                console.warn("MediaRecorder не удалось остановить:", e);
            }
        }
        this.isRecording = false;

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.activeFallbackRecognition) {
            this.activeFallbackRecognition.onend = null;
            this.activeFallbackRecognition.onerror = null;
            try {
                this.activeFallbackRecognition.abort();
            } catch (e) { }
            this.activeFallbackRecognition = null;
        }
    }

    // Централизованная обработка ошибок с защитой от мгновенного перезапуска
    handleError(errorMessage) {
        if (this.isResetting) return;
        this.isResetting = true;

        if (this.onError) this.onError(errorMessage);

        // Даем интерфейсу и браузеру 1.5 секунды "остыть", прежде чем разрешить новый старт
        setTimeout(() => {
            this.isResetting = false;
        }, 1500);
    }

    async sendToServer(audioBlob) {
        try {
            const base64Audio = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = () => reject(new Error('Ошибка чтения Blob'));
            });

            // ВАЖНО: Убедись, что на бэкенде (/api/recognize) таймаут ответа укладывается в лимиты Vercel
            const response = await fetch('/api/recognize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audio: base64Audio, language: 'uz-UZ' }) // Изменено на uz-UZ
            });

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }

            const data = await response.json();
            if (this.onResult && data.text) {
                this.onResult(data.text);
            }
        } catch (error) {
            console.error('Send to server error (переключаемся на фолбек встроенного распознавания):', error);

            // Запускаем фолбек, но НЕ триггерим внешнюю ошибку сразу, чтобы интерфейс не ушел в авто-перезапуск
            this.fallbackToWebSpeech();
        }
    }

    fallbackToWebSpeech() {
        if (this.activeFallbackRecognition) return;

        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            this.handleError('no_speech_recognition');
            return;
        }

        const r = new SR();
        this.activeFallbackRecognition = r;

        r.lang = 'uz-UZ'; // Изменено на uz-UZ для соответствия приложению
        r.continuous = false;
        r.interimResults = false;

        r.onresult = (ev) => {
            const text = ev.results[0][0].transcript;
            if (this.onResult) this.onResult(text);
        };

        r.onerror = (ev) => {
            if (ev.error === 'aborted' || ev.error === 'no-speech') {
                console.warn('Штатный сброс фолбека:', ev.error);
                return;
            }
            this.handleError(ev.error);
        };

        r.onend = () => {
            this.activeFallbackRecognition = null;
        };

        try {
            r.start();
        } catch (e) {
            console.error("Ошибка старта фолбека:", e);
            this.activeFallbackRecognition = null;
        }
    }
}