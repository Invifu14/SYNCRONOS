import React, { useContext, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { AppContext } from '../context/AppContext';

function OptionButton({ active, label, onPress }) {
  return (
    <TouchableOpacity style={[styles.optionButton, active && styles.optionButtonActive]} onPress={onPress}>
      <Text style={[styles.optionText, active && styles.optionTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function AuthScreen() {
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
  const [horaNacimiento, setHoraNacimiento] = useState('');
  const [lugarNacimiento, setLugarNacimiento] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [gustos, setGustos] = useState('');
  const [bio, setBio] = useState('');
  const [ocupacion, setOcupacion] = useState('');
  const [educacion, setEducacion] = useState('');
  const [fotos, setFotos] = useState(['', '', '']);
  const [edadMinPref, setEdadMinPref] = useState('18');
  const [edadMaxPref, setEdadMaxPref] = useState('35');
  const [distanciaMaxKm, setDistanciaMaxKm] = useState('50');
  const [mostrarEdad, setMostrarEdad] = useState(true);
  const [mostrarDistancia, setMostrarDistancia] = useState(true);
  const [consentimientoUbicacion, setConsentimientoUbicacion] = useState(true);
  const [perfilActivo, setPerfilActivo] = useState(true);
  const [latitud, setLatitud] = useState(null);
  const [longitud, setLongitud] = useState(null);
  const [locationMessage, setLocationMessage] = useState('');
  const { baseUrl, completeLogin } = useContext(AppContext);

  const obtenerUbicacionGPS = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationMessage('Permiso de ubicacion denegado. Puedes seguir con ciudad manual.');
      return;
    }
    try {
      const location = await Location.getCurrentPositionAsync({});
      setLatitud(location.coords.latitude);
      setLongitud(location.coords.longitude);
      setLocationMessage('Ubicacion GPS lista para filtrar por distancia.');
    } catch (error) {
      setLocationMessage('No se pudo obtener la ubicacion GPS.');
    }
  };

  const enviarCodigo = () => {
    if (metodoRegistro === 'correo' && !correo.trim()) {
      Alert.alert('Error', 'El correo es obligatorio.');
      return;
    }
    if (metodoRegistro === 'telefono' && !telefono.trim()) {
      Alert.alert('Error', 'El telefono es obligatorio.');
      return;
    }
    Alert.alert('Codigo enviado', 'Se ha enviado un codigo de prueba. Usa 1234 para continuar.');
    setStep('verify_code');
  };

  const verificarCodigo = () => {
    if (codigo === '1234') {
      setStep('profile_basics');
      return;
    }
    Alert.alert('Error', 'Codigo incorrecto. Usa 1234.');
  };

  const registrar = async () => {
    if (!nombre || !fecha || !intencion || !genero || !generoInteres) {
      Alert.alert('Error', 'Completa los campos obligatorios.');
      return;
    }

    if (Number(edadMinPref) > Number(edadMaxPref)) {
      Alert.alert('Error', 'El rango de edad no es valido.');
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/registrar-cronos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          fecha_nacimiento: fecha,
          hora_nacimiento: horaNacimiento,
          lugar_nacimiento: lugarNacimiento,
          ubicacion,
          gustos,
          bio,
          ocupacion,
          educacion,
          fotos,
          metodo_registro: metodoRegistro,
          correo,
          telefono,
          intencion,
          genero,
          genero_interes: generoInteres,
          latitud,
          longitud,
          edad_min_pref: edadMinPref,
          edad_max_pref: edadMaxPref,
          distancia_max_km: distanciaMaxKm,
          mostrar_edad: mostrarEdad,
          mostrar_distancia: mostrarDistancia,
          consentimiento_ubicacion: consentimientoUbicacion,
          perfil_activo: perfilActivo,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        Alert.alert('Error', data.mensaje || 'No se pudo crear tu perfil.');
        return;
      }

      await completeLogin(data.usuario, data.token);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo conectar con el servidor.');
    }
  };

  const updatePhoto = (index, value) => {
    setFotos((current) => current.map((item, position) => (position === index ? value : item)));
  };

  const renderContactStep = () => (
    <View style={styles.card}>
      <Text style={styles.title}>Elige tu metodo de registro</Text>
      <TouchableOpacity style={styles.primaryButton} onPress={() => { setMetodoRegistro('correo'); setStep('enter_contact'); }}>
        <Text style={styles.primaryButtonText}>Registrarse con correo</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.primaryButton, styles.secondaryButton]} onPress={() => { setMetodoRegistro('telefono'); setStep('enter_contact'); }}>
        <Text style={styles.secondaryButtonText}>Registrarse con telefono</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEnterContact = () => (
    <View style={styles.card}>
      <Text style={styles.title}>{metodoRegistro === 'correo' ? 'Ingresa tu correo' : 'Ingresa tu telefono'}</Text>
      {metodoRegistro === 'correo' ? (
        <TextInput style={styles.input} placeholder="correo@ejemplo.com" placeholderTextColor="#666" value={correo} onChangeText={setCorreo} autoCapitalize="none" keyboardType="email-address" />
      ) : (
        <TextInput style={styles.input} placeholder="+57 300 123 4567" placeholderTextColor="#666" value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" />
      )}
      <TouchableOpacity style={styles.primaryButton} onPress={enviarCodigo}>
        <Text style={styles.primaryButtonText}>Enviar codigo</Text>
      </TouchableOpacity>
    </View>
  );

  const renderVerifyCode = () => (
    <View style={styles.card}>
      <Text style={styles.title}>Verifica tu codigo</Text>
      <TextInput style={styles.input} placeholder="1234" placeholderTextColor="#666" value={codigo} onChangeText={setCodigo} keyboardType="numeric" />
      <TouchableOpacity style={styles.primaryButton} onPress={verificarCodigo}>
        <Text style={styles.primaryButtonText}>Continuar</Text>
      </TouchableOpacity>
    </View>
  );

  const renderProfileBasics = () => (
    <View style={styles.card}>
      <Text style={styles.title}>Construye tu perfil</Text>
      <TextInput style={styles.input} placeholder="Nombre" placeholderTextColor="#666" value={nombre} onChangeText={setNombre} />
      <TextInput style={styles.input} placeholder="Fecha de nacimiento (AAAA-MM-DD)" placeholderTextColor="#666" value={fecha} onChangeText={setFecha} />
      <TextInput style={styles.input} placeholder="Hora de nacimiento (HH:MM)" placeholderTextColor="#666" value={horaNacimiento} onChangeText={setHoraNacimiento} />
      <TextInput style={styles.input} placeholder="Lugar de nacimiento" placeholderTextColor="#666" value={lugarNacimiento} onChangeText={setLugarNacimiento} />
      <TextInput style={styles.input} placeholder="Ciudad actual" placeholderTextColor="#666" value={ubicacion} onChangeText={setUbicacion} />
      <TextInput style={[styles.input, styles.multiline]} placeholder="Bio corta" placeholderTextColor="#666" value={bio} onChangeText={setBio} multiline />
      <TextInput style={styles.input} placeholder="Ocupacion" placeholderTextColor="#666" value={ocupacion} onChangeText={setOcupacion} />
      <TextInput style={styles.input} placeholder="Educacion" placeholderTextColor="#666" value={educacion} onChangeText={setEducacion} />
      <TextInput style={styles.input} placeholder="Gustos separados por comas" placeholderTextColor="#666" value={gustos} onChangeText={setGustos} />
      <Text style={styles.sectionLabel}>Tu intencion</Text>
      <View style={styles.rowWrap}>
        {['Para tener citas', 'Para chatear', 'Para buscar relacion'].map((item) => (
          <OptionButton key={item} label={item} active={intencion === item} onPress={() => setIntencion(item)} />
        ))}
      </View>
      <Text style={styles.sectionLabel}>Genero</Text>
      <View style={styles.rowWrap}>
        {['Hombre', 'Mujer', 'Otro'].map((item) => (
          <OptionButton key={item} label={item} active={genero === item} onPress={() => setGenero(item)} />
        ))}
      </View>
      <Text style={styles.sectionLabel}>Te interesa conocer</Text>
      <View style={styles.rowWrap}>
        {['Hombres', 'Mujeres', 'Todos'].map((item) => (
          <OptionButton key={item} label={item} active={generoInteres === item} onPress={() => setGeneroInteres(item)} />
        ))}
      </View>
      <TouchableOpacity style={styles.primaryButton} onPress={() => setStep('details')}>
        <Text style={styles.primaryButtonText}>Seguir con fotos y filtros</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDetails = () => (
    <View style={styles.card}>
      <Text style={styles.title}>Fotos, filtros y privacidad</Text>
      {fotos.map((foto, index) => (
        <TextInput
          key={`foto-${index}`}
          style={styles.input}
          placeholder={`URL de foto ${index + 1}`}
          placeholderTextColor="#666"
          value={foto}
          onChangeText={(value) => updatePhoto(index, value)}
          autoCapitalize="none"
        />
      ))}
      <View style={styles.inlineInputs}>
        <TextInput style={[styles.input, styles.compactInput]} placeholder="Edad min" placeholderTextColor="#666" value={edadMinPref} onChangeText={setEdadMinPref} keyboardType="numeric" />
        <TextInput style={[styles.input, styles.compactInput]} placeholder="Edad max" placeholderTextColor="#666" value={edadMaxPref} onChangeText={setEdadMaxPref} keyboardType="numeric" />
      </View>
      <TextInput style={styles.input} placeholder="Distancia maxima en km" placeholderTextColor="#666" value={distanciaMaxKm} onChangeText={setDistanciaMaxKm} keyboardType="numeric" />

      <TouchableOpacity style={[styles.primaryButton, styles.secondaryButton]} onPress={obtenerUbicacionGPS}>
        <Text style={styles.secondaryButtonText}>Usar mi ubicacion GPS</Text>
      </TouchableOpacity>
      {locationMessage ? <Text style={styles.helperText}>{locationMessage}</Text> : null}

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Compartir ubicacion para filtrar por distancia</Text>
        <Switch value={consentimientoUbicacion} onValueChange={setConsentimientoUbicacion} thumbColor="#D4AF37" trackColor={{ false: '#333', true: '#4a4120' }} />
      </View>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Mostrar edad en tu perfil</Text>
        <Switch value={mostrarEdad} onValueChange={setMostrarEdad} thumbColor="#D4AF37" trackColor={{ false: '#333', true: '#4a4120' }} />
      </View>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Mostrar distancia a tus matches</Text>
        <Switch value={mostrarDistancia} onValueChange={setMostrarDistancia} thumbColor="#D4AF37" trackColor={{ false: '#333', true: '#4a4120' }} />
      </View>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Mantener perfil visible</Text>
        <Switch value={perfilActivo} onValueChange={setPerfilActivo} thumbColor="#D4AF37" trackColor={{ false: '#333', true: '#4a4120' }} />
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={registrar}>
        <Text style={styles.primaryButtonText}>Crear perfil</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.logo}>SYNCRONOS</Text>
      <Text style={styles.subtitle}>Conexiones guiadas por fecha de nacimiento, afinidad y conversacion real.</Text>

      {step === 'method_selection' && renderContactStep()}
      {step === 'enter_contact' && renderEnterContact()}
      {step === 'verify_code' && renderVerifyCode()}
      {step === 'profile_basics' && renderProfileBasics()}
      {step === 'details' && renderDetails()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050510' },
  content: { padding: 18, paddingBottom: 48 },
  logo: { color: '#D4AF37', fontSize: 36, fontWeight: '800', marginTop: 70, textAlign: 'center' },
  subtitle: { color: '#a0a0b8', marginTop: 10, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  card: { backgroundColor: '#0f0f25', borderRadius: 22, padding: 18, borderWidth: 1, borderColor: '#1a1a3a' },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  input: {
    backgroundColor: '#050510',
    color: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1a1a3a',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  multiline: { minHeight: 92, textAlignVertical: 'top' },
  primaryButton: {
    backgroundColor: '#D4AF37',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: { color: '#050510', fontWeight: '800', fontSize: 15 },
  secondaryButton: { backgroundColor: '#171736', borderWidth: 1, borderColor: '#2a2a4c' },
  secondaryButtonText: { color: '#fff', fontWeight: '700' },
  optionButton: {
    borderWidth: 1,
    borderColor: '#2a2a4c',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
    marginBottom: 10,
    backgroundColor: '#14142f',
  },
  optionButtonActive: { backgroundColor: '#D4AF37', borderColor: '#D4AF37' },
  optionText: { color: '#d0d0de', fontWeight: '600' },
  optionTextActive: { color: '#050510' },
  sectionLabel: { color: '#D4AF37', fontWeight: '700', marginTop: 8, marginBottom: 10 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  inlineInputs: { flexDirection: 'row', gap: 10 },
  compactInput: { flex: 1 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
  },
  toggleLabel: { color: '#fff', flex: 1, lineHeight: 20 },
  helperText: { color: '#D4AF37', marginBottom: 10 },
});
