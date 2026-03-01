import React, { useEffect, useState, useContext, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AppContext } from '../App';

export default function VaultScreen() {
    const [misConexiones, setMisConexiones] = useState([]);
    const { user, MI_IP } = useContext(AppContext);

    const verMisConexiones = async () => {
        try {
            const response = await fetch(`http://${MI_IP}:3000/mis-sincronias/${user.nombre}`);
            const data = await response.json();
            setMisConexiones(data);
        } catch(e) {
            console.error("Error al obtener bóveda", e);
        }
    };

    useFocusEffect(
        useCallback(() => {
            verMisConexiones();
        }, [])
    );

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
            <View style={styles.vaultHeader}>
                <Text style={styles.vaultTitle}>🔒 TUS SINCRONÍAS GUARDADAS</Text>
            </View>
            
            {misConexiones.length === 0 ? (
                <Text style={styles.emptyText}>Tu bóveda está vacía.</Text>
            ) : (
                misConexiones.map((con, index) => (
                    <View key={index} style={styles.vaultItem}>
                        <Text style={{color: '#fff', fontSize: 16}}>
                            Has sincronizado con <Text style={{color: '#D4AF37', fontWeight: 'bold'}}>{con.usuario_destino}</Text>
                        </Text>
                        <Text style={{color: '#888', fontSize: 12, marginTop: 5}}>{con.fecha_sincronia}</Text>
                    </View>
                ))
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050510', paddingHorizontal: 15, paddingTop: 20 },
    vaultHeader: { backgroundColor: '#1a1a3a', padding: 15, borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: '#444' },
    vaultTitle: { color: '#D4AF37', fontSize: 14, textAlign: 'center', fontWeight: 'bold' },
    emptyText: { color: '#666', textAlign: 'center', marginTop: 30, fontSize: 16 },
    vaultItem: { backgroundColor: '#0f0f25', padding: 15, borderRadius: 10, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#D4AF37' }
});