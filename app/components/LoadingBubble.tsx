"use client";
const LoadingBubble: React.FC = () => (
    <div className="loading-message">
        <span className="meta-icon" style={{ fontSize: 13, color: "var(--gold)" }}>♟</span>
        <span className="loading-label">Chessopedia</span>
        <div className="loading-dots">
            <span /><span /><span />
        </div>
    </div>
);

export default LoadingBubble;