// src/components/LaunchScreen.jsx
import { useAppStore } from '../store/useAppStore';
import { useVoiceAgent } from '../hooks/useVoiceAgent'; // Импортируем наш новый хук

export default function LaunchScreen() {
    const launch = useAppStore((s) => s.launch);
    const setListening = useAppStore((s) => s.setListening);
    const { processVoiceInput } = useVoiceAgent();

    const handleStart = async () => {
        launch(); // Меняем стейт на запущенный
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Ваш браузер не поддерживает голосовой ввод. Используйте Chrome.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'ar-SA'; // Начинаем с арабского, но ИИ поймет и другой
        recognition.interimResults = false;
        recognition.continuous = false;

        recognition.onstart = () => {
            setListening(true);
            console.log('🎤 Слушаю...');
        };

        recognition.onresult = (event) => {
            const text = event.results[0][0].transcript;
            const lang = event.results[0][0].lang; // Браузер сам определит ar-RU, en-US и т.д.
            processVoiceInput(text, lang); // Отправляем в "мозг"
        };

        recognition.onerror = (event) => {
            console.error('Ошибка микрофона:', event.error);
            setListening(false);
        };

        recognition.onend = () => {
            setListening(false);
        };

        try {
            recognition.start();
        } catch (e) {
            console.error('Не удалось запустить микрофон:', e);
        }
    };

    return (
        <div style={{
            height: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#111',
            gap: '40px'
        }}>
            <div style={{ fontSize: '72px', fontWeight: 700, color: '#FFD700', fontFamily: 'sans-serif' }}>
                سراج
            </div>
            <div style={{ fontSize: '14px', color: '#FFD700', letterSpacing: '4px' }}>
                SIRAJ
            </div>

            <button
                onClick={handleStart}
                style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    border: '3px solid #FFD700',
                    background: '#FFD700',
                    color: '#000',
                    fontSize: '20px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    letterSpacing: '2px',
                    animation: 'pulse 2s infinite' // Добавь эту анимацию в CSS если хочешь
                }}
            >
                ПУСК
            </button>
        </div>
    );
}
