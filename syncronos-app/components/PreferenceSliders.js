import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';

const TRACK_HEIGHT = 4;
const THUMB_SIZE = 34;
const THUMB_TOUCH_SIZE = 48;

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

const getThumbLeft = (position) => position - THUMB_TOUCH_SIZE / 2;

const createThumbResponder = ({ onGrant, onMove, onEnd }) => PanResponder.create({
  onStartShouldSetPanResponder: () => true,
  onStartShouldSetPanResponderCapture: () => true,
  onMoveShouldSetPanResponder: (_event, gestureState) => Math.abs(gestureState.dx) >= Math.abs(gestureState.dy),
  onMoveShouldSetPanResponderCapture: (_event, gestureState) => Math.abs(gestureState.dx) >= Math.abs(gestureState.dy),
  onPanResponderTerminationRequest: () => false,
  onShouldBlockNativeResponder: () => true,
  onPanResponderGrant: onGrant,
  onPanResponderMove: onMove,
  onPanResponderRelease: onEnd,
  onPanResponderTerminate: onEnd,
});

function SliderShell({
  label,
  valueLabel,
  children,
  onTrackLayout,
  trackRef,
  trackResponderProps,
}) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.valueLabel}>{valueLabel}</Text>
      </View>

      <View style={styles.trackShell}>
        <View
          ref={trackRef}
          collapsable={false}
          style={styles.trackInteractiveArea}
          onLayout={onTrackLayout}
          {...trackResponderProps}
        >
          <View style={styles.trackBackground} />
          {children}
        </View>
      </View>
    </View>
  );
}

function useTrackMetrics() {
  const trackRef = useRef(null);
  const trackLeftRef = useRef(0);
  const trackWidthRef = useRef(0);
  const [trackWidth, setTrackWidth] = useState(0);

  const measureTrack = () => {
    const node = trackRef.current;
    if (!node?.measureInWindow) return;
    node.measureInWindow((x, _y, width) => {
      trackLeftRef.current = x;
      if (width && width !== trackWidthRef.current) {
        trackWidthRef.current = width;
        setTrackWidth(width);
        return;
      }
      if (width) {
        trackWidthRef.current = width;
      }
    });
  };

  const handleTrackLayout = (event) => {
    const nextWidth = event.nativeEvent.layout.width;
    trackWidthRef.current = nextWidth;
    setTrackWidth(nextWidth);
    requestAnimationFrame(measureTrack);
  };

  return {
    trackRef,
    trackLeftRef,
    trackWidthRef,
    trackWidth,
    measureTrack,
    handleTrackLayout,
  };
}

