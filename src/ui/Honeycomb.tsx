import React from 'react';
import Svg, { Polygon } from 'react-native-svg';
import { theme } from '../theme';

/**
 * Campo de hexágonos — o motivo secundário da marca.
 *
 * A colmeia é decoração, nunca símbolo: fica sempre em opacidade baixa, atrás
 * do conteúdo. O símbolo é a Bia.
 *
 * Hexágono de ponta para cima: largura `raio × √3`, altura `raio × 2`. As
 * linhas se encaixam deslocando meia largura e subindo um quarto da altura, que
 * é o que faz a colmeia fechar sem fresta.
 */
export default function Honeycomb({
  width,
  height,
  radius = 42,
  opacity = 0.3,
  colors = [theme.colors.green500, theme.colors.green600, theme.colors.green300],
}: {
  width: number;
  height: number;
  radius?: number;
  opacity?: number;
  colors?: string[];
}) {
  const w = radius * Math.sqrt(3);
  const rowStep = radius * 1.5;
  const rows = Math.ceil(height / rowStep) + 2;
  const cols = Math.ceil(width / w) + 2;

  const cells: React.ReactElement[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c * w + (r % 2 ? w / 2 : 0) - w / 2;
      const cy = r * rowStep - radius;
      const points = [
        [cx, cy - radius],
        [cx + w / 2, cy - radius / 2],
        [cx + w / 2, cy + radius / 2],
        [cx, cy + radius],
        [cx - w / 2, cy + radius / 2],
        [cx - w / 2, cy - radius / 2],
      ]
        .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
        .join(' ');

      cells.push(
        <Polygon key={`${r}-${c}`} points={points} fill={colors[(r + c) % colors.length]} />,
      );
    }
  }

  return (
    <Svg width={width} height={height} opacity={opacity}>
      {cells}
    </Svg>
  );
}
