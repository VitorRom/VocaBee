import React from 'react';
import Svg, { Circle, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';
import { theme } from '../theme';

/**
 * Ícones do jogo — o fim dos emoji.
 *
 * Grade 24×24, traço 1.9, cantos redondos, sem preenchimento — exceto estrela,
 * coração e raio, que têm versão cheia para estado ativo (`filled`).
 * Sem sombra e sem blur: tudo desenhável em SVG de traço.
 */
export type IconName =
  | 'back'
  | 'chevron'
  | 'coin'
  | 'flame'
  | 'star'
  | 'bolt'
  | 'bulb'
  | 'undo'
  | 'sound'
  | 'heart'
  | 'lock'
  | 'check'
  | 'home'
  | 'path'
  | 'trophy'
  | 'store'
  | 'user'
  | 'deck'
  | 'grid'
  | 'gear'
  | 'plus'
  | 'close'
  | 'target'
  | 'calendar'
  | 'book'
  | 'shuffle'
  /** O hexágono da colmeia: motivo secundário da marca, nunca o símbolo. */
  | 'hive'
  | 'honey';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  /** Só vale para estrela, coração e raio. */
  filled?: boolean;
  strokeWidth?: number;
};

export default function Icon({
  name,
  size = 24,
  color = theme.colors.ink,
  filled = false,
  strokeWidth = 1.9,
}: Props) {
  const s = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };
  const solid = { ...s, fill: filled ? color : ('none' as const) };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === 'back' && <Polyline points="15,4.5 7.5,12 15,19.5" {...s} />}
      {name === 'chevron' && <Polyline points="9,4.5 16.5,12 9,19.5" {...s} />}

      {name === 'coin' && (
        <>
          <Circle cx={12} cy={12} r={8.5} {...s} />
          <Circle cx={12} cy={12} r={3.6} {...s} />
        </>
      )}

      {name === 'flame' && (
        <>
          <Path d="M12 3c3 4.6 6 6 6 10a6 6 0 0 1-12 0c0-3 2.4-4.2 4.2-7.2" {...s} />
          <Path d="M12 20a2.8 2.8 0 0 1-2.6-3.2c.2-1.6 1.6-2.2 2.6-4 1 1.8 2.4 2.4 2.6 4A2.8 2.8 0 0 1 12 20z" {...s} />
        </>
      )}

      {name === 'star' && (
        <Polygon points="12,3 14.6,9.3 21.2,9.8 16.2,14.2 17.7,20.7 12,17.2 6.3,20.7 7.8,14.2 2.8,9.8 9.4,9.3" {...solid} />
      )}
      {name === 'bolt' && (
        <Polygon points="13.5,2.5 5,13.5 11,13.5 10.2,21.5 19,10 13,10" {...solid} />
      )}
      {name === 'heart' && (
        <Path d="M12 20.4C6 16 3 13.2 3 9.9A4.7 4.7 0 0 1 12 7.4a4.7 4.7 0 0 1 9 2.5c0 3.3-3 6.1-9 10.5z" {...solid} />
      )}

      {name === 'bulb' && (
        <>
          <Path d="M8.6 15a5.6 5.6 0 1 1 6.8 0" {...s} />
          <Line x1={9.6} y1={18} x2={14.4} y2={18} {...s} />
          <Line x1={10.4} y1={21} x2={13.6} y2={21} {...s} />
        </>
      )}

      {name === 'undo' && (
        <>
          <Path d="M4.5 11.5A8 8 0 1 1 8 19" {...s} />
          <Polyline points="4.5,5.5 4.5,11.5 10.5,11.5" {...s} />
        </>
      )}

      {name === 'sound' && (
        <>
          <Polygon points="4,9.5 8,9.5 12.5,5.5 12.5,18.5 8,14.5 4,14.5" {...s} />
          <Path d="M16 9.2a4.2 4.2 0 0 1 0 5.6" {...s} />
          <Path d="M18.6 6.6a8 8 0 0 1 0 10.8" {...s} />
        </>
      )}

      {name === 'lock' && (
        <>
          <Rect x={4.8} y={10.5} width={14.4} height={9.5} rx={2.4} {...s} />
          <Path d="M8.4 10.5V7.8a3.6 3.6 0 0 1 7.2 0v2.7" {...s} />
        </>
      )}

      {name === 'check' && <Polyline points="4.5,12.8 9.6,18 19.5,6.5" {...s} />}

      {name === 'home' && (
        <>
          <Polyline points="3,11.4 12,3.8 21,11.4" {...s} />
          <Path d="M5.8 10.2V20h12.4v-9.8" {...s} />
          <Path d="M10 20v-4.6h4V20" {...s} />
        </>
      )}

      {name === 'path' && (
        <>
          <Path d="M7 20.5v-3.8a2.6 2.6 0 0 1 2.6-2.6h4.8a2.6 2.6 0 0 0 2.6-2.6V7.4" {...s} />
          <Circle cx={7} cy={21} r={0.6} fill={color} />
          <Circle cx={17} cy={4.6} r={2.6} {...s} />
        </>
      )}

      {name === 'trophy' && (
        <>
          <Path d="M7.6 3.5h8.8v5a4.4 4.4 0 0 1-8.8 0z" {...s} />
          <Path d="M7.6 4.8H4.8a3.2 3.2 0 0 0 3.2 3.2" {...s} />
          <Path d="M16.4 4.8h2.8a3.2 3.2 0 0 1-3.2 3.2" {...s} />
          <Line x1={12} y1={13} x2={12} y2={17} {...s} />
          <Path d="M8 20.5h8" {...s} />
          <Path d="M9.6 17h4.8l1 3.5H8.6z" {...s} />
        </>
      )}

      {name === 'store' && (
        <>
          <Polyline points="3.2,9.4 5.4,4 18.6,4 20.8,9.4" {...s} />
          <Path d="M5.2 9.4V20h13.6V9.4" {...s} />
          <Path d="M9.6 20v-5.4h4.8V20" {...s} />
        </>
      )}

      {name === 'user' && (
        <>
          <Circle cx={12} cy={8.4} r={4} {...s} />
          <Path d="M4.6 20.4a7.4 7.4 0 0 1 14.8 0" {...s} />
        </>
      )}

      {name === 'deck' && (
        <>
          <Rect x={8.5} y={3.5} width={11} height={15} rx={2.2} {...s} />
          <Path d="M15.5 21.5H6.7a2.2 2.2 0 0 1-2.2-2.2V7.5" {...s} />
        </>
      )}

      {name === 'grid' && (
        <>
          <Rect x={3.6} y={3.6} width={7.2} height={7.2} rx={1.8} {...s} />
          <Rect x={13.2} y={3.6} width={7.2} height={7.2} rx={1.8} {...s} />
          <Rect x={3.6} y={13.2} width={7.2} height={7.2} rx={1.8} {...s} />
          <Rect x={13.2} y={13.2} width={7.2} height={7.2} rx={1.8} {...s} />
        </>
      )}

      {name === 'gear' && (
        <>
          <Circle cx={12} cy={12} r={3.4} {...s} />
          <Circle cx={12} cy={12} r={7.6} {...s} strokeDasharray="3.2 3.4" />
        </>
      )}

      {name === 'plus' && (
        <>
          <Line x1={12} y1={5} x2={12} y2={19} {...s} />
          <Line x1={5} y1={12} x2={19} y2={12} {...s} />
        </>
      )}

      {name === 'close' && (
        <>
          <Line x1={6} y1={6} x2={18} y2={18} {...s} />
          <Line x1={18} y1={6} x2={6} y2={18} {...s} />
        </>
      )}

      {name === 'target' && (
        <>
          <Circle cx={12} cy={12} r={8.4} {...s} />
          <Circle cx={12} cy={12} r={4} {...s} />
          <Circle cx={12} cy={12} r={0.8} fill={color} />
        </>
      )}

      {name === 'calendar' && (
        <>
          <Rect x={3.8} y={5.4} width={16.4} height={14.8} rx={2.4} {...s} />
          <Line x1={3.8} y1={10} x2={20.2} y2={10} {...s} />
          <Line x1={8.4} y1={3.4} x2={8.4} y2={6.6} {...s} />
          <Line x1={15.6} y1={3.4} x2={15.6} y2={6.6} {...s} />
        </>
      )}

      {name === 'book' && (
        <>
          <Path d="M4.4 4.6h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2h-6z" {...s} />
          <Path d="M19.6 4.6h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z" {...s} />
        </>
      )}

      {name === 'hive' && (
        <>
          <Polygon points="12,2.6 20,7.3 20,16.7 12,21.4 4,16.7 4,7.3" {...s} />
          <Polygon points="12,8.2 16,10.6 16,15.4 12,17.8 8,15.4 8,10.6" {...s} />
        </>
      )}

      {name === 'honey' && (
        <>
          <Polygon points="12,2.8 19,7 19,15.4 12,19.6 5,15.4 5,7" {...s} />
          <Line x1={5} y1={11.2} x2={19} y2={11.2} {...s} />
          <Line x1={12} y1={2.8} x2={12} y2={11.2} {...s} />
        </>
      )}

      {name === 'shuffle' && (
        <>
          <Path d="M4 6.5h4l8 11h4" {...s} />
          <Polyline points="17.5,14.5 20.5,17.5 17.5,20.5" {...s} />
          <Path d="M4 17.5h4l2.4-3.3" {...s} />
          <Path d="M13.6 9.8 16 6.5h4" {...s} />
          <Polyline points="17.5,3.5 20.5,6.5 17.5,9.5" {...s} />
        </>
      )}
    </Svg>
  );
}
