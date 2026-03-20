import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppContext } from '../context/AppContext';

const sortMessages = (items) => [...items].sort((left, right) => {
  if (left.created_at === right.created_at) {
    return left.id - right.id;
  }
  return `${left.created_at}`.localeCompare(`${right.created_at}`);
});

const upsertMessage = (items, nextMessage) => {
  const existing = items.find((item) => item.id === nextMessage.id);
  if (existing) {
    return sortMessages(items.map((item) => (item.id === nextMessage.id ? { ...item, ...nextMessage } : item)));
  }
  return sortMessages([...items, nextMessage]);
};

export default function ChatScreen({ route }) {
  const { otherUserId, nombre } = route.params;
  const { user, apiFetch, socket } = useContext(AppContext);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');

  const chatKey = useMemo(() => [user?.id, otherUserId].filter(Boolean).sort((a, b) => a - b).join(':'), [otherUserId, user?.id]);

  const loadMessages = useCallback(async () => {
    if (!user?.id || !otherUserId) return;
    try {
      const response = await apiFetch(`/matches/${user.id}/messages/${otherUserId}`);
      if (!response.ok) return;
      const data = await response.json();
      setMessages(Array.isArray(data) ? sortMessages(data) : []);
    } catch (error) {
      console.error('Error cargando mensajes', error);
    }
  }, [apiFetch, otherUserId, user?.id]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!socket || !user?.id || !otherUserId) return undefined;

    socket.emit('chat:join', { otherUserId });

    const handleIncomingMessage = (message) => {
      if (message.chat_key !== chatKey) return;
      setMessages((current) => upsertMessage(current, message));
      if (message.emisor_id === otherUserId) {
        socket.emit('chat:read', { otherUserId });
      }
    };

    const handleRead = ({ chatKey: incomingChatKey, readerId }) => {
      if (incomingChatKey !== chatKey || readerId !== otherUserId) return;
      setMessages((current) => current.map((item) => (
        item.receptor_id === otherUserId ? { ...item, leido: 1 } : item
      )));
    };

    socket.on('chat:message', handleIncomingMessage);
    socket.on('chat:read', handleRead);

    return () => {
      socket.emit('chat:leave', { otherUserId });
      socket.off('chat:message', handleIncomingMessage);
      socket.off('chat:read', handleRead);
    };
  }, [chatKey, otherUserId, socket, user?.id]);

  const sendMessage = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    try {
      const response = await apiFetch(`/matches/${user.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ destino_id: otherUserId, contenido: trimmed }),
      });
      if (!response.ok) return;

      const data = await response.json();
      if (data.item) {
        setMessages((current) => upsertMessage(current, data.item));
      }
      setDraft('');
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
