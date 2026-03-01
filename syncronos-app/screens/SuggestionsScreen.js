import React, { useEffect, useState, useContext } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { AppContext } from '../App';

export default function SuggestionsScreen() {
    const [sugerencias, setSugerencias] = useState([]);
    const { user, MI_IP } = useContext(AppContext);

    useEffect(() => {
        const fetchSugerencias = async () => {
            try {
                const response = await fetch(`http://${MI_IP}:3000/sugerencias/${user.nombre}`);
                const data = await response.json();
                setSugerencias(data);
            } catch (e) {
                console.error("Error al obtener sugerencias", e);
            }
        };
        fetchSugerencias();
    }, []);

    const conectar = async (destino) => {
        try {
            await fetch(`http://${MI_IP}:3000/conectar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mi_nombre: user.nombre, destino_nombre: destino }),
            });
            Alert.alert("✨ Éxito", "Sincronía grabada en la bóveda.");
        } catch(e) {
            Alert.alert("Error", "No se pudo sincronizar.");
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
            <Text style={styles.title}>Almas de tu misma Generación</Text>
            {sugerencias.length === 0 ? (
                <Text style={styles.emptyText}>No hay sugerencias en este momento.</Text>
            ) : (
                sugerencias.map((item) => (
                    <View key={item.id} style={styles.resultItem}>
                        <Image source={{ uri: item.foto }} style={styles.avatar} />
                        <View style={{flex: 1, marginLeft: 15}}>
                            <Text style={styles.resultName}>{item.nombre}</Text>
                            <Text style={styles.resultInfo}>{item.generacion}</Text>
                        </View>
                        <TouchableOpacity style={styles.syncBtn} onPress={() => conectar(item.nombre)}>
                            <Text style={{fontSize: 20}}>✨</Text>
                        </TouchableOpacity>
                    </View>
                ))
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050510', paddingHorizontal: 15, paddingTop: 20 },
    title: { color: '#D4AF37', fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    emptyText: { color: '#666', textAlign: 'center', marginTop: 30, fontSize: 16 },
    resultItem: { width: '100%', backgroundColor: '#11112e', padding: 15, borderRadius: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderColor: '#D4AF37', borderWidth: 1 },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#0f0f25' },
    resultName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    resultInfo: { color: '#888', fontSize: 13 },
    syncBtn: { backgroundColor: '#1a1a3a', width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#D4AF37' },
});