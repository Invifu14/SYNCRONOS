import React, { useEffect, useMemo, useState } from 'react';
import {
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COMMON_BIRTH_TIMEZONES, filterTimeZones, formatTimeZoneLabel } from '../utils/timezones';

const backgroundImage = require('../assets/date-picker-bg.png');

export default function TimeZoneSelectorModal({
  visible,
  title,
  helperText,
  currentValue,
  suggestedValue,
  onClose,
  onSelect,
}) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) return;
    setQuery('');
  }, [visible]);

  const filteredZones = useMemo(() => {
    const results = filterTimeZones(query);
    return results.length ? results : COMMON_BIRTH_TIMEZONES;
  }, [query]);

  const customValue = `${query || ''}`.trim();
  const showCustomOption = customValue.includes('/') && !filteredZones.some((zone) => zone.value === customValue);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <ImageBackground source={backgroundImage} style={styles.card} imageStyle={styles.cardImage}>
          <View style={styles.scrim}>
            <Text style={styles.kicker}>SYNCRONOS</Text>
            <Text style={styles.title}>{title}</Text>
            {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}

            <View style={styles.currentPill}>
              <Text style={styles.currentPillLabel}>{formatTimeZoneLabel(currentValue)}</Text>
            </View>

            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar zona o escribir IANA, ej. America/Bogota"
              placeholderTextColor="#8f88b6"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {suggestedValue && suggestedValue !== currentValue ? (
              <TouchableOpacity style={styles.suggestedCard} onPress={() => { onSelect(suggestedValue); onClose(); }}>
                <Text style={styles.suggestedTitle}>Usar zona sugerida por tu ciudad</Text>
                <Text style={styles.suggestedText}>{formatTimeZoneLabel(suggestedValue)}</Text>
              </TouchableOpacity>
            ) : null}

            {showCustomOption ? (
              <TouchableOpacity style={styles.customCard} onPress={() => { onSelect(customValue); onClose(); }}>
                <Text style={styles.customTitle}>Usar zona escrita</Text>
                <Text style={styles.customText}>{customValue}</Text>
              </TouchableOpacity>
            ) : null}

            <Text style={styles.sectionTitle}>Zonas sugeridas</Text>
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {filteredZones.map((zone) => (
                <TouchableOpacity
                  key={zone.value}
                  style={[styles.zoneChip, currentValue === zone.value && styles.zoneChipActive]}
                  onPress={() => { onSelect(zone.value); onClose(); }}
                >
                  <Text style={[styles.zoneText, currentValue === zone.value && styles.zoneTextActive]}>{zone.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 3, 12, 0.84)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 430,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.45)',
  },
  cardImage: {
    resizeMode: 'cover',
  },
  scrim: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    backgroundColor: 'rgba(10, 7, 28, 0.58)',
  },
  kicker: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  helper: {
    color: '#DDD8F5',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    marginBottom: 14,
  },
  currentPill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(11, 8, 25, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.24)',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginBottom: 16,
    maxWidth: '100%',
  },
  currentPillLabel: {
    color: '#F8F5FF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  searchInput: {
    backgroundColor: 'rgba(8, 6, 20, 0.88)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  suggestedCard: {
    backgroundColor: 'rgba(11, 8, 25, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.24)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  suggestedTitle: {
    color: '#D4AF37',
    fontWeight: '800',
    marginBottom: 6,
  },
  suggestedText: {
    color: '#F8F5FF',
    lineHeight: 20,
  },
  customCard: {
    backgroundColor: 'rgba(20, 15, 48, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  customTitle: {
    color: '#F8F5FF',
    fontWeight: '800',
    marginBottom: 6,
  },
  customText: {
    color: '#D4AF37',
    lineHeight: 20,
  },
  sectionTitle: {
    color: '#F8F5FF',
    fontWeight: '700',
    marginBottom: 10,
  },
  list: {
    maxHeight: 240,
    marginBottom: 14,
  },
  listContent: {
    gap: 8,
  },
  zoneChip: {
    backgroundColor: 'rgba(20, 15, 48, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  zoneChipActive: {
    borderColor: '#D4AF37',
    backgroundColor: 'rgba(212, 175, 55, 0.16)',
  },
  zoneText: {
    color: '#F1EEFF',
    fontWeight: '600',
  },
  zoneTextActive: {
    color: '#F8F5FF',
  },
  closeButton: {
    backgroundColor: 'rgba(12, 10, 28, 0.76)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#F4F1FF',
    fontWeight: '700',
  },
});
