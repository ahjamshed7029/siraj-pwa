import { useAppStore } from './store/useAppStore';
import LaunchScreen from './components/LaunchScreen';
import SessionScreen from './components/SessionScreen';
import FeedbackOverlay from './components/FeedbackOverlay';

export default function App() {
    const launched = useAppStore((s) => s.launched);
    const glowColor = useAppStore((s) => s.glowColor);

    return (
        <div style={{
            position: 'relative',
            height: '100dvh',
            width: '100vw',
            background: '#000'
        }}>
            <FeedbackOverlay color={glowColor} />
            {!launched ? <LaunchScreen /> : <SessionScreen />}
        </div>
    );
}