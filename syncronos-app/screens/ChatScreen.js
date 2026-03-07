import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { GiftedChat, Bubble, Send } from 'react-native-gifted-chat';
import io from 'socket.io-client';
import { AppContext } from '../context/AppContext';

export default function ChatScreen({ route, navigation }) {
    const { otroUsuario } = route.params;
    const { user, MI_IP } = useContext(AppContext);

    const [messages, setMessages] = useState([]);
    const [socket, setSocket] = useState(null);
    const [loading, setLoading] = useState(true);

    const baseUrl = MI_IP === 'localhost' ? 'http://localhost:3000' : `http://${MI_IP}:3000`;

    useEffect(() => {
        // Establecer el título de la pantalla
        navigation.setOptions({ title: `Chat con ${otroUsuario}` });

        // Cargar el historial desde el backend
        const fetchHistorial = async () => {
            try {
                const response = await fetch(`${baseUrl}/mensajes/${user.nombre}/${otroUsuario}`);
                const data = await response.json();

                // Mapear al formato de GiftedChat
                const historyFormatted = data.map(msg => ({
                    _id: msg.id,
                    text: msg.texto,
                    createdAt: new Date(msg.fecha),
                    user: {
                        _id: msg.de === user.nombre ? 1 : 2,
                        name: msg.de,
                    },
                }));

                setMessages(historyFormatted);
            } catch (error) {
                console.error("Error al obtener historial de chat:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistorial();

        // Conectar Socket.io
        const newSocket = io(baseUrl);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            newSocket.emit('join', user.nombre);
        });

        newSocket.on('nuevoMensaje', (msg) => {
            // Solo procesar si el mensaje es del usuario con el que estamos chateando
            if (msg.de === otroUsuario) {
                const incomingMsg = {
                    _id: msg.id,
                    text: msg.texto,
                    createdAt: new Date(msg.fecha),
                    user: {
                        _id: 2,
                        name: msg.de,
                    },
                };
                setMessages(previousMessages => GiftedChat.append(previousMessages, incomingMsg));
            }
        });

        return () => {
            newSocket.disconnect();
        };
    }, []);

    const onSend = useCallback((newMessages = []) => {
        setMessages(previousMessages => GiftedChat.append(previousMessages, newMessages));

        const text = newMessages[0].text;

        if (socket) {
            socket.emit('enviarMensaje', {
                de: user.nombre,
                para: otroUsuario,
                texto: text
            });
        }
    }, [socket]);

    const renderBubble = (props) => {
        return (
            <Bubble
                {...props}
                wrapperStyle={{
                    right: { backgroundColor: '#D4AF37' },
                    left: { backgroundColor: '#1a1a3a' }
                }}
                textStyle={{
                    right: { color: '#050510' },
                    left: { color: '#fff' }
                }}
            />
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#D4AF37" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <GiftedChat
                messages={messages}
                onSend={messages => onSend(messages)}
                user={{ _id: 1, name: user.nombre }}
                renderBubble={renderBubble}
                placeholder="Escribe un mensaje astrológico..."
                alwaysShowSend
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050510' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050510' }
});