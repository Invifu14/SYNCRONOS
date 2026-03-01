import React, { useState, useContext } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { AppContext } from '../App';

export default function AuthScreen() {
  const [nombre, setNombre] = useState('');
  const [fecha, setFecha] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [gustos, setGustos] = useState('');

  const { setUser, MI_IP } = useContext(AppContext);

  const registrar = async () => {
    if (!nombre || !fecha) {
        Alert.alert("Error", "Nombre y fecha son obligatorios");
        return;
    }
    try {
        const response = await fetch(`http://${MI_IP}:3000/registrar-cronos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, fecha_nacimiento: fecha, ubicacion, gustos }),
        });
        const data = await response.json();
        if (data.mensaje === "OK" || data.mensaje === "Login OK") {
            setUser(data.usuario);
        } else {
            Alert.alert("Error", "No se pudo establecer identidad");
        }
    } catch(e) {
        console.error(e);
        Alert.alert("Error", "No se pudo conectar al servidor.");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ alignItems: 'center', paddingBottom: 50 }}>
      <Text style={styles.logo}>SYNCRONOS</Text>
      <View style={styles.card}>
        <TextInput style={styles.input} placeholder="Tu Nombre para Sincronizar" placeholderTextColor="#666" onChangeText={setNombre} />
        <TextInput style={styles.input} placeholder="Tu Nacimiento (AAAA-MM-DD)" placeholderTextColor="#666" onChangeText={setFecha} />
        <TextInput style={styles.input} placeholder="Ubicación (Ciudad, País)" placeholderTextColor="#666" onChangeText={setUbicacion} />
        <TextInput style={styles.input} placeholder="Tus gustos separados por comas" placeholderTextColor="#666" onChangeText={setGustos} />
        <TouchableOpacity style={styles.button} onPress={registrar}>
          <Text style={styles.buttonText}>ESTABLECER IDENTIDAD</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050510', paddingHorizontal: 15 },
  logo: { fontSize: 38, fontWeight: 'bold', color: '#D4AF37', marginTop: 100, marginBottom: 30, textAlign: 'center' },
  card: { width: '100%', backgroundColor: '#0f0f25', padding: 20, borderRadius: 20, marginBottom: 20 },
  input: { backgroundColor: '#050510', color: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#1a1a3a' },
  button: { backgroundColor: '#1a1a3a', padding: 18, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});