// Бесплатный Whisper через Groq - в 10 раз быстрее OpenAI
export async function transcribeWithGroq(audioBlob) {
  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');
  formData.append('model', 'whisper-large-v3');
  formData.append('language', 'ar');
  formData.append('prompt', 'القرآن الكريم، سورة الإخلاص، الفاتحة'); // подсказка для Корана

  try {
    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`
      },
      body: formData
    });

    if (res.status === 429) throw new Error('LIMIT');
    const data = await res.json();
    return data.text || '';
  } catch (e) {
    console.warn('Groq limit, переключаюсь на оффлайн', e);
    return null; // сигнал переключиться
  }
}