// voiceService.js - Исправленный способ записи голоса

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

        // Храним ссылку на встроенное распознавание, чтобы контролировать его
        this.activeFallbackRecognition = null;
    }

    async start() {
        // Если уже пишем или работает фолбек — сначала все чистим
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
                if (this.onError) this.onError('recording_error');
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
            if (this.onError) this.onError(error.message);
            return false;
        }
    }

    stop() {
        // Сбрасываем таймер авто-остановки
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }

        // Останавливаем MediaRecorder
        if (this.mediaRecorder && this.isRecording) {
            try {
                this.mediaRecorder.stop();
            } catch (e) {
                console.warn("MediaRecorder уже был остановлен:", e);
            }
        }
        this.isRecording = false;

        // Гасим микрофонные треки
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        // КРИТИЧНО: Если работал фолбек Web Speech API — принудительно выключаем его
        if (this.activeFallbackRecognition) {
            this.activeFallbackRecognition.onend = null;
            this.activeFallbackRecognition.onerror = null;
            try {
                this.activeFallbackRecognition.abort();
            } catch (e) { }
            this.activeFallbackRecognition = null;
        }
    }

    async sendToServer(audioBlob) {
        // Переносим FileReader внутрь Promise, чтобы ловить ошибки асинхронно и правильно!
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

            const response = await fetch('/api/recognize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audio: base64Audio, language: 'ru-RU' })
            });

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }

            const data = await response.json();
            if (this.onResult && data.text) {
                this.onResult(data.text);
            }
        } catch (error) {
            console.error('Send to server error (переключаемся на фолбек):', error);
            if (this.onError) this.onError('server_error');

            // Запускаем фолбек, только если пользователь не нажал Стоп вручную
            this.fallbackToWebSpeech();
        }
    }

    fallbackToWebSpeech() {
        // Если уже запущено встроенное распознавание — не плодим копии
        if (this.activeFallbackRecognition) return;

        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            if (this.onError) this.onError('no_speech_recognition');
            return;
        }

        const r = new SR();
        this.activeFallbackRecognition = r; // Сохраняем ссылку!

        r.lang = 'ru-RU';
        r.continuous = false;
        r.interimResults = false;

        r.onresult = (ev) => {
            const text = ev.results[0][0].transcript;
            if (this.onResult) this.onResult(text);
        };

        r.onerror = (ev) => {
            // Игнорируем штатные прерывания, чтобы не спамить в onError
            if (ev.error === 'aborted' || ev.error === 'no-speech') {
                console.warn('Штатный сброс фолбека:', ev.error);
                return;
            }
            if (this.onError) this.onError(ev.error);
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