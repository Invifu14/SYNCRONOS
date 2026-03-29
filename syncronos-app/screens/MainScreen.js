import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AppContext } from '../context/AppContext';
import ProfileDetailModal from '../components/ProfileDetailModal';
import ProfilePhotoCarousel from '../components/ProfilePhotoCarousel';
import { RangeSlider, SingleSlider } from '../components/PreferenceSliders';

const { height } = Dimensions.get('window');
const RADAR_INTEREST_OPTIONS = ['Hombres', 'Mujeres', 'Todos'];
const DEFAULT_RADAR_FILTERS = {
  genero_interes: 'Todos',
  edad_min_pref: '18',
  edad_max_pref: '35',
  distancia_max_km: '50',
};

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

const normalizeRadarFilters = (source = {}) => ({
  genero_interes: source.genero_interes || DEFAULT_RADAR_FILTERS.genero_interes,
  edad_min_pref: `${source.edad_min_pref ?? DEFAULT_RADAR_FILTERS.edad_min_pref}`,
  edad_max_pref: `${source.edad_max_pref ?? DEFAULT_RADAR_FILTERS.edad_max_pref}`,
  distancia_max_km: `${source.distancia_max_km ?? DEFAULT_RADAR_FILTERS.distancia_max_km}`,
});

const sanitizeFilterValue = (value, fallback, min, max) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
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
  const [filterVisible, setFilterVisible] = useState(false);
  const [applyingFilters, setApplyingFilters] = useState(false);
  const [filterDraft, setFilterDraft] = useState(() => normalizeRadarFilters());
  const { user, apiFetch, refreshUser, setUser } = useContext(AppContext);

  useEffect(() => {
    setFilterDraft(normalizeRadarFilters(user || {}));
  }, [user?.genero_interes, user?.edad_min_pref, user?.edad_max_pref, user?.distancia_max_km]);

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

  useFocusEffect(useCallback(() => {
    fetchUsuarios();
  }, [fetchUsuarios]));

  const usuarioActual = usuarios[0];
  const activeFilters = normalizeRadarFilters(user || {});
  const activeAgeMin = sanitizeFilterValue(activeFilters.edad_min_pref, 18, 18, 80);
  const activeAgeMax = Math.max(activeAgeMin, sanitizeFilterValue(activeFilters.edad_max_pref, 35, 18, 80));
  const activeDistance = sanitizeFilterValue(activeFilters.distancia_max_km, 50, 1, 300);
  const currentAgeMin = sanitizeFilterValue(filterDraft.edad_min_pref, 18, 18, 80);
  const currentAgeMax = Math.max(currentAgeMin, sanitizeFilterValue(filterDraft.edad_max_pref, 35, 18, 80));
  const currentDistance = sanitizeFilterValue(filterDraft.distancia_max_km, 50, 1, 300);
  const hasCustomFilters = activeFilters.genero_interes !== DEFAULT_RADAR_FILTERS.genero_interes
    || activeAgeMin !== Number(DEFAULT_RADAR_FILTERS.edad_min_pref)
    || activeAgeMax !== Number(DEFAULT_RADAR_FILTERS.edad_max_pref)
    || activeDistance !== Number(DEFAULT_RADAR_FILTERS.distancia_max_km);

  const filterSummary = `${activeFilters.genero_interes} · ${activeAgeMin}-${activeAgeMax} · ${activeDistance} km`;

  const updateFilterDraft = (key, value) => {
    setFilterDraft((current) => ({ ...current, [key]: value }));
  };

  const openFilters = () => {
    setFilterDraft(normalizeRadarFilters(user || {}));
    setFilterVisible(true);
  };

  const applyFilters = async () => {
    if (!user?.id) return;

    setApplyingFilters(true);
    try {
      const response = await apiFetch(`/perfil/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          genero_interes: filterDraft.genero_interes,
          edad_min_pref: currentAgeMin,
          edad_max_pref: currentAgeMax,
          distancia_max_km: currentDistance,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        Alert.alert('Error', data.mensaje || 'No se pudieron aplicar los filtros.');
        return;
      }

      if (data.usuario) {
        setUser(data.usuario);
      }
      await refreshUser();
      await fetchUsuarios();
      setFilterVisible(false);
    } catch (error) {
      console.error('Error al aplicar filtros', error);
      Alert.alert('Error', 'No se pudieron guardar los filtros del radar.');
    } finally {
      setApplyingFilters(false);
    }
  };

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
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.screenTitle}>Radar</Text>
          <Text style={styles.screenSubtitle}>Filtrando por {filterSummary}. Ajusta tus preferencias para descubrir mejores matches.</Text>
        </View>
        <TouchableOpacity style={styles.filterTrigger} onPress={openFilters} activeOpacity={0.85}>
          <Ionicons name="options-outline" size={24} color="#FFF4C6" />
          {hasCustomFilters ? <View style={styles.filterDot} /> : null}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.feedbackBox}>
          <ActivityIndicator color="#D4AF37" size="large" />
          <Text style={styles.feedbackText}>Buscando perfiles...</Text>
        </View>
      ) : !usuarioActual ? (
        <View style={styles.feedbackBox}>
          <View style={styles.emptyBadge}>
            <Ionicons name="sparkles-outline" size={26} color="#D4AF37" />
          </View>
          <Text style={styles.emptyTitle}>Se acabo lo que se daba</Text>
          <Text style={styles.emptyText}>Prueba moviendo tus filtros de Radar para encontrar nuevas conexiones compatibles.</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={openFilters}>
            <Text style={styles.refreshText}>Abrir filtros</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryRefreshButton} onPress={fetchUsuarios}>
            <Text style={styles.secondaryRefreshText}>Recargar radar</Text>
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

      <Modal visible={filterVisible} transparent animationType="slide" onRequestClose={() => setFilterVisible(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setFilterVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filtrar parejas</Text>
              <TouchableOpacity style={styles.sheetCloseButton} onPress={() => setFilterVisible(false)}>
                <Ionicons name="close" size={26} color="#FFF4C6" />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetSubtitle}>Usaremos estos filtros en Radar para ajustar a quien ves primero.</Text>

            <View style={styles.sheetSection}>
              <View style={styles.sheetSectionHeader}>
                <Text style={styles.sheetLabel}>Mostrar</Text>
                <Text style={styles.sheetValue}>{filterDraft.genero_interes}</Text>
              </View>
              <View style={styles.pillRow}>
                {RADAR_INTEREST_OPTIONS.map((option) => {
                  const active = filterDraft.genero_interes === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.pillButton, active && styles.pillButtonActive]}
                      onPress={() => updateFilterDraft('genero_interes', option)}
                    >
                      <Text style={[styles.pillText, active && styles.pillTextActive]}>{option}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.sheetDivider} />

            <View style={styles.sliderBlock}>
              <RangeSlider
                label="Edad"
                lowValue={currentAgeMin}
                highValue={currentAgeMax}
                min={18}
                max={80}
                step={1}
                formatValue={(low, high) => `${low}-${high}`}
                onChangeLow={(value) => updateFilterDraft('edad_min_pref', `${value}`)}
                onChangeHigh={(value) => updateFilterDraft('edad_max_pref', `${value}`)}
              />
              <SingleSlider
                label="Distancia (km)"
                value={currentDistance}
                min={1}
                max={300}
                step={1}
                formatValue={(value) => `${value} km`}
                onChange={(value) => updateFilterDraft('distancia_max_km', `${value}`)}
              />
            </View>

            <TouchableOpacity style={styles.moreOptionsRow} onPress={() => Alert.alert('Pronto', 'Iremos sumando mas opciones de filtrado al Radar muy pronto.')}>
              <Text style={styles.moreOptionsLabel}>Mas opciones</Text>
              <View style={styles.moreOptionsRight}>
                <Text style={styles.moreOptionsHint}>Proximamente</Text>
                <Ionicons name="chevron-forward" size={20} color="#8c8ca3" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.applyButton, applyingFilters && styles.applyButtonDisabled]} onPress={applyFilters} disabled={applyingFilters}>
              <Text style={styles.applyButtonText}>{applyingFilters ? 'Aplicando...' : 'Aplicar filtros'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 18,
  },
  headerCopy: {
    flex: 1,
  },
  screenTitle: {
    color: '#D4AF37',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
  },
  screenSubtitle: {
    color: '#8c8ca3',
    fontSize: 14,
    lineHeight: 20,
  },
  filterTrigger: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#0f0f25',
    borderWidth: 1,
    borderColor: '#1f1f3f',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 6,
  },
  filterDot: {
    position: 'absolute',
    top: 11,
    right: 11,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff5a73',
    borderWidth: 1,
    borderColor: '#050510',
  },
  feedbackBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f25',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1a1a3a',
    padding: 24,
  },
  feedbackText: { color: '#ccc', marginTop: 14, fontSize: 15 },
  emptyBadge: {
    width: 76,
    height: 76,
    borderRadius: 999,
    backgroundColor: '#1c1733',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    color: '#FFF4C6',
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyText: {
    color: '#b7b7c9',
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  refreshButton: {
    backgroundColor: '#D4AF37',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
    marginBottom: 10,
  },
  refreshText: { color: '#050510', fontWeight: '800', fontSize: 15 },
  secondaryRefreshButton: {
    backgroundColor: '#171736',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2a2a4c',
  },
  secondaryRefreshText: { color: '#FFF4C6', fontWeight: '700' },
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
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
  },
  sheet: {
    backgroundColor: '#0f0f25',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: '#1e1e40',
  },
  sheetHandle: {
    width: 54,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#2a2a4c',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 6,
  },
  sheetTitle: {
    color: '#FFF4C6',
    fontSize: 26,
    fontWeight: '800',
  },
  sheetCloseButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#171736',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4c',
  },
  sheetSubtitle: {
    color: '#8c8ca3',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  sheetSection: {
    marginBottom: 10,
  },
  sheetSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sheetLabel: {
    color: '#FFF4C6',
    fontSize: 16,
    fontWeight: '700',
  },
  sheetValue: {
    color: '#D4AF37',
    fontSize: 16,
    fontWeight: '800',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pillButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#171736',
    borderWidth: 1,
    borderColor: '#2a2a4c',
  },
  pillButtonActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  pillText: {
    color: '#FFF4C6',
    fontWeight: '700',
  },
  pillTextActive: {
    color: '#050510',
  },
  sheetDivider: {
    height: 1,
    backgroundColor: '#1f1f3f',
    marginVertical: 16,
  },
  sliderBlock: {
    marginBottom: 10,
  },
  moreOptionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: '#1f1f3f',
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f3f',
    marginBottom: 18,
  },
  moreOptionsLabel: {
    color: '#FFF4C6',
    fontSize: 17,
    fontWeight: '700',
  },
  moreOptionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  moreOptionsHint: {
    color: '#8c8ca3',
    fontSize: 13,
    fontWeight: '700',
  },
  applyButton: {
    backgroundColor: '#D4AF37',
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: 'center',
  },
  applyButtonDisabled: {
    opacity: 0.7,
  },
  applyButtonText: {
    color: '#050510',
    fontSize: 18,
    fontWeight: '800',
  },
});
