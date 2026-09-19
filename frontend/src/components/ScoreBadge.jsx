export default function ScoreBadge({ score, size = 'md' }) {
  const tier =
    score >= 300 ? { label: 'Platinum', key: 'platinum', icon: '💎' }
    : score >= 200 ? { label: 'Gold',    key: 'gold',     icon: '🏆' }
    : score >= 100 ? { label: 'Silver',  key: 'silver',   icon: '⭐' }
    : { label: 'Bronze', key: 'bronze',   icon: '🎯' };

  const isLarge = size === 'lg';

  return (
    <div
      className={`score-badge-box score-badge-${tier.key}`}
      style={{
        gap: isLarge ? '10px' : '7px',
        padding: isLarge ? '10px 18px' : '5px 12px',
      }}
    >
      <span style={{ fontSize: isLarge ? '20px' : '14px' }}>{tier.icon}</span>
      <div>
        <div
          className="score-badge-val"
          style={{
            fontSize: isLarge ? '26px' : '16px',
            fontWeight: 900,
            lineHeight: 1,
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          {score.toLocaleString()}
        </div>
        {isLarge && (
          <div
            className="score-badge-label"
            style={{
              fontSize: '10px',
              marginTop: '3px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontWeight: 700,
              opacity: 0.85,
            }}
          >
            {tier.label} Tier
          </div>
        )}
      </div>
    </div>
  );
}

