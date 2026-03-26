import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { AppContext } from '../context/AppContext';

function SegmentButton({ active, label, onPress }) {
  return (
    <TouchableOpacity style={[styles.segmentButton, active && styles.segmentButtonActive]} onPress={onPress}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const getConnectionPhoto = (item) => {
  const sourcePhotos = item?.fotos_visibles?.length
    ? item.fotos_visibles
    : item?.fotos?.length
      ? item.fotos
      : item?.foto
        ? [item.foto]
        : [];

  return sourcePhotos.find(Boolean) || null;
};

const getShortName = (name) => `${name || ''}`.trim().split(/\s+/).filter(Boolean)[0] || 'Alguien';

function ReceivedLikeCard({ item }) {
  const photo = getConnectionPhoto(item);
  const shortName = getShortName(item.nombre);
  const teaserTitle = item.mostrar_edad === false ? shortName : `${shortName}, ${item.edad ?? '?'}`;
  const teaserMeta = [item.signo_zodiacal, item.intencion, item.distancia !== null ? `${item.distancia} km` : null]
    .filter(Boolean)
    .join(' | ');

  const teaserContent = (
    <View style={styles.previewScrim}>
      <View style={styles.previewBadge}>
        <Text style={styles.previewBadgeText}>Te dio like</Text>
      </View>
      <View style={styles.previewCopy}>
        <Text style={styles.previewTitle}>{teaserTitle}</Text>
        {teaserMeta ? <Text style={styles.previewSubtitle}>{teaserMeta}</Text> : null}
        <Text style={styles.previewHint}>Vista previa difuminada pensada para futuras funciones premium.</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.previewCard}>
      {photo ? (
        <ImageBackground
          source={{ uri: photo }}
          blurRadius={28}
          style={styles.previewHero}
          imageStyle={styles.previewHeroImage}
        >
          {teaserContent}
        </ImageBackground>
      ) : (
        <View style={[styles.previewHero, styles.previewFallback]}>
          {teaserContent}
        </View>
      )}
    </View>
  );
}

export default function VaultScreen() {
  const [segment, setSegment] = useState('matches');
  const [connections, setConnections] = useState({ likes_enviados: [], likes_recibidos: [], matches: [] });
  const { user, apiFetch, socket } = useContext(AppContext);
  const navigation = useNavigation();

  const loadConnections = useCallback(async () => {
    if (!user?.id) {
      setConnections({ likes_enviados: [], likes_recibidos: [], matches: [] });
      return;
    }

    try {
      const response = await apiFetch(`/connections/${user.id}`);
      const data = await response.json();
      setConnections({
        likes_enviados: data.likes_enviados ?? [],
        likes_recibidos: data.likes_recibidos ?? [],
        matches: data.matches ?? [],
      });
    } catch (error) {
      console.error('Error al cargar conexiones', error);
    }
  }, [apiFetch, user?.id]);

  useFocusEffect(useCallback(() => { loadConnections(); }, [loadConnections]));

  useEffect(() => {
    if (!socket) return undefined;

    const refreshConnections = () => {
      loadConnections();
    };

    socket.on('connections:refresh', refreshConnections);
    socket.on('match:created', refreshConnections);

    return () => {
      socket.off('connections:refresh', refreshConnections);
      socket.off('match:created', refreshConnections);
    };
  }, [loadConnections, socket]);

  const list = segment === 'matches'
    ? connections.matches
    : segment === 'likes_recibidos'
      ? connections.likes_recibidos
      : connections.likes_enviados;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Conexiones</Text>
        <Text style={styles.headerSubtitle}>Separamos likes enviados, likes recibidos y matches con chat.</Text>
      </View>

      <View style={styles.segmentRow}>
        <SegmentButton active={segment === 'matches'} label={`Matches (${connections.matches.length})`} onPress={() => setSegment('matches')} />
        <SegmentButton active={segment === 'likes_recibidos'} label={`Te dieron like (${connections.likes_recibidos.length})`} onPress={() => setSegment('likes_recibidos')} />
        <SegmentButton active={segment === 'likes_enviados'} label={`Tus likes (${connections.likes_enviados.length})`} onPress={() => setSegment('likes_enviados')} />
      </View>

      {list.length === 0 ? (
        <Text style={styles.emptyText}>Nada por aqui todavia.</Text>
      ) : (
        list.map((item) => {
          if (segment === 'likes_recibidos') {
            return (
              <ReceivedLikeCard
                key={`${segment}-${item.id}`}
                item={item}
              />
            );
          }

          return (
            <View key={`${segment}-${item.id}`} style={[styles.card, segment === 'matches' && styles.matchCard]}>
              <Text style={styles.cardTitle}>
                {item.nombre}
                {item.mostrar_edad === false ? '' : `, ${item.edad ?? '?'}`}
              </Text>
              <Text style={styles.cardSubtitle}>
                {[item.signo_zodiacal, item.intencion, item.distancia !== null ? `${item.distancia} km` : null].filter(Boolean).join(' | ')}
              </Text>
              {item.bio ? <Text style={styles.cardText}>{item.bio}</Text> : null}
              {segment === 'matches' ? (
                <>
                  {item.ultimo_mensaje ? <Text style={styles.lastMessage}>{item.ultimo_mensaje}</Text> : <Text style={styles.lastMessage}>Aun no han empezado a hablar.</Text>}
                  {item.mensajes_no_leidos ? <Text style={styles.unread}>{item.mensajes_no_leidos} mensaje(s) sin leer</Text> : null}
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => navigation.navigate('Chat', { otherUserId: item.id, nombre: item.nombre })}
                  >
                    <Text style={styles.primaryButtonText}>Abrir chat</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.pendingText}>Esperando respuesta.</Text>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050510' },
  content: { padding: 16, paddingBottom: 40 },
  header: {
    backgroundColor: '#0f0f25',
    padding: 18,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1a1a3a',
  },
  headerTitle: { color: '#D4AF37', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  headerSubtitle: { color: '#aaa', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  segmentRow: { marginBottom: 18 },
  segmentButton: {
    backgroundColor: '#14142f',
    borderWidth: 1,
    borderColor: '#26264a',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  segmentButtonActive: { backgroundColor: '#D4AF37', borderColor: '#D4AF37' },
  segmentText: { color: '#d4d4e0', fontWeight: '700', textAlign: 'center' },
  segmentTextActive: { color: '#050510' },
  emptyText: { color: '#ccc', textAlign: 'center', marginTop: 30, fontSize: 16 },
  card: {
    backgroundColor: '#0f0f25',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1a1a3a',
  },
  matchCard: { borderColor: '#34553a' },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  cardSubtitle: { color: '#D4AF37', fontSize: 13, marginTop: 6, lineHeight: 18 },
  cardText: { color: '#d4d4de', marginTop: 10, lineHeight: 20 },
  lastMessage: { color: '#c8c8da', marginTop: 10 },
  unread: { color: '#6fe27f', marginTop: 8, fontWeight: '700' },
  pendingText: { color: '#d1c27d', marginTop: 12, fontWeight: '700' },
  previewCard: {
    backgroundColor: '#0f0f25',
    borderRadius: 22,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2b2351',
    overflow: 'hidden',
    padding: 12,
  },
  previewHero: {
    minHeight: 230,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#161135',
  },
  previewHeroImage: {
    borderRadius: 18,
    transform: [{ scale: 1.08 }],
  },
  previewFallback: {
    backgroundColor: '#1a153a',
  },
  previewScrim: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(5, 5, 16, 0.48)',
    padding: 18,
  },
  previewBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(212, 175, 55, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.55)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  previewBadgeText: {
    color: '#f2dd96',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  previewCopy: {
    marginTop: 26,
  },
  previewTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  previewSubtitle: {
    color: '#f1dfa2',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 10,
  },
  previewHint: {
    color: '#ece8ff',
    lineHeight: 21,
    marginTop: 12,
    maxWidth: 260,
  },
  primaryButton: {
    marginTop: 14,
    backgroundColor: '#D4AF37',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#050510', fontWeight: '800' },
});
