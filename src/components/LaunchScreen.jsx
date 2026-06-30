import { useAppStore } from '../store/useAppStore';

export default function LaunchScreen() {
    const launch = useAppStore((s) => s.launch);

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
            <div style={{
                fontSize: '72px',
                fontWeight: 700,
                color: '#FFD700',
                fontFamily: 'sans-serif'
            }}>
                سراج
            </div>

            <div style={{
                fontSize: '14px',
                color: '#FFD700',
                letterSpacing: '4px'
            }}>
                SIRAJ
            </div>

            <button
                onClick={launch}
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