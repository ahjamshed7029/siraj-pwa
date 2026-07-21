import { useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { callGemini } from '../services/geminiClient';
import { speakText } from '../services/ttsService';

export function useVoiceAgent() {
  const lockRef = useRef(false);

  const processVoiceInput = useCallback(async (text, lang) => {
    if (lockRef.current ||!text.trim()) return;
    lockRef.current = true;

    const store = useAppStore.getState();
    const finalLang = lang || store.detectedLang || 'ru-RU';

    // 1. Состояние ДУМАЕТ
    store.setDetectedLang(finalLang);
    store.setTranscript(text);
    store.setListening(false);
    store.setGlow('#FFD700');
    store.setResponse('...');

    try {
      // 2. Запрос к Gemini
      console.log(`🧠 [${finalLang}]: ${text}`);
      const aiResponse = await callGemini(text, finalLang);

      // 3. Состояние ГОВОРИТ
      store.setResponse(aiResponse);
      store.setGlow('#00FF7F'); // зеленый когда говорит
      console.log(`🗣: ${aiResponse}`);

      await speakText(aiResponse, finalLang);

    } catch (e) {
      console.error(e);
      await speakText('Извини, не расслышала. Повтори, пожалуйста', finalLang);
    } finally {
      // 4. Снова в СЛУШАЕТ
      store.setGlow(null);
      lockRef.current = false;
      // onend в recognition сам перезапустит микрофон
      // тригерим событие чтобы App.jsx перезапустил слушанье
      window.dispatchEvent(new CustomEvent('siraj-ready-to-listen'));
    }
  }, []);

  return { processVoiceInput };
}