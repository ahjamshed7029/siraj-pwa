import { useAppStore } from '../store/useAppStore';

export default function LaunchScreen() {
    const launch = useAppStore((s) => s.launch);
    const setListening = useAppStore((s) => s.setListening);

    const handleStart = async () => {
        console.log("🔴 КНОПКА ПУСК НАЖАТА!");
        
        launch();

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Speech recognition not supported. Use Chrome.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'ar-SA';
        recognition.interimResults = false;
        recognition.continuous = false;

        recognition.onstart = () => {
            console.log('🎤 Listening...');
            setListening(true);
        };

        recognition.onresult = (event) => {
            const text = event.results[0][0].transcript;
            const lang = event.results[0][0].lang;
            console.log('👂 Recognized:', text, 'Lang:', lang);
            setListening(false);
        };

        recognition.onerror = (event) => {
            console.error(' Error:', event.error);
            setListening(false);
        };

        recognition.onend = () => {
            console.log(' Microphone stopped');
            setListening(false);
        };

        try {
            recognition.start();
        } catch (e) {
            console.error('❌ Failed to start:', e);
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
                    letterSpacing: '2px'
                }}
            >
                ПУСК
            </button>
        </div>
    );
}