import React, { useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ProfilePhotoCarousel from './ProfilePhotoCarousel';

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

export default function ProfileDetailModal({
  visible,
  profile,
  onClose,
}) {
  const photos = useMemo(() => getProfilePhotos(profile), [profile]);
  const prompts = useMemo(
    () => (profile?.prompts || []).filter((prompt) => `${prompt?.answer || ''}`.trim()),
    [profile?.prompts]
  );

  if (!profile) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <ProfilePhotoCarousel photos={photos} height={420} borderRadius={24}>
              <View style={styles.heroOverlay}>
                <Text style={styles.name}>
                  {profile.nombre}
                  {profile.mostrar_edad === false ? '' : `, ${profile.edad ?? '?'}`}
                </Text>
                <Text style={styles.kicker}>
                  {[profile.signo_zodiacal, profile.generacion, profile.intencion].filter(Boolean).join(' | ')}
                </Text>
                <Text style={styles.location}>
                  {profile.ubicacion || 'Ubicacion privada'}
                  {profile.distancia !== null && profile.distancia !== undefined ? ` | ${profile.distancia} km` : ''}
                </Text>
              </View>
            </ProfilePhotoCarousel>

            {profile.compatibilidad ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Lectura de compatibilidad</Text>
                <View style={styles.compatibilityBadge}>
                  <Text style={styles.compatibilityScore}>{`${profile.compatibilidad}% afinidad`}</Text>
                </View>
                {profile.interpretacion_compatibilidad?.title ? (
                  <Text style={styles.compatibilityTitle}>{profile.interpretacion_compatibilidad.title}</Text>
                ) : null}
                {profile.interpretacion_compatibilidad?.summary ? (
                  <Text style={styles.sectionText}>{profile.interpretacion_compatibilidad.summary}</Text>
                ) : null}
                {profile.razon_compatibilidad?.map((reason) => (
                  <Text key={reason} style={styles.reasonItem}>{`- ${reason}`}</Text>
                ))}
                {profile.interpretacion_compatibilidad?.next_step ? (
                  <Text style={styles.nextStep}>{profile.interpretacion_compatibilidad.next_step}</Text>
                ) : null}
              </View>
            ) : null}

            {profile.bio || profile.ocupacion || profile.educacion || profile.gustos ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Perfil</Text>
                {profile.bio ? <Text style={styles.sectionText}>{profile.bio}</Text> : null}
                {[profile.ocupacion, profile.educacion].filter(Boolean).length ? (
                  <Text style={styles.metaText}>{[profile.ocupacion, profile.educacion].filter(Boolean).join(' | ')}</Text>
                ) : null}
                {profile.gustos ? <Text style={styles.metaText}>{profile.gustos}</Text> : null}
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mapa astral</Text>
              <Text style={styles.astroLine}>{`Sol: ${profile.signo_zodiacal || 'Desconocido'}`}</Text>
              <Text style={styles.astroLine}>{`Luna: ${profile.luna || 'Desconocido'}`}</Text>
              <Text style={styles.astroLine}>{`Ascendente: ${profile.ascendente || 'Desconocido'}`}</Text>
              <Text style={styles.astroLine}>{`Venus: ${profile.venus || 'Desconocido'}`}</Text>
              <Text style={styles.astroLine}>{`Marte: ${profile.marte || 'Desconocido'}`}</Text>
            </View>

            {prompts.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tus datos curiosos</Text>
                {prompts.map((prompt) => (
                  <View key={prompt.id} style={styles.promptCard}>
                    <Text style={styles.promptQuestion}>{prompt.question}</Text>
                    <Text style={styles.promptAnswer}>{prompt.answer}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cerrar perfil</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 2, 10, 0.82)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: '92%',
    backgroundColor: '#050510',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#1a1a3a',
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  heroOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(5, 5, 16, 0.42)',
    padding: 20,
  },
  name: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
  },
  kicker: {
    color: '#D4AF37',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  location: {
    color: '#d6d6df',
    fontSize: 14,
    marginTop: 8,
  },
  section: {
    backgroundColor: '#0f0f25',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1a1a3a',
    padding: 18,
    marginTop: 16,
  },
  sectionTitle: {
    color: '#D4AF37',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  compatibilityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#D4AF37',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  compatibilityScore: {
    color: '#050510',
    fontWeight: '800',
  },
  compatibilityTitle: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 8,
  },
  sectionText: {
    color: '#ececf8',
    lineHeight: 22,
  },
  reasonItem: {
    color: '#f1dfa2',
    marginTop: 10,
    lineHeight: 20,
  },
  nextStep: {
    color: '#c9c9db',
    marginTop: 12,
    lineHeight: 20,
  },
  metaText: {
    color: '#c9c9db',
    marginTop: 10,
    lineHeight: 20,
  },
  astroLine: {
    color: '#fff',
    marginBottom: 8,
    lineHeight: 20,
  },
  promptCard: {
    backgroundColor: '#11112e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1a1a3a',
    padding: 14,
    marginBottom: 10,
  },
  promptQuestion: {
    color: '#D4AF37',
    fontWeight: '700',
    marginBottom: 8,
  },
  promptAnswer: {
    color: '#fff',
    lineHeight: 21,
  },
  closeButton: {
    margin: 16,
    backgroundColor: '#D4AF37',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#050510',
    fontWeight: '800',
    fontSize: 15,
  },
});
