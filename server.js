import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import FormData from 'form-data';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Логирование при старте
console.log('🚀 Запуск сервера...');
console.log('🔑 GROQ_API_KEY:', process.env.GROQ_API_KEY ? '✅ ЗАГРУЖЕН' : '❌ НЕ НАЙДЕН');
if (process.env.GROQ_API_KEY) {
  console.log('📝 Ключ начинается с:', process.env.GROQ_API_KEY.substring(0, 10) + '...');
} else {
  console.error('⚠️ Создайте .env с: GROQ_API_KEY=gsk_ваш_ключ');
}

// Эндпоинт для транскрипции
app.post('/api/transcribe', upload.single('file'), async (req, res) => {
  try {
    console.log('📥 Получен запрос на транскрипцию');

    if (!req.file) {
      console.error('❌ Файл не передан');
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    console.log('📁 Файл:', req.file.originalname);
    console.log('📏 Размер:', req.file.size, 'bytes');
    console.log('📋 MIME тип:', req.file.mimetype);

    // Проверка ключа
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'GROQ_API_KEY не настроен' });
    }

    // Формируем запрос к Groq
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    formData.append('model', 'whisper-large-v3-turbo');

    console.log('📤 Отправка в Groq API...');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    console.log('📡 Статус ответа Groq:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Groq ошибка:', response.status, errorText);
      return res.status(response.status).json({
        error: `Groq API ошибка: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();
    console.log('✅ Транскрипция получена:', data.text);
    res.json(data);

  } catch (error) {
    console.error('❌ Ошибка сервера:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🌐 Сервер запущен на http://localhost:${PORT}`);
  console.log(`📡 Эндпоинт: http://localhost:${PORT}/api/transcribe`);
});