// services/ttsService.js

let currentUtterance = null;

export function speakTeacherComment(text, teacher, callback) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      console.warn('Speech synthesis not supported');
      if (callback) callback();
      resolve();
      return;
    }

    // Останавливаем текущую речь
    stopTTS();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    // Разный голос для учителей
    if (teacher === 'hassan') {
      utterance.pitch = 0.8;
      utterance.rate = 0.85;
    } else {
      utterance.pitch = 1.2;
      utterance.rate = 0.9;
    }

    currentUtterance = utterance;

    utterance.onend = () => {
      currentUtterance = null;
      if (callback) callback();
      resolve();
    };

    utterance.onerror = () => {
      currentUtterance = null;
      if (callback) callback();
      resolve();
    };

    window.speechSynthesis.speak(utterance);
  });
}

export function stopTTS() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
}