// src/services/geminiClient.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash"
});

export async function callGemini(studentText, detectedLang = 'ru-RU', surahName = 'Аль-Фатиха') {
  const langName = detectedLang.startsWith('ar')? 'Arabic' :
                   detectedLang.startsWith('ru')? 'Russian' :
                   detectedLang.startsWith('uz')? 'Uzbek' : 'English';

  const systemPrompt = `
Ты учитель Корана. Ученик прочитал следующий текст: "${studentText}".
Выбранная сура: ${surahName}.
Сравни чтение ученика, найди ошибки в словах или огласовках и дай короткое (1-2 предложения) замечание по таджвиду и правильности.

CRITICAL RULE: The user speaks ${langName}. Your feedback MUST BE STRICTLY in ${langName} without any markdown formatting. Do not exceed 20 words.
`;

  try {
    const result = await model.generateContent(systemPrompt);
    const text = result.response.text();

    return text.replace(/\*\*/g, '').trim();
  } catch (error) {
    console.error('Gemini error:', error);
    const fallbackText = detectedLang.startsWith('ru')? 'МашаАллах, продолжайте стараться!' :
                         detectedLang.startsWith('ar')? 'ما شاء الله، استمر في المحاولة!' : 'Mashallah, keep trying!';
    return fallbackText;
  }
}