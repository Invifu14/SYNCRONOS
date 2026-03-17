import React, { useCallback, useContext, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AppContext } from '../context/AppContext';

const { height } = Dimensions.get('window');

const calcularEdad = (fecha) => {
    const hoy = new Date();
    const nacimiento = new Date(fecha);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
    }
    return edad;
};

export default function MainScreen() {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(false);
    const { user, MI_IP } = useContext(AppContext);

    const baseUrl = MI_IP === 'localhost' ? 'http://localhost:3000' : `http://${MI_IP}:3000`;

    const fetchUsuarios = useCallback(async () => {
        if (!user?.nombre) {
            setUsuarios([]);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${baseUrl}/usuarios/${user.nombre}`);
            const data = await response.json();
            setUsuarios(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Error al obtener usuarios', e);
            setUsuarios([]);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, user?.nombre]);

    useFocusEffect(
        useCallback(() => {
            fetchUsuarios();
        }, [fetchUsuarios])
    );

    const usuarioActual = usuarios[0];

    const handleDecision = async (tipo) => {
        if (!usuarioActual) return;

        try {
            const response = await fetch(`${baseUrl}/swipe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mi_nombre: user.nombre,
                    destino_nombre: usuarioActual.nombre,
                    tipo,
                }),
            });
            const data = await response.json();

            setUsuarios((prevUsuarios) => prevUsuarios.slice(1));

            if (data.match) {
                Alert.alert("IT'S A MATCH!", `Tu y ${usuarioActual.nombre} se han gustado mutuamente. Revisa la pestana Matches.`);
            }
        } catch (e) {
            console.error('Error al registrar la decision:', e);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.screenTitle}>Radar</Text>
            <Text style={styles.screenSubtitle}>
                Explora perfiles con botones directos para evitar conflictos de gestos y dejar espacio a futuras cards con mas contenido.
            </Text>

            {loading ? (
                <View style={styles.feedbackBox}>
                    <ActivityIndicator color="#D4AF37" size="large" />
                    <Text style={styles.feedbackText}>Cargando perfiles cercanos...</Text>
                </View>
            ) : !usuarioActual ? (
                <View style={styles.feedbackBox}>
                    <Text style={styles.emptyText}>No hay usuarios cerca por ahora.</Text>
                    <TouchableOpacity style={styles.refreshButton} onPress={fetchUsuarios}>
                        <Text style={styles.refreshText}>Recargar radar</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    <View style={styles.card}>
                        <Image source={{ uri: usuarioActual.foto }} style={styles.cardImage} />
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{usuarios.length} perfiles</Text>
                        </View>
                        <View style={styles.cardInfo}>
                            <Text style={styles.cardTitle}>{usuarioActual.nombre}, {calcularEdad(usuarioActual.fecha_nacimiento)}</Text>
                            <Text style={styles.cardSubtitle}>
                                {usuarioActual.ubicacion || 'Ubicacion desconocida'} - A {usuarioActual.distancia || '?'} km
                            </Text>
                            <Text style={styles.cardSigno}>
                                {usuarioActual.signo_zodiacal} - Luna {usuarioActual.luna || '?'}
                            </Text>
                            <Text style={styles.cardText}>
                                Asc {usuarioActual.ascendente || '?'} - Venus {usuarioActual.venus || '?'} - Marte {usuarioActual.marte || '?'}
                            </Text>
                            {usuarioActual.intencion ? <Text style={styles.cardIntent}>{usuarioActual.intencion}</Text> : null}
                            {usuarioActual.gustos ? <Text style={styles.cardGustos}>{usuarioActual.gustos}</Text> : null}
                        </View>
                    </View>

                    <View style={styles.actionsRow}>
                        <TouchableOpacity style={[styles.actionButton, styles.passButton]} onPress={() => handleDecision('dislike')}>
                            <Text style={styles.actionLabel}>Nope</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionButton, styles.reloadButton]} onPress={fetchUsuarios}>
                            <Text style={styles.actionLabel}>Recargar</Text>
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
    cardImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    badge: {
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: 'rgba(5, 5, 16, 0.75)',
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#D4AF37',
    },
    badgeText: { color: '#D4AF37', fontSize: 12, fontWeight: '700' },
    cardInfo: {
        padding: 20,
        backgroundColor: 'rgba(5, 5, 16, 0.8)',
    },
    cardTitle: { color: '#fff', fontSize: 26, fontWeight: '700' },
    cardSubtitle: { color: '#ccc', fontSize: 16, marginTop: 4 },
    cardSigno: { color: '#D4AF37', fontSize: 16, fontWeight: '700', marginTop: 4 },
    cardText: { color: '#ccc', fontSize: 14, marginTop: 4 },
    cardIntent: { color: '#fff', fontSize: 14, marginTop: 10, fontWeight: '600' },
    cardGustos: { color: '#bbb', fontSize: 14, fontStyle: 'italic', marginTop: 8 },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginTop: 20,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
    },
    passButton: { backgroundColor: '#2a1016', borderColor: '#ff6b6b' },
    reloadButton: { backgroundColor: '#11112e', borderColor: '#444466' },
    likeButton: { backgroundColor: '#D4AF37', borderColor: '#D4AF37' },
    actionLabel: { color: '#fff', fontSize: 15, fontWeight: '700' },
    darkActionLabel: { color: '#050510' },
});
