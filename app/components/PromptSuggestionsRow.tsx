"use client";
interface Props {
    onPromptClick: (prompt: string) => void;
}

const CARDS = [
    { label: "Tactics",    question: "What is an absolute pin and when is it most powerful?" },
    { label: "Openings",   question: "Explain the Sicilian Defense and its main ideas for Black." },
    { label: "Champions",  question: "Who is the current FIDE World Chess Champion?" },
    { label: "FIDE Rank",  question: "Who are the top 5 players in the current FIDE ratings list?" },
    { label: "Strategy",   question: "How do you use the bishop pair effectively in the endgame?" },
    { label: "History",    question: "How did chess evolve from ancient Chaturanga to modern form?" },
];

const PromptSuggestionsRow: React.FC<Props> = ({ onPromptClick }) => (
    <div className="suggestion-grid">
        {CARDS.map((card, i) => (
            <button
                key={i}
                className="suggestion-card"
                onClick={() => onPromptClick(card.question)}
                title={card.question}
            >
                <span className="card-label">{card.label}</span>
                <span className="card-question">{card.question}</span>
            </button>
        ))}
    </div>
);

export default PromptSuggestionsRow;