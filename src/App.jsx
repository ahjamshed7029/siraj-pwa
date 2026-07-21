export default function App() {
  const play = () => {
    // твой звук был битый 1.2kb, поэтому пока используем системный голос
    const u = new SpeechSynthesisUtterance("MashaAllah!");
    speechSynthesis.speak(u);
  };

  return (
    <div style={{
      height: '100vh', width: '100vw',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f9b8a, #6a82fb, #fc5c7d)',
      fontFamily: 'sans-serif'
    }}>
      <button onClick={play} style={{
        width: 260, height: 260, borderRadius: 50,
        background: 'white', border: 'none',
        fontSize: 32, fontWeight: 900,
        boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
        cursor: 'pointer'
      }}>
        بِسْمِ اللهِ
      </button>
    </div>
  );
}