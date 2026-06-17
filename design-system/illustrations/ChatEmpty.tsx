import Svg, { Circle, Ellipse, Line, Path } from 'react-native-svg';

import { useColors } from '../ThemeContext';

export function ChatEmpty({ size = 120 }: { size?: number }) {
  const colors = useColors();
  const accent = colors.accent.primary;
  const bg = colors.bg.subtle;
  const border = colors.border.subtle;

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Path
        d="M12 28 Q12 16 24 16 L62 16 Q74 16 74 28 L74 54 Q74 66 62 66 L38 66 L28 78 L28 66 L24 66 Q12 66 12 54 Z"
        fill={bg}
        stroke={border}
        strokeWidth="2"
      />
      <Circle cx="32" cy="41" r="4" fill={accent} opacity={0.5} />
      <Circle cx="43" cy="41" r="4" fill={accent} opacity={0.75} />
      <Circle cx="54" cy="41" r="4" fill={accent} />
      <Path
        d="M50 72 Q50 62 60 62 L94 62 Q104 62 104 72 L104 90 Q104 100 94 100 L76 100 L88 112 L70 100 L60 100 Q50 100 50 90 Z"
        fill={accent}
        opacity={0.15}
        stroke={accent}
        strokeWidth="1.5"
        strokeOpacity={0.4}
      />
      <Line x1="64" y1="76" x2="90" y2="76" stroke={accent} strokeWidth="2" strokeLinecap="round" opacity={0.5} />
      <Line x1="64" y1="84" x2="80" y2="84" stroke={accent} strokeWidth="2" strokeLinecap="round" opacity={0.35} />
      <Path
        d="M57 20 C57 17 54 14 51 16 C48 14 45 17 45 20 C45 23 51 28 51 28 C51 28 57 23 57 20 Z"
        fill={accent}
        opacity={0.7}
      />
      <Ellipse cx="108" cy="18" rx="6" ry="5" fill={bg} stroke={border} strokeWidth="1.5" />
      <Circle cx="108" cy="18" r="2" fill={accent} opacity={0.5} />
    </Svg>
  );
}
