import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PremiumPhotoOverlay({
  compact = false,
  title = 'Fotos premium',
  subtitle = 'Las fotos completas se desbloquearan mas adelante.',
}) {
  const cells = useMemo(() => Array.from({ length: compact ? 24 : 54 }, (_value, index) => index), [compact]);

  return (
    <View pointerEvents="none" style={[styles.overlay, compact && styles.overlayCompact]}>
      <View style={styles.pixelGrid}>
        {cells.map((cell) => (
          <View
            key={cell}
            style={[
              styles.pixelCell,
              compact && styles.pixelCellCompact,
              cell % 3 === 0 && styles.pixelCellAlt,
              cell % 5 === 0 && styles.pixelCellGold,
            ]}
          />
        ))}
      </View>

      <View style={[styles.copyBox, compact && styles.copyBoxCompact]}>
        <View style={[styles.lockPill, compact && styles.lockPillCompact]}>
          <Ionicons name="lock-closed" size={compact ? 12 : 15} color="#050510" />
          <Text style={[styles.lockText, compact && styles.lockTextCompact]}>{title}</Text>
        </View>
        {!compact && subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 7, 18, 0.18)',
    justifyContent: 'flex-end',
  },
  overlayCompact: {
    justifyContent: 'space-between',
  },
  pixelGrid: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 6,
  },
  pixelCell: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(10, 10, 18, 0.24)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  pixelCellCompact: {
    width: 18,
    height: 18,
    borderRadius: 6,
  },
  pixelCellAlt: {
    backgroundColor: 'rgba(212, 175, 55, 0.14)',
  },
  pixelCellGold: {
    backgroundColor: 'rgba(255, 244, 198, 0.1)',
  },
  copyBox: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  copyBoxCompact: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  lockPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#D4AF37',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  lockPillCompact: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 0,
  },
  lockText: {
    color: '#050510',
    fontWeight: '800',
    fontSize: 13,
  },
  lockTextCompact: {
    fontSize: 11,
  },
  subtitle: {
    color: '#FFF4C6',
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 240,
  },
});
