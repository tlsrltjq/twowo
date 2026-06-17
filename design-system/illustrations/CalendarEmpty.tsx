import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { useColors } from '../ThemeContext';

export function CalendarEmpty({ size = 120 }: { size?: number }) {
  const colors = useColors();
  const accent = colors.accent.primary;
  const bg = colors.bg.subtle;
  const border = colors.border.subtle;
  const muted = colors.text.muted;

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Rect x="10" y="18" width="100" height="88" rx="10" fill={bg} stroke={border} strokeWidth="2" />
      <Rect x="10" y="18" width="100" height="28" rx="10" fill={accent} />
      <Rect x="10" y="38" width="100" height="8" fill={accent} />
      <Rect x="36" y="10" width="6" height="16" rx="3" fill={border} />
      <Rect x="78" y="10" width="6" height="16" rx="3" fill={border} />
      <Line x1="30" y1="68" x2="90" y2="68" stroke={border} strokeWidth="1.5" strokeDasharray="4,3" />
      <Line x1="30" y1="84" x2="90" y2="84" stroke={border} strokeWidth="1.5" strokeDasharray="4,3" />
      <Circle cx="60" cy="74" r="12" fill="white" stroke={accent} strokeWidth="2" />
      <Line x1="60" y1="69" x2="60" y2="79" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="55" y1="74" x2="65" y2="74" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
      <Path
        d="M42 30 L48 36 M48 30 L42 36"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Line x1="58" y1="32" x2="78" y2="32" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" />
      <Line x1="58" y1="38" x2="70" y2="38" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" />
      <Circle cx="26" cy="58" r="3" fill={muted} opacity={0.3} />
      <Circle cx="60" cy="58" r="3" fill={muted} opacity={0.3} />
      <Circle cx="94" cy="58" r="3" fill={muted} opacity={0.3} />
    </Svg>
  );
}
