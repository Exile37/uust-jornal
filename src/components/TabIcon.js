// =========================
// ИКОНКИ
// Рисованные примитивами: линии и скруглённые контуры из тонких View,
// без шрифтов иконок и SVG. Поэтому проект собирается без новых зависимостей,
// а толщина и цвет линий у всех иконок одинаковые.
// =========================
import React from 'react';
import { View, StyleSheet } from 'react-native';

function Line({ x, y, w, h = 1.5, color, radius = 0.75, style }) {
  return (
    <View
      style={[
        {
          position: 'absolute',
          left: x,
          top: y,
          width: w,
          height: h,
          borderRadius: radius,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

function Box({ x, y, w, h, color, r = 2, thickness = 1.5 }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        borderWidth: thickness,
        borderColor: color,
        borderRadius: r,
      }}
    />
  );
}

// Главная — домик: один скат, повторённый с отражением. Так оба ската
// абсолютно одинаковые, а пик и стык со стенами сходятся в заданных точках.
function Home({ color, size }) {
  const k = size / 22;
  const t = 1.5;
  const left = 3.5 * k;
  const right = size - 3.5 * k;
  const apex = { x: size / 2, y: 3 * k };
  const eaveY = 9.5 * k;
  const run = right - apex.x;
  const rise = eaveY - apex.y;
  // Линия короче гипотенузы ровно на толщину: после поворота её концы
  // ложатся пиком и стрехой без выступов за контур.
  const length = Math.hypot(run, rise) - t;
  const angle = (Math.atan2(rise, run) * 180) / Math.PI;
  const midX = (apex.x + right) / 2;
  const midY = (apex.y + eaveY) / 2;
  const offset = (length - t) / 2;
  return (
    <>
      <Line
        x={midX - offset}
        y={midY - t / 2}
        w={length}
        h={t}
        color={color}
        style={{ transform: [{ rotate: `${angle}deg` }] }}
      />
      <Line
        x={size - midX - offset}
        y={midY - t / 2}
        w={length}
        h={t}
        color={color}
        style={{ transform: [{ rotate: `${-angle}deg` }] }}
      />
      <Line x={left} y={eaveY} w={t} h={18 * k - eaveY + t} color={color} />
      <Line x={right - t} y={eaveY} w={t} h={18 * k - eaveY + t} color={color} />
      <Line x={left} y={18 * k} w={right - left} h={t} color={color} />
      <Box x={size / 2 - 2 * k} y={12.5 * k} w={4 * k} h={5.5 * k} color={color} r={1} />
    </>
  );
}

// Оценки — журнал с отметками.
function Grades({ color, size }) {
  const k = size / 22;
  const t = 1.5;
  return (
    <>
      <Box x={4 * k} y={3 * k} w={14 * k} h={16.5 * k} color={color} r={2.5 * k} />
      <Line x={7.5 * k} y={7.5 * k} w={2.2 * k} h={t} color={color} />
      <Line x={11.5 * k} y={7.5 * k} w={3.2 * k} h={t} color={color} />
      <Line x={7.5 * k} y={11 * k} w={2.2 * k} h={t} color={color} />
      <Line x={11.5 * k} y={11 * k} w={3.2 * k} h={t} color={color} />
      <Line x={7.5 * k} y={14.5 * k} w={5 * k} h={t} color={color} />
    </>
  );
}

// Зачётка — книжка с закладкой.
function RecordBook({ color, size }) {
  const k = size / 22;
  const t = 1.5;
  return (
    <>
      <Box x={4 * k} y={3 * k} w={14 * k} h={16.5 * k} color={color} r={2.5 * k} />
      <Line x={7 * k} y={3 * k} w={t} h={16.5 * k} color={color} />
      <Line x={8.5 * k} y={7.5 * k} w={6 * k} h={t} color={color} />
      <Line x={8.5 * k} y={11 * k} w={4.5 * k} h={t} color={color} />
    </>
  );
}

// Расписание — сетка недели.
function Schedule({ color, size }) {
  const k = size / 22;
  const t = 1.5;
  return (
    <>
      <Box x={3.5 * k} y={4.5 * k} w={15 * k} h={14.5 * k} color={color} r={2.5 * k} />
      <Line x={3.5 * k} y={9 * k} w={15 * k} h={t} color={color} radius={0} />
      <Line x={8.7 * k} y={9 * k} w={t} h={10 * k} color={color} />
      <Line x={13.2 * k} y={9 * k} w={t} h={10 * k} color={color} />
      <Line x={8 * k} y={2.5 * k} w={t} h={4 * k} color={color} />
      <Line x={14 * k} y={2.5 * k} w={t} h={4 * k} color={color} />
    </>
  );
}

// Настройки — ползунки.
function Settings({ color, size }) {
  const k = size / 22;
  const t = 1.5;
  const knob = 4.5 * k;
  const rows = [
    { y: 6.5 * k, x: 13 * k },
    { y: 11 * k, x: 7 * k },
    { y: 15.5 * k, x: 11 * k },
  ];
  return (
    <>
      {rows.map((row, i) => (
        <React.Fragment key={i}>
          <Line x={4 * k} y={row.y} w={14 * k} h={t} color={color} />
          <View
            style={{
              position: 'absolute',
              left: row.x - knob / 2,
              top: row.y + t / 2 - knob / 2,
              width: knob,
              height: knob,
              borderRadius: knob / 2,
              borderWidth: t,
              borderColor: color,
            }}
          />
        </React.Fragment>
      ))}
    </>
  );
}

const SHAPES = {
  home: Home,
  grades: Grades,
  record: RecordBook,
  schedule: Schedule,
  settings: Settings,
};

export default function TabIcon({ name, color, size = 22 }) {
  const Shape = SHAPES[name];
  if (!Shape) return null;
  return (
    <View style={[styles.frame, { width: size, height: size }]}>
      <Shape color={color} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { position: 'relative' },
});
