import React, { useCallback, useContext, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AppContext } from '../context/AppContext';

export default function VaultScreen() {
    const [misConexiones, setMisConexiones] = useState([]);
    const { user, MI_IP } = useContext(AppContext);

    const verMisConexiones = useCallback(async () => {
        if (!user?.nombre) {
            setMisConexiones([]);
            return;
        }

        try {
            const baseUrl = MI_IP === 'localhost' ? 'http://localhost:3000' : `http://${MI_IP}:3000`;
            const response = await fetch(`${baseUrl}/mis-sincronias/${user.nombre}`);
            const data = await response.json();
            setMisConexiones(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Error al obtener matches', e);
            setMisConexiones([]);
        }
    }, [MI_IP, user?.nombre]);

    useFocusEffect(
        useCallback(() => {
            verMisConexiones();
        }, [verMisConexiones])
    );

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Tus matches y likes</Text>
                <Text style={styles.headerSubtitle}>Aqui se guardan las conexiones que ya hiciste en Radar y Afinidad.</Text>
            </View>

            {misConexiones.length === 0 ? (
                <Text style={styles.emptyText}>Todavia no tienes conexiones guardadas.</Text>
            ) : (
                misConexiones.map((conexion, index) => {
                    const isMatch = conexion.tipo === 'match';
                    return (
                        <View key={`${conexion.usuario_destino}-${index}`} style={[styles.item, isMatch && styles.matchItem]}>
                            {isMatch ? (
                                <Text style={styles.itemText}>
                                    Tu y <Text style={styles.matchName}>{conexion.usuario_destino}</Text> se gustaron mutuamente.
                                </Text>
                            ) : (
                                <Text style={styles.itemText}>
                                    Le diste Like a <Text style={styles.likeName}>{conexion.usuario_destino}</Text>
                                </Text>
                            )}
                            <Text style={styles.itemDate}>{conexion.fecha_sincronia}</Text>
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
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#1a1a3a',
    },
    headerTitle: { color: '#D4AF37', fontSize: 22, fontWeight: '700', textAlign: 'center' },
    headerSubtitle: { color: '#aaa', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
    emptyText: { color: '#ccc', textAlign: 'center', marginTop: 30, fontSize: 16 },
    item: {
        backgroundColor: '#0f0f25',
        padding: 16,
        borderRadius: 14,
        marginBottom: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#D4AF37',
    },
    matchItem: { borderLeftColor: '#34C759', backgroundColor: '#13251b' },
    itemText: { color: '#fff', fontSize: 16, lineHeight: 22 },
    matchName: { color: '#34C759', fontWeight: '700' },
    likeName: { color: '#D4AF37', fontWeight: '700' },
    itemDate: { color: '#888', fontSize: 12, marginTop: 8 },
});
