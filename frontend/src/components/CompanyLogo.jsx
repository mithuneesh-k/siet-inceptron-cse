import { Building2, Zap, Hexagon, Circle, Leaf, Briefcase, Code, Cloud } from 'lucide-react';

export default function CompanyLogo({ logo, size = 24 }) {
  const map = {
    '🏛️': <Building2 size={size} color="#64748b" />,
    '⚡': <Zap size={size} color="#eab308" fill="#eab308" />,
    '🔷': <Hexagon size={size} color="#3b82f6" fill="#3b82f6" />,
    '🟠': <Circle size={size} color="#f97316" fill="#f97316" />,
    '🔵': <Circle size={size} color="#2563eb" fill="#2563eb" />,
    '🌿': <Leaf size={size} color="#22c55e" />,
    '☁️': <Cloud size={size} color="#0ea5e9" fill="#0ea5e9" />,
    '💻': <Code size={size} color="#6366f1" />
  };

  return map[logo] || <Briefcase size={size} color="#94a3b8" />;
}
