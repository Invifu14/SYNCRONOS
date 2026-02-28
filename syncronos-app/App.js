import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, Image, StatusBar } from 'react-native';

export default function App() {
  const [nombre, setNombre] = useState('');
  const [fecha, setFecha] = useState('');
  const [fInicio, setFInicio] = useState('1990-01-01');
  const [fFin, setFFin] = useState('2000-12-31');
  const [resultados, setResultados] = useState([]);
  const [misConexiones, setMisConexiones] = useState([]);

  const MI_IP = '192.168.1.113'; // ⬅️ TU IP AQUÍ

  const registrar = async () => {
    await fetch(`http://${MI_IP}:3000/registrar-cronos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, fecha_nacimiento: fecha }),
    });
    Alert.alert("SYNCRONOS", "Identidad establecida.");
  };

  const buscarRadar = async () => {
    const response = await fetch(`http://${MI_IP}:3000/radar-cronos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha_inicio: fInicio, fecha_fin: fFin }),
    });
    const data = await response.json();
    setResultados(data);
  };

  const conectar = async (destino) => {
    await fetch(`http://${MI_IP}:3000/conectar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mi_nombre: nombre, destino_nombre: destino }),
    });
    Alert.alert("✨ Éxito", "Sincronía grabada.");
    verMisConexiones(); // Actualiza la lista automáticamente
  };

  const verMisConexiones = async () => {
    if(!nombre) return Alert.alert("Ingresa tu nombre arriba");
    const response = await fetch(`http://${MI_IP}:3000/mis-sincronias/${nombre}`);
    const data = await response.json();
    setMisConexiones(data);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ alignItems: 'center', paddingBottom: 50 }}>
      <StatusBar barStyle="light-content" />
      <Text style={styles.logo}>SYNCRONOS</Text>
      
      {/* IDENTIDAD */}
      <View style={styles.card}>
        <TextInput style={styles.input} placeholder="Tu Nombre para Sincronizar" placeholderTextColor="#666" onChangeText={setNombre} />
        <TextInput style={styles.input} placeholder="Tu Nacimiento (AAAA-MM-DD)" placeholderTextColor="#666" onChangeText={setFecha} />
        <TouchableOpacity style={styles.button} onPress={registrar}>
          <Text style={styles.buttonText}>ESTABLECER IDENTIDAD</Text>
        </TouchableOpacity>
      </View>

      {/* RADAR */}
      <View style={[styles.card, { borderColor: '#D4AF37', borderWidth: 1 }]}>
        <Text style={styles.cardTitle}>🛰️ Radar Temporal</Text>
        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <TextInput style={[styles.input, {width: '48%'}]} value={fInicio} onChangeText={setFInicio} />
            <TextInput style={[styles.input, {width: '48%'}]} value={fFin} onChangeText={setFFin} />
        </View>
        <TouchableOpacity style={[styles.button, { backgroundColor: '#D4AF37' }]} onPress={buscarRadar}>
          <Text style={[styles.buttonText, {color: '#050510'}]}>ESCANEAR TIEMPO</Text>
        </TouchableOpacity>
      </View>

      {/* RESULTADOS RADAR */}
      {resultados.map((item) => (
        <View key={item.id} style={styles.resultItem}>
          <Image source={{ uri: item.foto }} style={styles.avatar} />
          <View style={{flex: 1, marginLeft: 15}}>
            <Text style={styles.resultName}>{item.nombre}</Text>
            <Text style={styles.resultInfo}>{item.signo_zodiacal}</Text>
          </View>
          <TouchableOpacity style={styles.syncBtn} onPress={() => conectar(item.nombre)}>
             <Text style={{fontSize: 20}}>✨</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* BÓVEDA DE CONEXIONES */}
      <View style={{width: '100%', marginTop: 30}}>
        <TouchableOpacity style={styles.vaultHeader} onPress={verMisConexiones}>
            <Text style={styles.vaultTitle}>🔒 BÓVEDA DE SINCRONÍAS (Tocar para actualizar)</Text>
        </TouchableOpacity>
        {misConexiones.map((con, index) => (
            <View key={index} style={styles.vaultItem}>
                <Text style={{color: '#fff', fontSize: 16}}>Haz sincronizado con <Text style={{color: '#D4AF37', fontWeight: 'bold'}}>{con.usuario_destino}</Text></Text>
                <Text style={{color: '#444', fontSize: 10}}>{con.fecha_sincronia}</Text>
            </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050510', paddingHorizontal: 15 },
  logo: { fontSize: 38, fontWeight: 'bold', color: '#D4AF37', marginTop: 60, marginBottom: 30, textAlign: 'center' },
  card: { width: '100%', backgroundColor: '#0f0f25', padding: 20, borderRadius: 20, marginBottom: 20 },
  cardTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  input: { backgroundColor: '#050510', color: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#1a1a3a' },
  button: { backgroundColor: '#1a1a3a', padding: 18, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  resultItem: { width: '100%', backgroundColor: '#11112e', padding: 15, borderRadius: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  resultName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  resultInfo: { color: '#D4AF37', fontSize: 13 },
  syncBtn: { backgroundColor: '#1a1a3a', width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#D4AF37' },
  vaultHeader: { backgroundColor: '#1a1a3a', padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#444' },
  vaultTitle: { color: '#888', fontSize: 12, textAlign: 'center', fontWeight: 'bold' },
  vaultItem: { backgroundColor: '#0f0f25', padding: 15, borderRadius: 10, marginBottom: 5, borderLeftWidth: 3, borderLeftColor: '#D4AF37' }
});