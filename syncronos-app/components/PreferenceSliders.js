import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';

const THUMB_SIZE = 26;
const THUMB_TOUCH_SIZE = 42;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const snapToStep = (value, min, max, step) => {
  const safeStep = step > 0 ? step : 1;
  const snapped = Math.round((value - min) / safeStep) * safeStep + min;
  return clamp(snapped, min, max);
};

const valueToPosition = (value, min, max, width) => {
  if (!width || max <= min) return 0;
  return ((value - min) / (max - min)) * width;
};

const positionToValue = (position, min, max, width, step) => {
  if (!width || max <= min) return min;
  const boundedPosition = clamp(position, 0, width);
  const ratio = boundedPosition / width;
  const rawValue = min + ratio * (max - min);
  return snapToStep(rawValue, min, max, step);
};

function SliderShell({ label, valueLabel, minLabel, maxLabel, children, onTrackLayout }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.valueLabel}>{valueLabel}</Text>
      </View>

      <View style={styles.trackShell} onLayout={onTrackLayout}>
        <View style={styles.trackBackground} />
        {children}
      </View>

      <View style={styles.limitRow}>
        <Text style={styles.limitText}>{minLabel}</Text>
        <Text style={styles.limitText}>{maxLabel}</Text>
      </View>
    </View>
  );
}

export function SingleSlider({
  label,
  value,
  min,
  max,
  step = 1,
  minLabel,
  maxLabel,
  formatValue,
  onChange,
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const startValueRef = useRef(value);

  const thumbResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      startValueRef.current = value;
    },
    onPanResponderMove: (_event, gestureState) => {
      if (!trackWidth) return;
      const startPosition = valueToPosition(startValueRef.current, min, max, trackWidth);
      const nextValue = positionToValue(startPosition + gestureState.dx, min, max, trackWidth, step);
      onChange(nextValue);
    },
  }), [max, min, onChange, step, trackWidth, value]);

  const currentPosition = valueToPosition(value, min, max, trackWidth);
  const currentLabel = formatValue ? formatValue(value) : `${value}`;

  return (
    <SliderShell
      label={label}
      valueLabel={currentLabel}
      minLabel={minLabel || `${min}`}
      maxLabel={maxLabel || `${max}`}
      onTrackLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
    >
      <View style={[styles.activeTrack, { width: currentPosition }]} />
      <View
        style={[styles.thumbTouch, { left: currentPosition - THUMB_TOUCH_SIZE / 2 }]}
        {...thumbResponder.panHandlers}
      >
        <View style={styles.thumb} />
      </View>
    </SliderShell>
  );
}

export function RangeSlider({
  label,
  lowValue,
  highValue,
  min,
  max,
  step = 1,
  minLabel,
  maxLabel,
  formatValue,
  onChangeLow,
  onChangeHigh,
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const lowStartRef = useRef(lowValue);
  const highStartRef = useRef(highValue);

  const lowResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      lowStartRef.current = lowValue;
    },
    onPanResponderMove: (_event, gestureState) => {
      if (!trackWidth) return;
      const startPosition = valueToPosition(lowStartRef.current, min, max, trackWidth);
      const boundedMax = Math.max(min, highValue - step);
      const nextValue = clamp(
        positionToValue(startPosition + gestureState.dx, min, max, trackWidth, step),
        min,
        boundedMax
      );
      onChangeLow(nextValue);
    },
  }), [highValue, lowValue, max, min, onChangeLow, step, trackWidth]);

  const highResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      highStartRef.current = highValue;
    },
    onPanResponderMove: (_event, gestureState) => {
      if (!trackWidth) return;
      const startPosition = valueToPosition(highStartRef.current, min, max, trackWidth);
      const boundedMin = Math.min(max, lowValue + step);
      const nextValue = clamp(
        positionToValue(startPosition + gestureState.dx, min, max, trackWidth, step),
        boundedMin,
        max
      );
      onChangeHigh(nextValue);
    },
  }), [highValue, lowValue, max, min, onChangeHigh, step, trackWidth]);

  const lowPosition = valueToPosition(lowValue, min, max, trackWidth);
  const highPosition = valueToPosition(highValue, min, max, trackWidth);
  const activeWidth = Math.max(highPosition - lowPosition, 0);
  const rangeLabel = formatValue ? formatValue(lowValue, highValue) : `${lowValue} - ${highValue}`;

  return (
    <SliderShell
      label={label}
      valueLabel={rangeLabel}
      minLabel={minLabel || `${min}`}
      maxLabel={maxLabel || `${max}`}
      onTrackLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
    >
      <View style={[styles.activeTrack, { left: lowPosition, width: activeWidth }]} />
      <View
        style={[styles.thumbTouch, { left: lowPosition - THUMB_TOUCH_SIZE / 2 }]}
        {...lowResponder.panHandlers}
      >
        <View style={styles.thumb} />
      </View>
      <View
        style={[styles.thumbTouch, { left: highPosition - THUMB_TOUCH_SIZE / 2 }]}
        {...highResponder.panHandlers}
      >
        <View style={styles.thumb} />
      </View>
    </SliderShell>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  label: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  valueLabel: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: '800',
  },
  trackShell: {
    height: THUMB_TOUCH_SIZE,
    justifyContent: 'center',
  },
  trackBackground: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#171736',
  },
  activeTrack: {
    position: 'absolute',
    height: 8,
    borderRadius: 999,
    backgroundColor: '#D4AF37',
  },
  thumbTouch: {
    position: 'absolute',
    width: THUMB_TOUCH_SIZE,
    height: THUMB_TOUCH_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#FFF4C6',
    borderWidth: 3,
    borderColor: '#D4AF37',
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  limitText: {
    color: '#8f8fa8',
    fontSize: 12,
    fontWeight: '600',
  },
});
