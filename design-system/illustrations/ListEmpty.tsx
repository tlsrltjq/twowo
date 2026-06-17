import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { useColors } from '../ThemeContext';

export function ListEmpty({ size = 120 }: { size?: number }) {
  const colors = useColors();
  const accent = colors.accent.primary;
  const bg = colors.bg.subtle;
  const border = colors.border.subtle;
  const muted = colors.text.muted;

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Rect x="22" y="22" width="76" height="90" rx="8" fill={bg} stroke={border} strokeWidth="2" />
      <Rect x="42" y="14" width="36" height="16" rx="5" fill={border} />
      <Rect x="48" y="14" width="24" height="16" rx="5" fill="white" stroke={border} strokeWidth="1.5" />
      <Line x1="36" y1="52" x2="84" y2="52" stroke={border} strokeWidth="2" strokeLinecap="round" />
      <Line x1="36" y1="64" x2="84" y2="64" stroke={border} strokeWidth="2" strokeLinecap="round" />
      <Line x1="36" y1="76" x2="68" y2="76" stroke={border} strokeWidth="2" strokeLinecap="round" />
      <Path
        d="M60 100 C60 100 42 88 42 78 C42 72 46 68 51 68 C54 68 57 70 60 73 C63 70 66 68 69 68 C74 68 78 72 78 78 C78 88 60 100 60 100 Z"
        fill={accent}
        opacity={0.25}
        stroke={accent}
        strokeWidth="1.5"
        strokeOpacity={0.6}
      />
      <Circle cx="96" cy="32" r="3" fill={accent} opacity={0.4} />
      <Circle cx="18" cy="70" r="2" fill={muted} opacity={0.3} />
      <Circle cx="104" cy="72" r="2.5" fill={accent} opacity={0.25} />
    </Svg>
  );
}
