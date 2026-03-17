import React, { useCallback, useContext, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AppContext } from '../context/AppContext';

const { height } = Dimensions.get('window');

export default function SuggestionsScreen() {
  const [sugerencias, setSugerencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user, baseUrl } = useContext(AppContext);

  const fetchSugerencias = useCallback(async () => {
    if (!user?.id) {
      setSugerencias([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}/feed/${user.id}?mode=affinity`);
      const data = await response.json();
      setSugerencias(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al obtener sugerencias', error);
      setSugerencias([]);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, user?.id]);

  useFocusEffect(useCallback(() => { fetchSugerencias(); }, [fetchSugerencias]));

  const sugerenciaActual = sugerencias[0];

  const handleDecision = async (tipo) => {
    if (!sugerenciaActual) return;
    try {
      const response = await fetch(`${baseUrl}/swipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mi_id: user.id, destino_id: sugerenciaActual.id, tipo }),
      });
      const data = await response.json();
      setSugerencias((current) => current.slice(1));
      if (data.match) {
        Alert.alert('Es match', `Tu y ${sugerenciaActual.nombre} ahora pueden chatear en Conexiones.`);
      }
    } catch (error) {
      console.error('Error al registrar decision', error);
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
          <View style={styles.card}>
            <Image source={{ uri: sugerenciaActual.foto }} style={styles.cardImage} />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{sugerenciaActual.compatibilidad ?? 0}% afinidad</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>
                {sugerenciaActual.nombre}
                {sugerenciaActual.mostrar_edad === false ? '' : `, ${sugerenciaActual.edad ?? '?'}`}
              </Text>
              <Text style={styles.cardGeneracion}>
                {sugerenciaActual.generacion || 'Generacion'}{sugerenciaActual.distancia !== null ? ` · ${sugerenciaActual.distancia} km` : ''}
              </Text>
              <Text style={styles.cardSigno}>
                Sol {sugerenciaActual.signo_zodiacal || '?'} · Luna {sugerenciaActual.luna || '?'} · Venus {sugerenciaActual.venus || '?'}
              </Text>
              {sugerenciaActual.bio ? <Text style={styles.cardBio}>{sugerenciaActual.bio}</Text> : null}
              {sugerenciaActual.razon_compatibilidad?.map((reason) => (
                <Text key={reason} style={styles.reasonItem}>• {reason}</Text>
              ))}
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionButton, styles.passButton]} onPress={() => handleDecision('dislike')}>
              <Text style={styles.actionLabel}>Nope</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.likeButton]} onPress={() => handleDecision('like')}>
              <Text style={[styles.actionLabel, styles.darkActionLabel]}>Like</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
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
  card: {
    borderRadius: 20,
    backgroundColor: '#11112e',
    borderColor: '#D4AF37',
    borderWidth: 1,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    height: height * 0.62,
    position: 'relative',
  },
  cardImage: { width: '100%', height: '100%', position: 'absolute' },
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
  cardBio: { color: '#fff', fontSize: 14, lineHeight: 20, marginTop: 10 },
  reasonItem: { color: '#f1dfa2', marginTop: 8, fontSize: 13 },
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
});
