export async function transcribeWithGroq(audioBlob) {
  if (!audioBlob) {
    console.warn('⚠️ WhisperService: Передан пустой audioBlob');
    return '';
  }

  try {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model', 'whisper-large-v3');

    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Ошибка Whisper API: статус ${response.status}`);
    }

    const data = await response.json();
    return data.text || '';
  } catch (error) {
    console.error('Groq Whisper Error:', error);
    return '';
  }
}

export default transcribeWithGroq;