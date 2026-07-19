// src/services/geminiClient.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// Инициализируем Gemini с ключом из .env
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function callGemini(userMessage, detectedLang = 'ar-SA') {
  // Определяем название языка для промпта
  const langName = detectedLang.startsWith('ar') ? 'Arabic' : 
                   detectedLang.startsWith('ru') ? 'Russian' : 
                   detectedLang.startsWith('uz') ? 'Uzbek' : 'English';

  // Строгий системный промпт для голосового ассистента
  const systemPrompt = `You are Siraj, a wise, multilingual Islamic assistant with deep knowledge of the Quran and Sunnah. 
CRITICAL RULE: The user is communicating in ${langName}. You MUST reply strictly in ${langName}. 
If asked about the Quran, provide clear, concise answers suitable for voice synthesis (max 3-4 sentences). 
Do not use markdown, asterisks, or complex formatting. Just plain text.`;

  try {
    // Объединяем промпт и сообщение пользователя
    const fullPrompt = `${systemPrompt}\n\nUser message: ${userMessage}`;
    
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();
    
    // Очищаем ответ от возможных маркдаун-символов (например, **)
    return text.replace(/\*\*/g, '').trim();
    
  } catch (error) {
    console.error('Gemini API error:', error);
    // Возвращаем ошибку на языке пользователя
    if (detectedLang.startsWith('ru')) return 'Произошла ошибка связи. Попробуйте еще раз.';
    if (detectedLang.startsWith('ar')) return 'حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.';
    if (detectedLang.startsWith('uz')) return 'Aloqa xatosi yuz berdi. Qaytadan urinib ko\'ring.';
    return 'Connection error. Please try again.';
  }
}