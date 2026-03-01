import React, { useEffect, useState, useContext } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { AppContext } from '../App';

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
    const { user, MI_IP } = useContext(AppContext);

    useEffect(() => {
        const fetchUsuarios = async () => {
            try {
                const response = await fetch(`http://${MI_IP}:3000/usuarios/${user.nombre}`);
                const data = await response.json();
                setUsuarios(data);
            } catch (e) {
                console.error("Error al obtener usuarios", e);
            }
        };
        fetchUsuarios();
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
            {usuarios.length === 0 ? (
                <Text style={styles.emptyText}>No hay usuarios sincronizados cerca.</Text>
            ) : (
                usuarios.map((item) => (
                    <View key={item.id} style={styles.resultItem}>
                        <Image source={{ uri: item.foto }} style={styles.avatar} />
                        <View style={{flex: 1, marginLeft: 15}}>
                            <Text style={styles.resultName}>{item.nombre}, {calcularEdad(item.fecha_nacimiento)}</Text>
                            <Text style={styles.resultInfo}>{item.ubicacion || 'Ubicación desconocida'}</Text>
                            {item.gustos ? <Text style={styles.gustosText}>🎭 {item.gustos}</Text> : null}
                            <Text style={styles.signoText}>{item.signo_zodiacal}</Text>
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
    emptyText: { color: '#666', textAlign: 'center', marginTop: 50, fontSize: 16 },
    resultItem: { width: '100%', backgroundColor: '#11112e', padding: 15, borderRadius: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#0f0f25' },
    resultName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    resultInfo: { color: '#888', fontSize: 13, marginBottom: 2 },
    gustosText: { color: '#bbb', fontSize: 12, fontStyle: 'italic', marginBottom: 2 },
    signoText: { color: '#D4AF37', fontSize: 12 },
    syncBtn: { backgroundColor: '#1a1a3a', width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#D4AF37' },
});