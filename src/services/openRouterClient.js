const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function callAI(userMessage, detectedLang = 'ar') {
  // Динамический системный промпт в зависимости от языка
  const langName = detectedLang.startsWith('ar') ? 'Arabic' : 
                   detectedLang.startsWith('ru') ? 'Russian' : 
                   detectedLang.startsWith('uz') ? 'Uzbek' : 'English';

  const systemPrompt = `You are Siraj, a wise, multilingual Islamic assistant with deep knowledge of the Quran and Sunnah. 
  CRITICAL RULE: The user is communicating in ${langName}. You MUST reply strictly in ${langName}. 
  If asked about the Quran, provide clear, concise answers suitable for voice synthesis (max 3-4 sentences). 
  Do not use markdown or complex formatting.`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Siraj Quran App'
        // 'HTTP-Referer' и 'X-Title' обязательны для OpenRouter
      },
      body: JSON.stringify({
        model: 'google/gemini-flash-1.5', // Отличная, быстрая и дешевая модель
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('AI error:', error);
    // Возвращаем пустую строку или сообщение на языке пользователя, а не жестко на русском
    return detectedLang.startsWith('ru') ? 'Произошла ошибка связи.' : 
           detectedLang.startsWith('ar') ? 'حدث خطأ في الاتصال.' : 'Connection error.';
  }
}