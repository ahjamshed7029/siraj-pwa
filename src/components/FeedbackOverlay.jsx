const COLORS = {
    green: 'rgba(76, 175, 80, 0.3)',
    yellow: 'rgba(255, 193, 7, 0.3)',
    red: 'rgba(244, 67, 54, 0.3)',
};

const SHADOWS = {
    green: 'inset 0 0 120px rgba(76, 175, 80, 0.6)',
    yellow: 'inset 0 0 120px rgba(255, 193, 7, 0.6)',
    red: 'inset 0 0 120px rgba(244, 67, 54, 0.6)',
};

const styles = `
  @keyframes glowPulse {
    0% { opacity: 0; }
    15% { opacity: 1; }
    70% { opacity: 1; }
    100% { opacity: 0; }
  }
`;

// Вставка стилей в head (один раз)
if (typeof document !== 'undefined' && !document.getElementById('glow-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'glow-styles';
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
}

export default function FeedbackOverlay({ color }) {
    if (!color) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: COLORS[color],
            boxShadow: SHADOWS[color],
            zIndex: 9999,
            pointerEvents: 'none',
            transition: 'opacity 0.5s ease',
            animation: 'glowPulse 3s ease-out forwards'
        }} />
    );
}