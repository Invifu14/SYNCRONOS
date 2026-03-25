import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import * as Location from 'expo-location';

const backgroundImage = require('../assets/date-picker-bg.png');

const POPULAR_LOCATIONS = [
  'Bogota, Colombia',
  'Medellin, Colombia',
  'Cali, Colombia',
  'Barranquilla, Colombia',
  'Cartagena, Colombia',
  'Bucaramanga, Colombia',
  'Cucuta, Colombia',
  'Pereira, Colombia',
  'Manizales, Colombia',
  'Santa Marta, Colombia',
  'Villavicencio, Colombia',
  'Ibague, Colombia',
  'Pasto, Colombia',
  'Monteria, Colombia',
  'Armenia, Colombia',
  'Tunja, Colombia',
  'Popayan, Colombia',
  'Neiva, Colombia',
  'Lima, Peru',
  'Quito, Ecuador',
  'Ciudad de Mexico, Mexico',
  'Buenos Aires, Argentina',
  'Santiago, Chile',
  'Madrid, Espana',
  'Miami, Estados Unidos',
];

const uniqueParts = (values) => [...new Set(values.filter(Boolean))];

const formatPlaceLabel = (place, fallback) => {
  const rawName = place?.city || place?.district || place?.subregion || place?.region || fallback;
  const parts = uniqueParts([rawName, place?.region, place?.country]);
  return parts.join(', ');
};

const LOCATION_ACCESS_ERROR_PATTERN = /not authorized to use location services/i;

const getReadableLocationError = (error, fallbackMessage) => {
  const rawMessage = `${error?.message || error || ''}`.trim();
  if (LOCATION_ACCESS_ERROR_PATTERN.test(rawMessage)) {
    return 'Activa la ubicacion del telefono y concede permiso de ubicacion a la app para continuar.';
  }
  return fallbackMessage;
};

