import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../theme';

type Props = { size?: number; color?: string; dark?: string };

// A cute ribbon bow drawn with SVG
export default function Bow({ size = 80, color = colors.pink, dark = colors.pinkDeep }: Props) {
  return (
    <Svg width={size} height={size * 0.75} viewBox="0 0 100 75">
      <Path d="M46 40 L30 72 L43 66 L52 46 Z" fill={dark} />
      <Path d="M54 40 L70 72 L57 66 L48 46 Z" fill={dark} />
      <Path d="M50 36 C32 4 4 6 5 28 C6 48 32 50 50 36 Z" fill={color} />
      <Path d="M50 36 C68 4 96 6 95 28 C94 48 68 50 50 36 Z" fill={color} />
      <Path d="M50 36 C36 14 16 14 15 28" stroke={dark} strokeWidth="2" fill="none" opacity={0.35} />
      <Path d="M50 36 C64 14 84 14 85 28" stroke={dark} strokeWidth="2" fill="none" opacity={0.35} />
      <Circle cx="50" cy="38" r="9" fill={dark} />
    </Svg>
  );
}
