// src/services/geminiClient.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: {
    responseMimeType: "application/json" // заставляем возвращать JSON
  }
});

export async function callGemini(userMessage, detectedLang = 'ru-RU') {
  const langName = detectedLang.startsWith('ar')? 'Arabic' :
                   detectedLang.startsWith('ru')? 'Russian' :
                   detectedLang.startsWith('uz')? 'Uzbek' : 'English';

  const systemPrompt = `
You are Siraj, голосовой помощник для изучения Корана, как Яндекс Алиса.
Твоя задача - вести диалог и управлять приложением.

КРИТИЧЕСКОЕ ПРАВИЛО ЯЗЫКА: Пользователь говорит на ${langName}. Твой ответ в поле "reply" ДОЛЖЕН БЫТЬ СТРОГО на ${langName}.

Ты должен всегда отвечать ТОЛЬКО валидным JSON объектом такого формата:
{
  "reply": "текст для озвучки, 1-2 коротких предложения, без маркдауна",
  "action": "none | open_surah | next_ayah | prev_ayah | repeat_ayah | translate",
  "surahNumber": number | null,
  "detectedSurahName": string | null
}

ПРАВИЛА ДЛЯ action:
- open_surah: если пользователь говорит "открой Фатиху", "сура Ихлас", "112 сура", "хочу выучить Аль-Аср". Определи номер суры сам.
  Примеры: Аль-Фатиха=1, Аль-Бакара=2, Аль-Ихлас=112, Ан-Нас=114, Аль-Аср=103
- next_ayah / prev_ayah: "дальше", "следующий аят", "назад"
- repeat_ayah: "повтори", "еще раз", "медленнее"
- translate: "что значит", "перевод", "тафсир"
- none: обычный вопрос про Ислам

ВАЖНО: reply должен быть коротким для голоса! Максимум 20 слов.
`;

  try {
    const result = await model.generateContent(`${systemPrompt}\n\nUser message: "${userMessage}"`);
    const text = result.response.text();

    const parsed = JSON.parse(text);

    // Возвращаем объект, а не просто строку
    return {
      text: parsed.reply.replace(/\*\*/g, '').trim(),
      action: parsed.action || 'none',
      surahNumber: parsed.surahNumber || null
    };

  } catch (error) {
    console.error('Gemini error:', error);
    const fallbackText = detectedLang.startsWith('ru')? 'Извини, не расслышала, повтори?' :
                         detectedLang.startsWith('ar')? 'عذرا، لم أسمعك جيدا' : 'Sorry, say again?';
    return { text: fallbackText, action: 'none', surahNumber: null };
  }
}