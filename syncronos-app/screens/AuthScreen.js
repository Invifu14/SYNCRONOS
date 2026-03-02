import React, { useState, useContext } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { AppContext } from '../App';

export default function AuthScreen() {
  // Posibles estados del flujo
  const [step, setStep] = useState('method_selection'); 
  const [metodoRegistro, setMetodoRegistro] = useState('');

  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [intencion, setIntencion] = useState('');
  const [genero, setGenero] = useState('');
  const [generoInteres, setGeneroInteres] = useState('');
  const [fecha, setFecha] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [gustos, setGustos] = useState('');

  const { setUser, MI_IP } = useContext(AppContext);

  const registrar = async () => {
    if (!nombre || !fecha || !intencion || !genero || !generoInteres) {
        Alert.alert("Error", "Faltan datos obligatorios");
        return;
    }
    
    try {
        const response = await fetch(`http://${MI_IP}:3000/registrar-cronos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            nombre, 
            fecha_nacimiento: fecha, 
            ubicacion, 
            gustos,
            metodo_registro: metodoRegistro,
            correo: correo,
            telefono: telefono,
            intencion: intencion,
            genero: genero,
            genero_interes: generoInteres
        }),
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

  const seleccionarMetodo = (metodo) => {
    setMetodoRegistro(metodo);
    setStep('enter_contact');
  };

  const enviarCodigo = () => {
    if (metodoRegistro === 'correo' && !correo) {
      Alert.alert("Error", "El correo es obligatorio");
      return;
    }
    if (metodoRegistro === 'telefono' && !telefono) {
      Alert.alert("Error", "El número de teléfono es obligatorio");
      return;
    }
    // Simular el envío del código
    Alert.alert("Código Enviado", "Se ha enviado un código de verificación (usa 1234 para probar).");
    setStep('verify_code');
  };

  const verificarCodigo = () => {
    if (codigo === '1234') {
      setStep('enter_name');
    } else {
      Alert.alert("Error", "Código incorrecto. Intenta con 1234.");
    }
  };

  const irAPasoIntencion = () => {
    if (!nombre) {
      Alert.alert("Error", "El nombre es obligatorio");
      return;
    }
    setStep('select_intent');
  };

  const seleccionarIntencion = (intencionSeleccionada) => {
    setIntencion(intencionSeleccionada);
    setStep('select_gender');
  };

  const seleccionarGenero = (generoSeleccionado) => {
    setGenero(generoSeleccionado);
    setStep('select_interest');
  };

  const seleccionarInteres = (interesSeleccionado) => {
    setGeneroInteres(interesSeleccionado);
    setStep('details');
  };

  const renderStep = () => {
    switch (step) {
      case 'method_selection':
        return (
          <View style={styles.card}>
            <Text style={styles.title}>Elige tu método de registro</Text>
            <TouchableOpacity style={[styles.button, styles.methodButton]} onPress={() => seleccionarMetodo('correo')}>
              <Text style={styles.buttonText}>📧  Registrarse con Correo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.methodButton]} onPress={() => seleccionarMetodo('telefono')}>
              <Text style={styles.buttonText}>📱  Registrarse con Teléfono</Text>
            </TouchableOpacity>
          </View>
        );
      
      case 'enter_contact':
        return (
          <View style={styles.card}>
            <TouchableOpacity onPress={() => setStep('method_selection')} style={styles.backButton}>
              <Text style={styles.backText}>⬅ Volver</Text>
            </TouchableOpacity>
            <Text style={styles.title}>
              {metodoRegistro === 'correo' ? 'Ingresa tu Correo' : 'Ingresa tu Teléfono'}
            </Text>
            {metodoRegistro === 'correo' ? (
              <TextInput style={styles.input} placeholder="Correo Electrónico" placeholderTextColor="#666" onChangeText={setCorreo} keyboardType="email-address" autoCapitalize="none" />
            ) : (
              <TextInput style={styles.input} placeholder="Número de Teléfono" placeholderTextColor="#666" onChangeText={setTelefono} keyboardType="phone-pad" />
            )}
            <TouchableOpacity style={styles.button} onPress={enviarCodigo}>
              <Text style={styles.buttonText}>ENVIAR CÓDIGO</Text>
            </TouchableOpacity>
          </View>
        );

      case 'verify_code':
        return (
          <View style={styles.card}>
            <TouchableOpacity onPress={() => setStep('enter_contact')} style={styles.backButton}>
              <Text style={styles.backText}>⬅ Volver</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Ingresa el código de verificación</Text>
            <TextInput style={styles.input} placeholder="Código (ej. 1234)" placeholderTextColor="#666" onChangeText={setCodigo} keyboardType="numeric" />
            <TouchableOpacity style={styles.button} onPress={verificarCodigo}>
              <Text style={styles.buttonText}>VERIFICAR</Text>
            </TouchableOpacity>
          </View>
        );

      case 'enter_name':
        return (
          <View style={styles.card}>
            <Text style={styles.title}>¿Cómo te llamas?</Text>
            <TextInput style={styles.input} placeholder="Tu Nombre para Sincronizar" placeholderTextColor="#666" onChangeText={setNombre} value={nombre} />
            <TouchableOpacity style={styles.button} onPress={irAPasoIntencion}>
              <Text style={styles.buttonText}>CONTINUAR</Text>
            </TouchableOpacity>
          </View>
        );

      case 'select_intent':
        return (
          <View style={styles.card}>
            <TouchableOpacity onPress={() => setStep('enter_name')} style={styles.backButton}>
              <Text style={styles.backText}>⬅ Volver</Text>
            </TouchableOpacity>
            <Text style={styles.title}>¿Qué quieres hacer en la app?</Text>
            <TouchableOpacity style={[styles.button, styles.methodButton]} onPress={() => seleccionarIntencion('Para tener citas')}>
              <Text style={styles.buttonText}>💘  Para tener citas</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.methodButton]} onPress={() => seleccionarIntencion('Para chatear')}>
              <Text style={styles.buttonText}>💬  Para chatear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.methodButton]} onPress={() => seleccionarIntencion('Para buscar relación')}>
              <Text style={styles.buttonText}>💍  Para buscar relación</Text>
            </TouchableOpacity>
          </View>
        );

      case 'select_gender':
        return (
          <View style={styles.card}>
            <TouchableOpacity onPress={() => setStep('select_intent')} style={styles.backButton}>
              <Text style={styles.backText}>⬅ Volver</Text>
            </TouchableOpacity>
            <Text style={styles.title}>¿Con qué género te identificas?</Text>
            <TouchableOpacity style={[styles.button, styles.methodButton]} onPress={() => seleccionarGenero('Hombre')}>
              <Text style={styles.buttonText}>♂️  Hombre</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.methodButton]} onPress={() => seleccionarGenero('Mujer')}>
              <Text style={styles.buttonText}>♀️  Mujer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.methodButton]} onPress={() => seleccionarGenero('Otro')}>
              <Text style={styles.buttonText}>⚧️  Otro</Text>
            </TouchableOpacity>
          </View>
        );

      case 'select_interest':
        return (
          <View style={styles.card}>
            <TouchableOpacity onPress={() => setStep('select_gender')} style={styles.backButton}>
              <Text style={styles.backText}>⬅ Volver</Text>
            </TouchableOpacity>
            <Text style={styles.title}>¿Qué te interesa conocer?</Text>
            <TouchableOpacity style={[styles.button, styles.methodButton]} onPress={() => seleccionarInteres('Hombres')}>
              <Text style={styles.buttonText}>Hombres</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.methodButton]} onPress={() => seleccionarInteres('Mujeres')}>
              <Text style={styles.buttonText}>Mujeres</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.methodButton]} onPress={() => seleccionarInteres('Todos')}>
              <Text style={styles.buttonText}>Todos</Text>
            </TouchableOpacity>
          </View>
        );

      case 'details':
        return (
          <View style={styles.card}>
            <TouchableOpacity onPress={() => setStep('select_interest')} style={styles.backButton}>
              <Text style={styles.backText}>⬅ Volver</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Completar Identidad</Text>
            <TextInput style={styles.input} placeholder="Tu Nacimiento (AAAA-MM-DD)" placeholderTextColor="#666" onChangeText={setFecha} />
            <TextInput style={styles.input} placeholder="Ubicación (Ciudad, País)" placeholderTextColor="#666" onChangeText={setUbicacion} />
            <TextInput style={styles.input} placeholder="Tus gustos separados por comas" placeholderTextColor="#666" onChangeText={setGustos} />
            <TouchableOpacity style={styles.button} onPress={registrar}>
              <Text style={styles.buttonText}>FINALIZAR REGISTRO</Text>
            </TouchableOpacity>
          </View>
        );
        
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ alignItems: 'center', paddingBottom: 50 }}>
      <Text style={styles.logo}>SYNCRONOS</Text>
      {renderStep()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050510', paddingHorizontal: 15 },
  logo: { fontSize: 38, fontWeight: 'bold', color: '#D4AF37', marginTop: 100, marginBottom: 30, textAlign: 'center' },
  title: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 20, textAlign: 'center' },
  card: { width: '100%', backgroundColor: '#0f0f25', padding: 20, borderRadius: 20, marginBottom: 20 },
  input: { backgroundColor: '#050510', color: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#1a1a3a' },
  button: { backgroundColor: '#D4AF37', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#050510', fontWeight: 'bold', fontSize: 16 },
  methodButton: { backgroundColor: '#1a1a3a', marginBottom: 15 },
  facebookButton: { backgroundColor: '#1877F2', marginBottom: 15 },
  backButton: { marginBottom: 15 },
  backText: { color: '#D4AF37', fontWeight: 'bold' },
  infoText: { color: '#1877F2', marginBottom: 15, textAlign: 'center', fontWeight: 'bold' }
});