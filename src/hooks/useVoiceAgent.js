// src/hooks/useVoiceAgent.js
import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { callGemini } from '../services/geminiClient';
import { speakText } from '../services/ttsService'; // Убедись, что этот файл создан (см. ниже)

export function useVoiceAgent() {
  const { 
    detectedLang, setDetectedLang, 
    lastTranscript, setTranscript, 
    isListening, setListening,
    setResponse, setGlow
  } = useAppStore();

  const processVoiceInput = useCallback(async (text, lang) => {
    if (!text.trim()) return;

    // 1. Сохраняем язык и текст
    const finalLang = lang || detectedLang || 'ar-SA';
    setDetectedLang(finalLang);
    setTranscript(text);
    setListening(false);
    setGlow('#FFD700'); // Включаем анимацию "думает"

    console.log(`🧠 Думаю на языке: ${finalLang}, текст: ${text}`);

    // 2. Отправляем в Gemini
    const aiResponse = await callGemini(text, finalLang);
    
    // 3. Сохраняем ответ, выключаем анимацию и озвучиваем
    setResponse(aiResponse);
    setGlow(null);
    
    console.log(`🗣️ Ответ ИИ: ${aiResponse}`);
    speakText(aiResponse, finalLang);

  }, [detectedLang, setDetectedLang, setTranscript, setListening, setResponse, setGlow]);

  return { processVoiceInput };
}