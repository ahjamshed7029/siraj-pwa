import { useAppStore } from '../store/useAppStore';

export default function LaunchScreen() {
    const launch = useAppStore((s) => s.launch);
    const setListening = useAppStore((s) => s.setListening);

    // src/App.jsx -> найди handleStartClick и замени
const handleStartClick = async () => {
  // 1. ВАЖНО: разблокируем аудио (иначе в PWA тишина)
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') await ctx.resume();
    // короткий пустой звук чтобы разбудить систему
    const oscillator = ctx.createOscillator();
    oscillator.connect(ctx.destination);
    oscillator.start();
    oscillator.stop();
  } catch(e) {}

  // 2. Просим микрофон
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch(e) {
    alert('Дай доступ к микрофону');
    return;
  }
  
  // 3. Прогреваем голоса для Айиши/Хасана
  window.speechSynthesis.getVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }
  
  // 4. Твоя логика дальше...
  console.log("🔴 ПУСК");
  setStep('ask_name');
  await new Promise(r => setTimeout(r, 100));
  await speakAsTeacher('Ассаляму алейкум! Как тебя зовут?', teacher || 'hasan');
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