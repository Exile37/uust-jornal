import React from 'react';
import { View } from 'react-native';
import { colors } from '../theme';

const ROTATION = { right: -45, down: 45, left: 135, up: -135 };

// Тонкий угольник вместо символьной стрелки: одна толщина и один цвет
// во всех строках, где есть переход.
export default function Chevron({
  direction = 'right',
  color = colors.muted,
  size = 8,
  thickness = 1.5,
  style,
}) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRightWidth: thickness,
          borderBottomWidth: thickness,
          borderColor: color,
          transform: [{ rotate: `${ROTATION[direction]}deg` }],
        },
        style,
      ]}
    />
  );
}
