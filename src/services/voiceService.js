import { useAppStore } from '../store/useAppStore';

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

    this.activeFallbackRecognition = null;
    this.isResetting = false;
    this.timeoutId = null;
  }

  async start() {
    if (this.isResetting) return false;

    this.stop();

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      let options = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      } else if (MediaRecorder.isTypeSupported('audio/aac')) {
        options = { mimeType: 'audio/aac' };
      }

      this.mediaRecorder = new MediaRecorder(this.stream, options);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // ВАЖНО: здесь больше НЕТ автоматической отправки на сервер
      // и НЕТ автоматического фолбэка на WebSpeech.
      // Сбор Blob и решение о транскрипции полностью на стороне App.jsx
      // (через stopRecording()), чтобы не было гонки состояний,
      // когда audioChunks обнуляется раньше, чем VoiceRecorder
      // успевает собрать Blob сам.
      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
        if (this.onEnd) this.onEnd();
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        this.handleError('recording_error');
      };

      this.mediaRecorder.start(100);
      this.isRecording = true;

      if (this.onStart) this.onStart();

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
      try {
        this.stream.getTracks().forEach(track => track.stop());
      } catch (e) {
        console.warn("Ошибка при закрытии треков:", e);
      }
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

  handleError(errorMessage) {
    if (this.isResetting) return;
    this.isResetting = true;

    if (this.onError) this.onError(errorMessage);

    setTimeout(() => {
      this.isResetting = false;
    }, 1500);
  }

  // Оставлено как опциональный фолбэк — теперь вызывается ЯВНО из App.jsx,
  // только если transcribeWithGroq вернул пустой результат.
  // Учтите: webkitSpeechRecognition часто НЕ работает внутри
  // нативных WebView-обёрток (Capacitor/Cordova и т.п.).
  fallbackToWebSpeech() {
    return new Promise((resolve) => {
      if (this.activeFallbackRecognition) {
        resolve('');
        return;
      }

      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        this.handleError('no_speech_recognition');
        resolve('');
        return;
      }

      const r = new SR();
      this.activeFallbackRecognition = r;

      const currentLang = useAppStore.getState().detectedLang || 'ar-SA';
      r.lang = currentLang;

      r.continuous = false;
      r.interimResults = false;

      r.onresult = (ev) => {
        if (ev.results && ev.results[0] && ev.results[0][0]) {
          const text = ev.results[0][0].transcript;
          const detected = ev.results[0][0].lang;
          if (detected) {
            useAppStore.getState().setDetectedLang(detected);
          }
          resolve(text || '');
        } else {
          resolve('');
        }
      };

      r.onerror = (ev) => {
        if (ev.error === 'aborted' || ev.error === 'no-speech') {
          resolve('');
          return;
        }
        this.handleError(ev.error);
        resolve('');
      };

      r.onend = () => {
        this.activeFallbackRecognition = null;
      };

      try {
        r.start();
      } catch (e) {
        console.error("Ошибка старта фолбека:", e);
        this.activeFallbackRecognition = null;
        resolve('');
      }
    });
  }
}