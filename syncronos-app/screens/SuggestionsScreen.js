import React, { useCallback, useContext, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AppContext } from '../context/AppContext';
import PremiumPhotoOverlay from '../components/PremiumPhotoOverlay';
import ProfileDetailModal from '../components/ProfileDetailModal';

const { width } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const GRID_GAP = 12;
const HORIZONTAL_PADDING = 16;
const CARD_WIDTH = (width - (HORIZONTAL_PADDING * 2) - (GRID_GAP * (GRID_COLUMNS - 1))) / GRID_COLUMNS;
const CARD_HEIGHT = CARD_WIDTH * 1.42;

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

function AffinityCard({ profile, onPress }) {
  const firstPhoto = useMemo(() => getProfilePhotos(profile)[0], [profile]);

  return (
    <TouchableOpacity style={styles.gridCard} activeOpacity={0.88} onPress={onPress}>
      <View style={styles.gridPhotoShell}>
        {firstPhoto ? (
          <Image source={{ uri: firstPhoto }} style={styles.gridPhoto} blurRadius={22} />
        ) : (
          <View style={styles.gridPlaceholder}>
            <Ionicons name="image-outline" size={24} color="#FFF4C6" />
          </View>
        )}
        <PremiumPhotoOverlay compact title="Premium" subtitle="" />
        <View style={styles.compatibilityPill}>
          <Text style={styles.compatibilityPillText}>{`${profile.compatibilidad ?? 0}%`}</Text>
        </View>
      </View>
      <Text style={styles.gridName} numberOfLines={1}>
        {profile.nombre}
        {profile.mostrar_edad === false ? '' : `, ${profile.edad ?? '?'}`}
      </Text>
      <Text style={styles.gridMeta} numberOfLines={1}>
        {profile.signo_zodiacal || 'Signo'}
        {profile.distancia !== null && profile.distancia !== undefined ? ` · ${profile.distancia} km` : ''}
      </Text>
    </TouchableOpacity>
  );
}

