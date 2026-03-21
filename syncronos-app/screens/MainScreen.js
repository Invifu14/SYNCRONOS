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

function ProfileCard({ profile, onOpen }) {
  const photos = useMemo(() => getProfilePhotos(profile), [profile]);
  const subtitle = `${profile.signo_zodiacal || 'Signo'} | ${profile.intencion || 'Sin intencion visible'}`;
  const locationLine = `${profile.ubicacion || 'Ubicacion privada'}${profile.distancia !== null ? ` | ${profile.distancia} km` : ''}`;

  return (
    <View style={styles.cardShell}>
      <ProfilePhotoCarousel photos={photos} height={height * 0.62} borderRadius={20}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{`${profile.compatibilidad ?? 0}% match`}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>
            {profile.nombre}
            {profile.mostrar_edad === false ? '' : `, ${profile.edad ?? '?'}`}
          </Text>
          <Text style={styles.cardSubtitle}>{locationLine}</Text>
          <Text style={styles.cardText}>{subtitle}</Text>
          {profile.bio ? <Text style={styles.cardBio}>{profile.bio}</Text> : null}
          {profile.interpretacion_compatibilidad?.title ? (
            <Text style={styles.cardHighlight}>{profile.interpretacion_compatibilidad.title}</Text>
          ) : null}
          {profile.razon_compatibilidad?.length ? (
            <Text style={styles.cardReason}>{profile.razon_compatibilidad[0]}</Text>
          ) : null}
          <TouchableOpacity style={styles.detailButton} onPress={onOpen}>
            <Text style={styles.detailButtonText}>Ver perfil completo</Text>
          </TouchableOpacity>
        </View>
      </ProfilePhotoCarousel>
    </View>
  );
}

export default function MainScreen() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const { user, apiFetch } = useContext(AppContext);

  const fetchUsuarios = useCallback(async () => {
    if (!user?.id) {
      setUsuarios([]);
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch(`/feed/${user.id}?mode=radar`);
      const data = await response.json();
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al obtener usuarios', error);
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, user?.id]);

  useFocusEffect(useCallback(() => { fetchUsuarios(); }, [fetchUsuarios]));

  const usuarioActual = usuarios[0];

  const handleDecision = async (tipo) => {
    if (!usuarioActual) return;
    try {
      const response = await apiFetch('/swipe', {
        method: 'POST',
        body: JSON.stringify({ mi_id: user.id, destino_id: usuarioActual.id, tipo }),
      });
      const data = await response.json();
      setDetailVisible(false);
      setUsuarios((current) => current.slice(1));
      if (data.match) {
        Alert.alert('Es match', `Tu y ${usuarioActual.nombre} ahora pueden chatear en Conexiones.`);
      }
    } catch (error) {
      console.error('Error al registrar decision', error);
    }
  };

  const handleModeration = (accion) => {
    if (!usuarioActual) return;
    const labels = {
      hide: 'Ocultar',
      block: 'Bloquear',
      report: 'Reportar',
    };

    Alert.alert(labels[accion], `Quieres ${labels[accion].toLowerCase()} a ${usuarioActual.nombre}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: labels[accion],
        style: accion === 'block' ? 'destructive' : 'default',
        onPress: async () => {
          try {
            await apiFetch('/moderacion', {
              method: 'POST',
              body: JSON.stringify({ mi_id: user.id, destino_id: usuarioActual.id, accion, motivo: `Accion desde radar: ${accion}` }),
            });
            setDetailVisible(false);
            setUsuarios((current) => current.slice(1));
          } catch (error) {
            console.error('Error en moderacion', error);
          }
        },
      },
    ]);
  };

  const handlePhotoReport = () => {
    if (!usuarioActual?.foto) {
      Alert.alert('Sin foto visible', 'Este perfil no tiene una foto publica para reportar ahora mismo.');
      return;
    }

    Alert.alert('Reportar foto', `Quieres reportar la foto principal de ${usuarioActual.nombre}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Reportar',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiFetch('/moderacion/foto', {
              method: 'POST',
              body: JSON.stringify({
                mi_id: user.id,
                destino_id: usuarioActual.id,
                foto_url: usuarioActual.foto,
                motivo: 'Reporte desde radar',
              }),
            });
            Alert.alert('Gracias', 'La foto quedo reportada para revision.');
          } catch (error) {
            console.error('Error reportando foto', error);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle}>Radar</Text>
      <Text style={styles.screenSubtitle}>Perfiles nuevos, excluyendo vistos, ocultos y bloqueados. Tu filtro de edad y distancia ya esta activo.</Text>

      {loading ? (
        <View style={styles.feedbackBox}>
          <ActivityIndicator color="#D4AF37" size="large" />
          <Text style={styles.feedbackText}>Buscando perfiles...</Text>
        </View>
      ) : !usuarioActual ? (
        <View style={styles.feedbackBox}>
          <Text style={styles.emptyText}>No hay perfiles disponibles con tus filtros actuales.</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchUsuarios}>
            <Text style={styles.refreshText}>Recargar radar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ProfileCard profile={usuarioActual} onOpen={() => setDetailVisible(true)} />

          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionButton, styles.passButton]} onPress={() => handleDecision('dislike')}>
              <Text style={styles.actionLabel}>Nope</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.likeButton]} onPress={() => handleDecision('like')}>
              <Text style={[styles.actionLabel, styles.darkActionLabel]}>Like</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.secondaryActions}>
            <TouchableOpacity style={styles.secondaryActionButton} onPress={() => handleModeration('hide')}>
              <Text style={styles.secondaryActionText}>Ocultar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryActionButton} onPress={() => handleModeration('report')}>
              <Text style={styles.secondaryActionText}>Reportar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryActionButton} onPress={() => handleModeration('block')}>
              <Text style={styles.secondaryActionText}>Bloquear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryActionButton} onPress={handlePhotoReport}>
              <Text style={styles.secondaryActionText}>Reportar foto</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <ProfileDetailModal
        visible={detailVisible}
        profile={usuarioActual}
        onClose={() => setDetailVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050510', padding: 16 },
  screenTitle: { color: '#D4AF37', fontSize: 24, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  screenSubtitle: { color: '#8c8ca3', fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
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
  cardInfo: { padding: 20, backgroundColor: 'rgba(5, 5, 16, 0.84)' },
  cardTitle: { color: '#fff', fontSize: 26, fontWeight: '700' },
  cardSubtitle: { color: '#D4AF37', fontSize: 15, marginTop: 4, fontWeight: '700' },
  cardText: { color: '#d6d6df', fontSize: 14, marginTop: 6 },
  cardBio: { color: '#fff', fontSize: 14, lineHeight: 20, marginTop: 10 },
  cardHighlight: { color: '#f1dfa2', fontSize: 14, fontWeight: '700', marginTop: 10 },
  cardReason: { color: '#ececf8', marginTop: 8, lineHeight: 20 },
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
  secondaryActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  secondaryActionButton: {
    minWidth: '47%',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#14142f',
    borderWidth: 1,
    borderColor: '#27274a',
  },
  secondaryActionText: { color: '#c9c9db', fontWeight: '700', fontSize: 13 },
});
