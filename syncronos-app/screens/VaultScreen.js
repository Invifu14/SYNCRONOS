import React, { useCallback, useContext, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { AppContext } from '../context/AppContext';

function SegmentButton({ active, label, onPress }) {
  return (
    <TouchableOpacity style={[styles.segmentButton, active && styles.segmentButtonActive]} onPress={onPress}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function VaultScreen() {
  const [segment, setSegment] = useState('matches');
  const [connections, setConnections] = useState({ likes_enviados: [], likes_recibidos: [], matches: [] });
  const { user, baseUrl } = useContext(AppContext);
  const navigation = useNavigation();

  const loadConnections = useCallback(async () => {
    if (!user?.id) {
      setConnections({ likes_enviados: [], likes_recibidos: [], matches: [] });
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/connections/${user.id}`);
      const data = await response.json();
      setConnections({
        likes_enviados: data.likes_enviados ?? [],
        likes_recibidos: data.likes_recibidos ?? [],
        matches: data.matches ?? [],
      });
    } catch (error) {
      console.error('Error al cargar conexiones', error);
    }
  }, [baseUrl, user?.id]);

  useFocusEffect(useCallback(() => { loadConnections(); }, [loadConnections]));

  const acceptLike = async (targetId) => {
    try {
      await fetch(`${baseUrl}/swipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mi_id: user.id, destino_id: targetId, tipo: 'like' }),
      });
      loadConnections();
    } catch (error) {
      console.error('No se pudo aceptar el like', error);
    }
  };

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
        list.map((item) => (
          <View key={`${segment}-${item.id}`} style={[styles.card, segment === 'matches' && styles.matchCard]}>
            <Text style={styles.cardTitle}>
              {item.nombre}
              {item.mostrar_edad === false ? '' : `, ${item.edad ?? '?'}`}
            </Text>
            <Text style={styles.cardSubtitle}>
              {[item.signo_zodiacal, item.intencion, item.distancia !== null ? `${item.distancia} km` : null].filter(Boolean).join(' · ')}
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
            ) : segment === 'likes_recibidos' ? (
              <TouchableOpacity style={styles.primaryButton} onPress={() => acceptLike(item.id)}>
                <Text style={styles.primaryButtonText}>Responder con like</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.pendingText}>Esperando respuesta.</Text>
            )}
          </View>
        ))
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
  primaryButton: {
    marginTop: 14,
    backgroundColor: '#D4AF37',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#050510', fontWeight: '800' },
});