export default function LocationSelectorModal({
  visible,
  title,
  helperText,
  placeholder,
  currentValue,
  allowCurrentLocation = false,
  currentLocationLabel = 'Usar mi ubicacion actual',
  onClose,
  onSelect,
}) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [searchResult, setSearchResult] = useState(null);

  useEffect(() => {
    if (!visible) return;
    setQuery(currentValue || '');
    setLoading(false);
    setMessage('');
    setSearchResult(null);
  }, [currentValue, visible]);

  const filteredLocations = useMemo(() => {
    const trimmed = `${query || ''}`.trim().toLowerCase();
    if (!trimmed) {
      return POPULAR_LOCATIONS.slice(0, 10);
    }
    return POPULAR_LOCATIONS.filter((location) => location.toLowerCase().includes(trimmed)).slice(0, 10);
  }, [query]);

  const ensureLocationAccess = async ({
    requestIfNeeded = true,
    requireEnabledServices = true,
  } = {}) => {
    let permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== 'granted' && requestIfNeeded && permission.canAskAgain !== false) {
      permission = await Location.requestForegroundPermissionsAsync();
    }

    if (permission.status !== 'granted') {
      setMessage(
        permission.canAskAgain === false
          ? 'La app no tiene permiso de ubicacion. Activalo manualmente desde Ajustes > Apps > permisos.'
          : 'Debes conceder permiso de ubicacion para buscar ciudades o usar tu ubicacion actual.'
      );
      return false;
    }

    if (!requireEnabledServices) {
      return true;
    }

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      setMessage('Los servicios de ubicacion del telefono estan apagados. Activalos e intenta de nuevo.');
      return false;
    }

    return true;
  };

  const resolvePlace = async (input, source) => {
    const trimmed = `${input || ''}`.trim();
    if (!trimmed) {
      setMessage('Escribe o elige una ciudad para continuar.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const hasLocationAccess = await ensureLocationAccess();
      if (!hasLocationAccess) {
        return;
      }

      const geocoded = await Location.geocodeAsync(trimmed);
      if (!geocoded.length) {
        setMessage('No pudimos ubicar esa ciudad. Intenta con un nombre mas exacto.');
        return;
      }

      const coords = geocoded[0];
      let resolvedLabel = trimmed;
      try {
        const places = await Location.reverseGeocodeAsync({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        if (places.length) {
          resolvedLabel = formatPlaceLabel(places[0], trimmed);
        }
      } catch (_error) {
        resolvedLabel = trimmed;
      }

      const result = {
        label: resolvedLabel,
        latitude: coords.latitude,
        longitude: coords.longitude,
        source,
      };

      if (source === 'search') {
        setSearchResult(result);
        setMessage('Encontramos una ubicacion compatible con tu busqueda.');
        return;
      }

      onSelect(result);
      onClose();
    } catch (error) {
      console.warn('No se pudo resolver la ubicacion:', `${error?.message || error || ''}`.trim());
      setMessage(getReadableLocationError(error, 'No se pudo consultar esa ubicacion desde el dispositivo.'));
    } finally {
      setLoading(false);
    }
  };

  const useCurrentLocation = async () => {
    setLoading(true);
    setMessage('');
    try {
      const hasLocationAccess = await ensureLocationAccess();
      if (!hasLocationAccess) {
        return;
      }

      const coords = await Location.getCurrentPositionAsync({});
      const places = await Location.reverseGeocodeAsync({
        latitude: coords.coords.latitude,
        longitude: coords.coords.longitude,
      });
      const place = places[0];
      const label = formatPlaceLabel(place, 'Mi ubicacion actual');

      onSelect({
        label,
        latitude: coords.coords.latitude,
        longitude: coords.coords.longitude,
        source: 'current-location',
      });
      onClose();
    } catch (error) {
      console.warn('No se pudo obtener la ubicacion actual:', `${error?.message || error || ''}`.trim());
      setMessage(getReadableLocationError(error, 'No fue posible obtener tu ubicacion actual.'));
    } finally {
      setLoading(false);
    }
  };

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
              <Text style={styles.currentPillLabel}>{currentValue || 'Sin ubicacion seleccionada'}</Text>
            </View>

            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder={placeholder}
              placeholderTextColor="#8f88b6"
              autoCapitalize="words"
            />

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.secondaryAction} onPress={() => resolvePlace(query, 'search')} disabled={loading}>
                <Text style={styles.secondaryActionText}>Buscar ciudad</Text>
              </TouchableOpacity>
              {allowCurrentLocation ? (
                <TouchableOpacity style={styles.primaryAction} onPress={useCurrentLocation} disabled={loading}>
                  <Text style={styles.primaryActionText}>{currentLocationLabel}</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {loading ? (
              <View style={styles.feedbackBox}>
                <ActivityIndicator color="#D4AF37" />
                <Text style={styles.feedbackText}>Consultando ubicacion...</Text>
              </View>
            ) : null}

            {message ? <Text style={styles.message}>{message}</Text> : null}

            {searchResult ? (
              <TouchableOpacity style={styles.resultCard} onPress={() => { onSelect(searchResult); onClose(); }}>
                <Text style={styles.resultTitle}>Usar resultado encontrado</Text>
                <Text style={styles.resultText}>{searchResult.label}</Text>
              </TouchableOpacity>
            ) : null}

            <Text style={styles.sectionTitle}>Ciudades sugeridas</Text>
            <ScrollView style={styles.suggestionsBox} contentContainerStyle={styles.suggestionsContent}>
              {filteredLocations.map((location) => (
                <TouchableOpacity
                  key={location}
                  style={styles.suggestionChip}
                  onPress={() => resolvePlace(location, 'suggestion')}
                  disabled={loading}
                >
                  <Text style={styles.suggestionText}>{location}</Text>
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
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: 'rgba(12, 10, 28, 0.76)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryActionText: {
    color: '#F4F1FF',
    fontWeight: '700',
    textAlign: 'center',
  },
  primaryAction: {
    flex: 1.1,
    backgroundColor: '#D4AF37',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    color: '#130E22',
    fontWeight: '800',
    textAlign: 'center',
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  feedbackText: {
    color: '#DDD8F5',
  },
  message: {
    color: '#F4E6A2',
    marginBottom: 10,
    lineHeight: 20,
  },
  resultCard: {
    backgroundColor: 'rgba(11, 8, 25, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.24)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  resultTitle: {
    color: '#D4AF37',
    fontWeight: '800',
    marginBottom: 6,
  },
  resultText: {
    color: '#F8F5FF',
    lineHeight: 20,
  },
  sectionTitle: {
    color: '#F8F5FF',
    fontWeight: '700',
    marginBottom: 10,
  },
  suggestionsBox: {
    maxHeight: 220,
    marginBottom: 14,
  },
  suggestionsContent: {
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: 'rgba(20, 15, 48, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestionText: {
    color: '#F1EEFF',
    fontWeight: '600',
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