export default function SuggestionsScreen() {
  const [sugerencias, setSugerencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
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

  useFocusEffect(useCallback(() => {
    fetchSugerencias();
  }, [fetchSugerencias]));

  const openProfile = (profile) => {
    setSelectedProfile(profile);
    setDetailVisible(true);
  };

  const closeProfile = () => {
    setDetailVisible(false);
    setSelectedProfile(null);
  };

  const handleDecision = async (tipo) => {
    if (!selectedProfile) return;
    try {
      const response = await apiFetch('/swipe', {
        method: 'POST',
        body: JSON.stringify({ mi_id: user.id, destino_id: selectedProfile.id, tipo }),
      });
      const data = await response.json();
      setDetailVisible(false);
      setSugerencias((current) => current.filter((item) => item.id !== selectedProfile.id));
      if (data.match) {
        Alert.alert('Es match', `Tu y ${selectedProfile.nombre} ahora pueden chatear en Conexiones.`);
      }
      setSelectedProfile(null);
    } catch (error) {
      console.error('Error al registrar decision', error);
    }
  };

  const listHeader = (
    <>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Afinidad</Text>
          <Text style={styles.subtitle}>Vista previa premium guiada por fecha de nacimiento, carta astral y quimica potencial.</Text>
        </View>
        <View style={styles.premiumBadge}>
          <Ionicons name="diamond" size={14} color="#050510" />
          <Text style={styles.premiumBadgeText}>PREMIUM</Text>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <Text style={styles.heroEyebrow}>Tus afinidades premium de hoy</Text>
        <Text style={styles.heroTitle}>
          {sugerencias.length ? `${sugerencias.length} perfiles listos para explorar` : 'Hoy no encontramos una afinidad fuerte para ti'}
        </Text>
        <Text style={styles.heroText}>
          Puedes abrir el perfil completo y leer la compatibilidad. Las fotos seguiran ocultas hasta desbloquear la version premium.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Todo el mundo</Text>
    </>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.feedbackBox}>
          <ActivityIndicator color="#D4AF37" size="large" />
          <Text style={styles.feedbackText}>Calculando compatibilidades...</Text>
        </View>
      ) : (
        <FlatList
          data={sugerencias}
          keyExtractor={(item) => `${item.id}`}
          renderItem={({ item }) => <AffinityCard profile={item} onPress={() => openProfile(item)} />}
          numColumns={GRID_COLUMNS}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Sin nuevas afinidades por ahora</Text>
              <Text style={styles.emptyText}>Mueve tus filtros desde Radar o vuelve mas tarde para descubrir otra tanda de perfiles.</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={fetchSugerencias}>
                <Text style={styles.emptyButtonText}>Actualizar afinidad</Text>
              </TouchableOpacity>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <ProfileDetailModal
        visible={detailVisible}
        profile={selectedProfile}
        onClose={closeProfile}
        hidePhotos
        photoLockTitle="Fotos reservadas"
        photoLockSubtitle="Puedes leer la compatibilidad completa, pero las fotos se desbloquearan cuando actives Afinidad premium."
        footerContent={selectedProfile ? (
          <>
            <Text style={styles.modalHint}>Ya puedes decidir por la vibra, la compatibilidad y el perfil. Las fotos completas se liberaran mas adelante.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalActionButton, styles.modalPassButton]} onPress={() => handleDecision('dislike')}>
                <Text style={styles.modalActionText}>Nope</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalActionButton, styles.modalLikeButton]} onPress={() => handleDecision('like')}>
                <Text style={[styles.modalActionText, styles.modalDarkActionText]}>Like</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050510',
  },
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 16,
    paddingBottom: 30,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: '#D4AF37',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: '#8c8ca3',
    fontSize: 14,
    lineHeight: 20,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D4AF37',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  premiumBadgeText: {
    color: '#050510',
    fontWeight: '800',
    fontSize: 12,
  },
  heroCard: {
    backgroundColor: '#17112b',
    borderRadius: 26,
    padding: 22,
    borderWidth: 1,
    borderColor: '#30214f',
    marginBottom: 24,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -20,
    right: -12,
    width: 130,
    height: 130,
    borderRadius: 999,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
  },
  heroEyebrow: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  heroTitle: {
    color: '#FFF4C6',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
    marginBottom: 10,
    maxWidth: '90%',
  },
  heroText: {
    color: '#d8d3e7',
    fontSize: 14,
    lineHeight: 21,
    maxWidth: '92%',
  },
  sectionTitle: {
    color: '#FFF4C6',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 14,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  gridCard: {
    width: CARD_WIDTH,
  },
  gridPhotoShell: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#11112e',
    borderWidth: 1,
    borderColor: '#1d1d41',
    marginBottom: 10,
  },
  gridPhoto: {
    width: '100%',
    height: '100%',
  },
  gridPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14142f',
  },
  compatibilityPill: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(5, 5, 16, 0.82)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  compatibilityPillText: {
    color: '#D4AF37',
    fontSize: 11,
    fontWeight: '800',
  },
  gridName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  gridMeta: {
    color: '#a8a8c2',
    fontSize: 12,
    lineHeight: 16,
  },
  emptyState: {
    backgroundColor: '#0f0f25',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#1a1a3a',
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#FFF4C6',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyText: {
    color: '#b7b7c9',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 18,
  },
  emptyButton: {
    backgroundColor: '#D4AF37',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  emptyButtonText: {
    color: '#050510',
    fontWeight: '800',
  },
  feedbackBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f25',
    margin: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1a1a3a',
    padding: 24,
  },
  feedbackText: {
    color: '#ccc',
    marginTop: 14,
    fontSize: 15,
  },
  modalHint: {
    color: '#c9c9db',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalActionButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalPassButton: {
    backgroundColor: '#2a1016',
    borderColor: '#ff6b6b',
  },
  modalLikeButton: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  modalActionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  modalDarkActionText: {
    color: '#050510',
  },
});
