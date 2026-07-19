// src/services/ttsService.js
export function speakText(text, lang = 'ar-SA') {
  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported');
    return;
  }

  // Останавливаем предыдущую речь, если она есть
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Настройка языка (браузер сам найдет подходящий голос)
  utterance.lang = lang; 
  utterance.rate = 0.9; // Чуть медленнее для четкости (особенно для арабского)
  utterance.pitch = 1;

  utterance.onerror = (e) => console.error('TTS Error:', e);
  
  window.speechSynthesis.speak(utterance);
}