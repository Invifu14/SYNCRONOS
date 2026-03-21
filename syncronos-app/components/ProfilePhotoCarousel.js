import React, { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

const clampIndex = (value, total) => {
  if (!Number.isFinite(value) || total <= 0) return 0;
  return Math.max(0, Math.min(total - 1, value));
};

export default function ProfilePhotoCarousel({
  photos,
  height = 420,
  borderRadius = 20,
  emptyLabel = 'Sin foto visible',
  children,
}) {
  const normalizedPhotos = useMemo(() => [...new Set((photos || []).filter(Boolean))], [photos]);
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (event) => {
    if (!width) return;
    const index = clampIndex(Math.round(event.nativeEvent.contentOffset.x / width), normalizedPhotos.length);
    setActiveIndex(index);
  };

  return (
    <View
      style={[styles.shell, { height, borderRadius }]}
      onLayout={(event) => {
        const nextWidth = event.nativeEvent.layout.width;
        if (nextWidth !== width) {
          setWidth(nextWidth);
        }
      }}
    >
      {normalizedPhotos.length ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          onScrollEndDrag={handleScroll}
          scrollEventThrottle={16}
        >
          {normalizedPhotos.map((photo) => (
            <View key={photo} style={[styles.slide, width ? { width } : styles.slideFill]}>
              <Image source={{ uri: photo }} style={styles.image} />
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyLabel}>{emptyLabel}</Text>
        </View>
      )}

      {normalizedPhotos.length > 1 ? (
        <>
          <View style={styles.counterPill}>
            <Text style={styles.counterText}>{`${activeIndex + 1}/${normalizedPhotos.length}`}</Text>
          </View>
          <View style={styles.dots}>
            {normalizedPhotos.map((photo, index) => (
              <View key={`${photo}-${index}`} style={[styles.dot, index === activeIndex && styles.dotActive]} />
            ))}
          </View>
        </>
      ) : null}

      {children ? <View style={styles.overlay}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
    backgroundColor: '#11112e',
    position: 'relative',
  },
  slide: {
    height: '100%',
  },
  slideFill: {
    width: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#11112e',
  },
  emptyLabel: {
    color: '#d0d0de',
    fontSize: 18,
    fontWeight: '700',
  },
  counterPill: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(5, 5, 16, 0.76)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  counterText: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: '700',
  },
  dots: {
    position: 'absolute',
    top: 18,
    left: 16,
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    width: 18,
    backgroundColor: '#D4AF37',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
});
