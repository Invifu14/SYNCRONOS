import React, { useCallback, useContext, useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppContext } from '../context/AppContext';

export default function ChatScreen({ route }) {
  const { otherUserId, nombre } = route.params;
  const { user, baseUrl } = useContext(AppContext);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');

  const loadMessages = useCallback(async () => {
    if (!user?.id || !otherUserId) return;
    try {
      const response = await fetch(`${baseUrl}/matches/${user.id}/messages/${otherUserId}`);
      if (!response.ok) return;
      const data = await response.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error cargando mensajes', error);
    }
  }, [baseUrl, otherUserId, user?.id]);

  useEffect(() => {
    loadMessages();
    const timer = setInterval(loadMessages, 5000);
    return () => clearInterval(timer);
  }, [loadMessages]);

  const sendMessage = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    try {
      const response = await fetch(`${baseUrl}/matches/${user.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destino_id: otherUserId, contenido: trimmed }),
      });
      if (!response.ok) return;
      setDraft('');
      loadMessages();
    } catch (error) {
      console.error('Error enviando mensaje', error);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.header}>Chat con {nombre}</Text>
      <FlatList
        data={messages}
        keyExtractor={(item) => `${item.id}`}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const mine = item.emisor_id === user.id;
          return (
            <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              <Text style={[styles.messageText, mine && styles.mineText]}>{item.contenido}</Text>
              <Text style={[styles.metaText, mine && styles.mineText]}>{item.created_at}</Text>
            </View>
          );
        }}
      />
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="Escribe un mensaje"
          placeholderTextColor="#666"
          value={draft}
          onChangeText={setDraft}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendText}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050510' },
  header: { color: '#D4AF37', fontSize: 18, fontWeight: '700', textAlign: 'center', padding: 16 },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  mine: { alignSelf: 'flex-end', backgroundColor: '#D4AF37' },
  theirs: { alignSelf: 'flex-start', backgroundColor: '#151536', borderWidth: 1, borderColor: '#27274a' },
  messageText: { color: '#fff', fontSize: 15, lineHeight: 20 },
  mineText: { color: '#050510' },
  metaText: { color: '#c6c6d5', fontSize: 11, marginTop: 6 },
  composer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1a1a3a',
    backgroundColor: '#0f0f25',
  },
  input: {
    flex: 1,
    backgroundColor: '#050510',
    borderWidth: 1,
    borderColor: '#1a1a3a',
    borderRadius: 14,
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sendButton: {
    backgroundColor: '#D4AF37',
    borderRadius: 14,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  sendText: { color: '#050510', fontWeight: '800' },
});
