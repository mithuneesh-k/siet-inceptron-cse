import { Gem, Trophy, Star, Target } from 'lucide-react';

export default function ScoreBadge({ score, size = 'md' }) {
  const isLarge = size === 'lg';
  const iconSize = isLarge ? 24 : 16;
  
  const tier =
    score >= 300 ? { label: 'Platinum', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', icon: <Gem size={iconSize} color="#7C3AED" /> }
    : score >= 200 ? { label: 'Gold',    color: '#B38200', bg: '#FFFAE8', border: '#FFD93D', icon: <Trophy size={iconSize} color="#B38200" /> }
    : score >= 100 ? { label: 'Silver',  color: '#2A7D14', bg: '#EEF8E8', border: '#A8D98E', icon: <Star size={iconSize} color="#2A7D14" /> }
    : { label: 'Bronze', color: '#92400E', bg: '#FFF7ED', border: '#FED7AA', icon: <Target size={iconSize} color="#92400E" /> };



  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: isLarge ? '10px' : '7px',
      padding: isLarge ? '10px 18px' : '5px 12px',
      background: tier.bg,
      border: `1.5px solid ${tier.border}`,
      borderRadius: '6px',
    }}>
      <span style={{ display: 'flex', alignItems: 'center' }}>{tier.icon}</span>
      <div>
        <div style={{
          fontSize: isLarge ? '26px' : '16px',
          fontWeight: 900,
          color: tier.color,
          lineHeight: 1,
          fontFamily: "'Space Grotesk', sans-serif",
        }}>
          {score.toLocaleString()}
        </div>
        {isLarge && (
          <div style={{
            fontSize: '10px', color: tier.color, marginTop: '3px',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            fontWeight: 700, opacity: 0.75,
          }}>
            {tier.label} Tier
          </div>
        )}
      </div>
    </div>
  );
}
