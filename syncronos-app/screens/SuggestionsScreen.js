import React, { useCallback, useContext, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AppContext } from '../context/AppContext';
import ProfileDetailModal from '../components/ProfileDetailModal';
import ProfilePhotoCarousel from '../components/ProfilePhotoCarousel';

const { height } = Dimensions.get('window');

const getProfilePhotos = (profile) => {
  const sourcePhotos = profile?.fotos_visibles?.length
    ? profile.fotos_visibles
    : profile?.fotos?.length
      ? profile.fotos
      : profile?.foto
        ? [profile.foto]
        : [];

  return [...new Set(sourcePhotos.filter(Boolean))];
};

function SuggestionCard({ profile, onOpen }) {
  const photos = useMemo(() => getProfilePhotos(profile), [profile]);

  return (
    <View style={styles.cardShell}>
      <ProfilePhotoCarousel photos={photos} height={height * 0.62} borderRadius={20}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{`${profile.compatibilidad ?? 0}% afinidad`}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>
            {profile.nombre}
            {profile.mostrar_edad === false ? '' : `, ${profile.edad ?? '?'}`}
          </Text>
          <Text style={styles.cardGeneracion}>
            {profile.generacion || 'Generacion'}
            {profile.distancia !== null ? ` | ${profile.distancia} km` : ''}
          </Text>
          <Text style={styles.cardSigno}>
            {`Sol ${profile.signo_zodiacal || '?'} | Luna ${profile.luna || '?'} | Venus ${profile.venus || '?'}`}
          </Text>
          {profile.interpretacion_compatibilidad?.title ? (
            <Text style={styles.cardHighlight}>{profile.interpretacion_compatibilidad.title}</Text>
          ) : null}
          {profile.interpretacion_compatibilidad?.summary ? (
            <Text style={styles.cardBio}>{profile.interpretacion_compatibilidad.summary}</Text>
          ) : profile.bio ? <Text style={styles.cardBio}>{profile.bio}</Text> : null}
          <TouchableOpacity style={styles.detailButton} onPress={onOpen}>
            <Text style={styles.detailButtonText}>Ver compatibilidad completa</Text>
          </TouchableOpacity>
        </View>
      </ProfilePhotoCarousel>
    </View>
  );
}

export default function SuggestionsScreen() {
  const [sugerencias, setSugerencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const { user, apiFetch } = useContext(AppContext);

  const fetchSugerencias = useCallback(async () => {
    if (!user?.id) {
      setSugerencias([]);
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch(`/feed/${user.id}?mode=affinity`);
      const data = await response.json();
      setSugerencias(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al obtener sugerencias', error);
      setSugerencias([]);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, user?.id]);

  useFocusEffect(useCallback(() => { fetchSugerencias(); }, [fetchSugerencias]));

  const sugerenciaActual = sugerencias[0];

  const handleDecision = async (tipo) => {
    if (!sugerenciaActual) return;
    try {
      const response = await apiFetch('/swipe', {
        method: 'POST',
        body: JSON.stringify({ mi_id: user.id, destino_id: sugerenciaActual.id, tipo }),
      });
      const data = await response.json();
      setDetailVisible(false);
      setSugerencias((current) => current.slice(1));
      if (data.match) {
        Alert.alert('Es match', `Tu y ${sugerenciaActual.nombre} ahora pueden chatear en Conexiones.`);
      }
    } catch (error) {
      console.error('Error al registrar decision', error);
    }
  };

  const handlePhotoReport = async () => {
    if (!sugerenciaActual?.foto) {
      Alert.alert('Sin foto visible', 'Este perfil no tiene una foto publica para reportar ahora mismo.');
      return;
    }

    try {
      await apiFetch('/moderacion/foto', {
        method: 'POST',
        body: JSON.stringify({
          mi_id: user.id,
          destino_id: sugerenciaActual.id,
          foto_url: sugerenciaActual.foto,
          motivo: 'Reporte desde afinidad',
        }),
      });
      Alert.alert('Gracias', 'La foto quedo reportada para revision.');
    } catch (error) {
      console.error('Error reportando foto', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Afinidad</Text>
      <Text style={styles.subtitle}>Ranking por fecha de nacimiento, signo, luna, Venus, Marte y etapa de vida.</Text>

      {loading ? (
        <View style={styles.feedbackBox}>
          <ActivityIndicator color="#D4AF37" size="large" />
          <Text style={styles.feedbackText}>Calculando compatibilidades...</Text>
        </View>
      ) : !sugerenciaActual ? (
        <View style={styles.feedbackBox}>
          <Text style={styles.emptyText}>No hay afinidades disponibles ahora mismo.</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchSugerencias}>
            <Text style={styles.refreshText}>Actualizar afinidad</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <SuggestionCard profile={sugerenciaActual} onOpen={() => setDetailVisible(true)} />

          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionButton, styles.passButton]} onPress={() => handleDecision('dislike')}>
              <Text style={styles.actionLabel}>Nope</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.likeButton]} onPress={() => handleDecision('like')}>
              <Text style={[styles.actionLabel, styles.darkActionLabel]}>Like</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.reportPhotoButton} onPress={handlePhotoReport}>
            <Text style={styles.reportPhotoText}>Reportar foto</Text>
          </TouchableOpacity>
        </>
      )}

      <ProfileDetailModal
        visible={detailVisible}
        profile={sugerenciaActual}
        onClose={() => setDetailVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050510', padding: 16 },
  title: { color: '#D4AF37', fontSize: 24, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  subtitle: { color: '#8c8ca3', fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  feedbackBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f25',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1a1a3a',
    padding: 24,
  },
  feedbackText: { color: '#ccc', marginTop: 14, fontSize: 15 },
  emptyText: { color: '#ccc', textAlign: 'center', fontSize: 16, marginBottom: 20 },
  refreshButton: { backgroundColor: '#1a1a3a', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14 },
  refreshText: { color: '#D4AF37', fontWeight: '700' },
  cardShell: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  badge: {
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
  badgeText: { color: '#D4AF37', fontSize: 12, fontWeight: '700' },
  cardInfo: { padding: 20, backgroundColor: 'rgba(5, 5, 16, 0.85)' },
  cardTitle: { color: '#fff', fontSize: 26, fontWeight: '700' },
  cardGeneracion: { color: '#ccc', fontSize: 14, marginTop: 6 },
  cardSigno: { color: '#D4AF37', fontSize: 15, marginTop: 6, fontWeight: '700', lineHeight: 20 },
  cardHighlight: { color: '#f1dfa2', fontSize: 14, fontWeight: '700', marginTop: 10 },
  cardBio: { color: '#fff', fontSize: 14, lineHeight: 20, marginTop: 10 },
  detailButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: '#171736',
    borderWidth: 1,
    borderColor: '#2a2a4c',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  detailButtonText: { color: '#fff', fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  passButton: { backgroundColor: '#2a1016', borderColor: '#ff6b6b' },
  likeButton: { backgroundColor: '#D4AF37', borderColor: '#D4AF37' },
  actionLabel: { color: '#fff', fontSize: 15, fontWeight: '700' },
  darkActionLabel: { color: '#050510' },
  reportPhotoButton: {
    marginTop: 12,
    backgroundColor: '#171736',
    borderWidth: 1,
    borderColor: '#2a2a4c',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  reportPhotoText: { color: '#fff', fontWeight: '700' },
});