export function SingleSlider({
  label,
  value,
  min,
  max,
  step = 1,
  formatValue,
  onChange,
  onInteractionChange,
}) {
  const { trackRef, trackLeftRef, trackWidthRef, trackWidth, measureTrack, handleTrackLayout } = useTrackMetrics();
  const onChangeRef = useRef(onChange);
  const onInteractionChangeRef = useRef(onInteractionChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onInteractionChangeRef.current = onInteractionChange;
  }, [onInteractionChange]);

  const updateFromPageX = (pageX) => {
    const effectiveWidth = trackWidthRef.current || trackWidth;
    if (!effectiveWidth) return;
    const localX = pageX - trackLeftRef.current;
    const nextValue = positionToValue(localX, min, max, effectiveWidth, step);
    onChangeRef.current?.(nextValue);
  };

  const trackResponderProps = useMemo(() => ({
    onStartShouldSetResponder: () => true,
    onStartShouldSetResponderCapture: () => true,
    onMoveShouldSetResponder: () => true,
    onMoveShouldSetResponderCapture: () => true,
    onResponderGrant: (event) => {
      measureTrack();
      onInteractionChangeRef.current?.(true);
      updateFromPageX(event.nativeEvent.pageX);
    },
    onResponderMove: (event) => {
      updateFromPageX(event.nativeEvent.pageX);
    },
    onResponderRelease: () => {
      onInteractionChangeRef.current?.(false);
    },
    onResponderTerminate: () => {
      onInteractionChangeRef.current?.(false);
    },
    onResponderTerminationRequest: () => false,
  }), [max, min, step, trackWidth]);

  const currentPosition = valueToPosition(value, min, max, trackWidth);
  const currentLabel = formatValue ? formatValue(value) : `${value}`;

  return (
    <SliderShell
      label={label}
      valueLabel={currentLabel}
      onTrackLayout={handleTrackLayout}
      trackRef={trackRef}
      trackResponderProps={trackResponderProps}
    >
      <View style={[styles.activeTrack, { width: currentPosition }]} />
      <View style={[styles.thumbTouch, { left: getThumbLeft(currentPosition), zIndex: 2 }]}> 
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
  formatValue,
  onChangeLow,
  onChangeHigh,
  onInteractionChange,
}) {
  const { trackRef, trackLeftRef, trackWidthRef, trackWidth, measureTrack, handleTrackLayout } = useTrackMetrics();
  const lowValueRef = useRef(lowValue);
  const highValueRef = useRef(highValue);
  const onChangeLowRef = useRef(onChangeLow);
  const onChangeHighRef = useRef(onChangeHigh);
  const onInteractionChangeRef = useRef(onInteractionChange);

  useEffect(() => {
    lowValueRef.current = lowValue;
  }, [lowValue]);

  useEffect(() => {
    highValueRef.current = highValue;
  }, [highValue]);

  useEffect(() => {
    onChangeLowRef.current = onChangeLow;
  }, [onChangeLow]);

  useEffect(() => {
    onChangeHighRef.current = onChangeHigh;
  }, [onChangeHigh]);

  useEffect(() => {
    onInteractionChangeRef.current = onInteractionChange;
  }, [onInteractionChange]);

  const updateLowFromPageX = (pageX) => {
    const effectiveWidth = trackWidthRef.current || trackWidth;
    if (!effectiveWidth) return;
    const localX = pageX - trackLeftRef.current;
    const boundedMax = Math.max(min, highValueRef.current - step);
    const nextValue = clamp(
      positionToValue(localX, min, max, effectiveWidth, step),
      min,
      boundedMax
    );
    onChangeLowRef.current?.(nextValue);
  };

  const updateHighFromPageX = (pageX) => {
    const effectiveWidth = trackWidthRef.current || trackWidth;
    if (!effectiveWidth) return;
    const localX = pageX - trackLeftRef.current;
    const boundedMin = Math.min(max, lowValueRef.current + step);
    const nextValue = clamp(
      positionToValue(localX, min, max, effectiveWidth, step),
      boundedMin,
      max
    );
    onChangeHighRef.current?.(nextValue);
  };

  const lowResponder = useMemo(() => createThumbResponder({
    onGrant: (event, gestureState) => {
      measureTrack();
      onInteractionChangeRef.current?.(true);
      updateLowFromPageX(event?.nativeEvent?.pageX ?? gestureState.x0);
    },
    onMove: (_event, gestureState) => {
      updateLowFromPageX(gestureState.moveX || gestureState.x0);
    },
    onEnd: () => {
      onInteractionChangeRef.current?.(false);
    },
  }), [max, min, step, trackWidth]);

  const highResponder = useMemo(() => createThumbResponder({
    onGrant: (event, gestureState) => {
      measureTrack();
      onInteractionChangeRef.current?.(true);
      updateHighFromPageX(event?.nativeEvent?.pageX ?? gestureState.x0);
    },
    onMove: (_event, gestureState) => {
      updateHighFromPageX(gestureState.moveX || gestureState.x0);
    },
    onEnd: () => {
      onInteractionChangeRef.current?.(false);
    },
  }), [max, min, step, trackWidth]);

  const lowPosition = valueToPosition(lowValue, min, max, trackWidth);
  const highPosition = valueToPosition(highValue, min, max, trackWidth);
  const activeWidth = Math.max(highPosition - lowPosition, 0);
  const rangeLabel = formatValue ? formatValue(lowValue, highValue) : `${lowValue}-${highValue}`;

  return (
    <SliderShell
      label={label}
      valueLabel={rangeLabel}
      onTrackLayout={handleTrackLayout}
      trackRef={trackRef}
    >
      <View style={[styles.activeTrack, { left: lowPosition, width: activeWidth }]} />
      <View
        style={[styles.thumbTouch, { left: getThumbLeft(lowPosition), zIndex: 5 }]}
        {...lowResponder.panHandlers}
      >
        <View style={styles.thumb} />
      </View>
      <View
        style={[styles.thumbTouch, { left: getThumbLeft(highPosition), zIndex: 6 }]}
        {...highResponder.panHandlers}
      >
        <View style={styles.thumb} />
      </View>
    </SliderShell>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 22,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  label: {
    color: '#FFF4C6',
    fontSize: 18,
    fontWeight: '700',
  },
  valueLabel: {
    color: '#D4AF37',
    fontSize: 18,
    fontWeight: '800',
  },
  trackShell: {
    height: THUMB_TOUCH_SIZE,
    justifyContent: 'center',
  },
  trackInteractiveArea: {
    height: THUMB_TOUCH_SIZE,
    justifyContent: 'center',
  },
  trackBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: (THUMB_TOUCH_SIZE - TRACK_HEIGHT) / 2,
    height: TRACK_HEIGHT,
    borderRadius: 999,
    backgroundColor: '#7C849B',
    opacity: 0.55,
  },
  activeTrack: {
    position: 'absolute',
    top: (THUMB_TOUCH_SIZE - TRACK_HEIGHT) / 2,
    height: TRACK_HEIGHT,
    borderRadius: 999,
    backgroundColor: '#D4AF37',
  },
  thumbTouch: {
    position: 'absolute',
    top: 0,
    width: THUMB_TOUCH_SIZE,
    height: THUMB_TOUCH_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#F7F1E2',
    borderWidth: 2,
    borderColor: '#B7B5BF',
  },
});
