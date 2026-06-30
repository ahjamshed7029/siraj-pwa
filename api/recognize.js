// api/recognize.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { audio, language } = req.body;

        // Здесь нужно использовать Speech-to-Text API
        // Например: Google Cloud Speech-to-Text, OpenAI Whisper, etc.

        // Временно возвращаем заглушку
        return res.status(200).json({
            text: 'Тестовая заглушка. Используй Web Speech API.'
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: error.message });
    }
}