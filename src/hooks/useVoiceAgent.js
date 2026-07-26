// hooks/useVoiceAgent.js

import { useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { callGemini } from '../services/geminiClient';
import { speakText } from '../services/ttsService';

export function useVoiceAgent() {
  const lockRef = useRef(false);
  const processingRef = useRef(false);

  const processVoiceInput = useCallback(async (text, lang) => {
    // Защита от множественных вызовов
    if (processingRef.current || lockRef.current) {
      console.log('⛔ Пропускаем, уже обрабатывается');
      return;
    }

    if (!text || !text.trim()) {
      console.log('⛔ Пропускаем, пустой текст');
      return;
    }

    processingRef.current = true;
    lockRef.current = true;

    const store = useAppStore.getState();
    const finalLang = lang || store.detectedLang || 'ru-RU';

    console.log(`🎤 Обработка: "${text}" (${finalLang})`);

    // 1. Состояние: ДУМАЕТ
    store.setDetectedLang(finalLang);
    store.setTranscript(text);
    store.setListening(false); // ВЫКЛЮЧАЕМ микрофон
    store.setGlow('#FFD700'); // Желтый - думает
    store.setResponse('...');

    try {
      // 2. Запрос к Gemini
      console.log(`🧠 Gemini запрос: ${text}`);
      const aiResponse = await callGemini(text, finalLang);

      console.log(`💬 Ответ Gemini: ${aiResponse}`);

      // 3. Состояние: ГОВОРИТ
      store.setResponse(aiResponse);
      store.setGlow('#00FF7F'); // Зеленый - говорит

      // 4. Озвучиваем и ЖДЕМ окончания
      console.log(`🔊 Начинаем озвучку...`);
      await speakText(aiResponse, finalLang);
      console.log(`🔊 Озвучка завершена`);

      // 5. Пауза для затухания эха (важно для телефона!)
      console.log(`⏳ Пауза 800ms для затухания...`);
      await new Promise((resolve) => setTimeout(resolve, 800));

    } catch (error) {
      console.error('❌ Ошибка в VoiceAgent:', error);

      const errorMsg = 'Извини, не расслышала. Повтори, пожалуйста.';
      store.setResponse(errorMsg);

      try {
        await speakText(errorMsg, finalLang);
        await new Promise((resolve) => setTimeout(resolve, 800));
      } catch (e) {
        console.error('❌ Ошибка озвучки ошибки:', e);
      }
    }

    // 6. Очистка и разблокировка
    store.setGlow(null);
    lockRef.current = false;
    processingRef.current = false;

    // 7. Сигнал для включения микрофона
    console.log('✅ Готов к прослушиванию');
    window.dispatchEvent(new CustomEvent('siraj-ready-to-listen'));

  }, []);

  return { processVoiceInput };
}