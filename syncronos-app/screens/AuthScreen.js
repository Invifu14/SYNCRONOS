import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppContext } from '../context/AppContext';
import AstralPickerModal from '../components/AstralPickerModal';
import LocationSelectorModal from '../components/LocationSelectorModal';
import PhotoSlotsEditor from '../components/PhotoSlotsEditor';
import ProfilePromptsEditor from '../components/ProfilePromptsEditor';
import TimeZoneSelectorModal from '../components/TimeZoneSelectorModal';
import { extractPhotoUrls, normalizePhotoDrafts, uploadDraftPhotos } from '../utils/photos';
import { compactProfilePrompts, normalizeProfilePrompts } from '../utils/profilePrompts';
import { formatTimeZoneLabel, getDefaultBirthTimeZone, inferTimeZoneFromLocationLabel } from '../utils/timezones';

function OptionButton({ active, label, onPress }) {
  return (
    <TouchableOpacity style={[styles.optionButton, active && styles.optionButtonActive]} onPress={onPress}>
      <Text style={[styles.optionText, active && styles.optionTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function WizardCard({
  stepNumber,
  totalSteps,
  title,
  label,
  helper,
  children,
  onNext,
  onBack,
  nextLabel = 'Continuar',
  canGoBack = true,
  nextDisabled = false,
}) {
  return (
    <View style={styles.card}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressText}>{`Paso ${stepNumber} de ${totalSteps}`}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(stepNumber / totalSteps) * 100}%` }]} />
        </View>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.stepLabel}>{label}</Text>
      {helper ? <Text style={styles.stepHelper}>{helper}</Text> : null}

      <View style={styles.stepBody}>{children}</View>

      <View style={styles.footerActions}>
        {canGoBack ? (
          <TouchableOpacity style={[styles.footerButton, styles.secondaryButton]} onPress={onBack}>
            <Text style={styles.secondaryButtonText}>Atras</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.footerButton, styles.primaryButton, nextDisabled && styles.primaryButtonDisabled]}
          onPress={onNext}
          disabled={nextDisabled}
        >
          <Text style={styles.primaryButtonText}>{nextLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AuthScreen() {
  const [step, setStep] = useState('method_selection');
  const [profileStepIndex, setProfileStepIndex] = useState(0);

  const [metodoRegistro, setMetodoRegistro] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [codigo, setCodigo] = useState('');

  const [nombre, setNombre] = useState('');
  const [intencion, setIntencion] = useState('');
  const [genero, setGenero] = useState('');
  const [generoInteres, setGeneroInteres] = useState('');

  const [fecha, setFecha] = useState('');
  const [birthDate, setBirthDate] = useState(new Date(2000, 0, 1));
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const [horaNacimiento, setHoraNacimiento] = useState('');
  const [birthTime, setBirthTime] = useState(new Date(2000, 0, 1, 12, 0));
  const [showBirthTimePicker, setShowBirthTimePicker] = useState(false);

  const [lugarNacimiento, setLugarNacimiento] = useState('');
  const [showBirthPlaceSelector, setShowBirthPlaceSelector] = useState(false);
  const [timezoneNacimiento, setTimezoneNacimiento] = useState(() => getDefaultBirthTimeZone());
  const [showBirthTimezoneSelector, setShowBirthTimezoneSelector] = useState(false);
  const [latitudNacimiento, setLatitudNacimiento] = useState(null);
  const [longitudNacimiento, setLongitudNacimiento] = useState(null);

  const [ubicacion, setUbicacion] = useState('');
  const [showCurrentLocationSelector, setShowCurrentLocationSelector] = useState(false);
  const [latitud, setLatitud] = useState(null);
  const [longitud, setLongitud] = useState(null);
  const [locationMessage, setLocationMessage] = useState('');

  const [bio, setBio] = useState('');
  const [ocupacion, setOcupacion] = useState('');
  const [educacion, setEducacion] = useState('');
  const [gustos, setGustos] = useState('');
  const [prompts, setPrompts] = useState(() => normalizeProfilePrompts());
  const [fotos, setFotos] = useState(() => normalizePhotoDrafts());

  const [edadMinPref, setEdadMinPref] = useState('18');
  const [edadMaxPref, setEdadMaxPref] = useState('35');
  const [distanciaMaxKm, setDistanciaMaxKm] = useState('50');
  const [mostrarEdad, setMostrarEdad] = useState(true);
  const [mostrarDistancia, setMostrarDistancia] = useState(true);
  const [consentimientoUbicacion, setConsentimientoUbicacion] = useState(true);
  const [perfilActivo, setPerfilActivo] = useState(true);

  const [creatingProfile, setCreatingProfile] = useState(false);
  const stepAnimation = useRef(new Animated.Value(1)).current;
  const { baseUrl, completeLogin } = useContext(AppContext);

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateLabel = (value) => {
    if (!value) return 'Selecciona tu fecha de nacimiento';
    const [year, month, day] = value.split('-');
    if (!year || !month || !day) return value;
    return `${day}/${month}/${year}`;
  };

  const formatTime = (date) => {
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatTimeLabel = (value) => {
    if (!value) return 'Selecciona tu hora de nacimiento';
    return value;
  };

  const formatLocationLabel = (value, placeholder) => {
    if (!value) return placeholder;
    return value;
  };

  const profileSteps = useMemo(() => ([
    {
      id: 'nombre',
      label: 'Nombre',
      helper: 'Asi apareceras en SYNCRONOS.',
      canContinue: !!nombre.trim(),
      content: (
        <TextInput
          style={styles.input}
          placeholder="Tu nombre"
          placeholderTextColor="#666"
          value={nombre}
          onChangeText={setNombre}
          autoFocus
        />
      ),
    },
    {
      id: 'intencion',
      label: 'Tus intenciones',
      helper: 'Elige la energia con la que quieres conectar aqui.',
      canContinue: !!intencion,
      content: (
        <View style={styles.rowWrap}>
          {['Para tener citas', 'Para chatear', 'Para buscar relacion'].map((item) => (
            <OptionButton key={item} label={item} active={intencion === item} onPress={() => setIntencion(item)} />
          ))}
        </View>
      ),
    },
    {
      id: 'genero',
      label: 'Tu genero',
      helper: 'Esto nos ayuda a personalizar mejor tu radar.',
      canContinue: !!genero,
      content: (
        <View style={styles.rowWrap}>
          {['Hombre', 'Mujer', 'Otro'].map((item) => (
            <OptionButton key={item} label={item} active={genero === item} onPress={() => setGenero(item)} />
          ))}
        </View>
      ),
    },
    {
      id: 'interes',
      label: 'A quien quieres conocer',
      helper: 'Define a quien quieres ver en sugerencias y afinidad.',
      canContinue: !!generoInteres,
      content: (
        <View style={styles.rowWrap}>
          {['Hombres', 'Mujeres', 'Todos'].map((item) => (
            <OptionButton key={item} label={item} active={generoInteres === item} onPress={() => setGeneroInteres(item)} />
          ))}
        </View>
      ),
    },
    {
      id: 'nacimiento',
      label: 'Fecha y hora de nacimiento',
      helper: 'La fecha es obligatoria. La hora hace tu lectura astral mucho mas precisa.',
      canContinue: !!fecha,
      content: (
        <>
          <TouchableOpacity style={styles.dateInput} onPress={() => setShowBirthDatePicker(true)} activeOpacity={0.85}>
            <Text style={fecha ? styles.dateValue : styles.datePlaceholder}>{formatDateLabel(fecha)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateInput} onPress={() => setShowBirthTimePicker(true)} activeOpacity={0.85}>
            <Text style={horaNacimiento ? styles.dateValue : styles.datePlaceholder}>{formatTimeLabel(horaNacimiento)}</Text>
          </TouchableOpacity>
        </>
      ),
    },
    {
      id: 'lugar_nacimiento',
      label: 'Lugar de nacimiento',
      helper: 'Selecciona la ciudad donde naciste para afinar la carta astral.',
      canContinue: true,
      content: (
        <TouchableOpacity style={styles.dateInput} onPress={() => setShowBirthPlaceSelector(true)} activeOpacity={0.85}>
          <Text style={lugarNacimiento ? styles.dateValue : styles.datePlaceholder}>
            {formatLocationLabel(lugarNacimiento, 'Selecciona tu lugar de nacimiento')}
          </Text>
        </TouchableOpacity>
      ),
    },
    {
      id: 'timezone_nacimiento',
      label: 'Zona horaria de nacimiento',
      helper: 'Puedes dejar la sugerida o elegir la zona IANA exacta si naciste en otra region.',
      canContinue: true,
      content: (
        <TouchableOpacity style={styles.dateInput} onPress={() => setShowBirthTimezoneSelector(true)} activeOpacity={0.85}>
          <Text style={timezoneNacimiento ? styles.dateValue : styles.datePlaceholder}>
            {formatTimeZoneLabel(timezoneNacimiento)}
          </Text>
        </TouchableOpacity>
      ),
    },
    {
      id: 'ubicacion',
      label: 'Ciudad actual',
      helper: 'La usamos para filtros de distancia y para encontrar conexiones cercanas.',
      canContinue: true,
      content: (
        <>
          <TouchableOpacity style={styles.dateInput} onPress={() => setShowCurrentLocationSelector(true)} activeOpacity={0.85}>
            <Text style={ubicacion ? styles.dateValue : styles.datePlaceholder}>
              {formatLocationLabel(ubicacion, 'Selecciona tu ciudad actual')}
            </Text>
          </TouchableOpacity>
          {locationMessage ? <Text style={styles.helperText}>{locationMessage}</Text> : null}
        </>
      ),
    },
    {
      id: 'bio',
      label: 'Bio corta',
      helper: 'Dos o tres lineas para que el otro lado capte tu vibra rapido.',
      canContinue: true,
      content: (
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Cuenta un poco de ti"
          placeholderTextColor="#666"
          value={bio}
          onChangeText={setBio}
          multiline
          textAlignVertical="top"
        />
      ),
    },
    {
      id: 'ocupacion',
      label: 'Ocupacion',
      helper: 'Opcional, pero ayuda a que tu perfil se sienta mas completo.',
      canContinue: true,
      content: (
        <TextInput
          style={styles.input}
          placeholder="A que te dedicas"
          placeholderTextColor="#666"
          value={ocupacion}
          onChangeText={setOcupacion}
        />
      ),
    },
    {
      id: 'educacion',
      label: 'Educacion',
      helper: 'Tambien puedes dejarlo vacio si prefieres.',
      canContinue: true,
      content: (
        <TextInput
          style={styles.input}
          placeholder="Tu formacion o estudios"
          placeholderTextColor="#666"
          value={educacion}
          onChangeText={setEducacion}
        />
      ),
    },
    {
      id: 'gustos',
      label: 'Tus gustos',
      helper: 'Separalos por comas para enriquecer tu perfil.',
      canContinue: true,
      content: (
        <TextInput
          style={styles.input}
          placeholder="Musica, viajes, cine, cafe..."
          placeholderTextColor="#666"
          value={gustos}
          onChangeText={setGustos}
        />
      ),
    },
    {
      id: 'prompts',
      label: 'Tus datos curiosos',
      helper: 'Cuentanos algunos datos para conocerte mejor.',
      canContinue: true,
      content: (
        <ProfilePromptsEditor
          prompts={prompts}
          onChange={setPrompts}
          disabled={creatingProfile}
        />
      ),
    },
    {
      id: 'fotos',
      label: 'Tus fotos reales',
      helper: 'Agrega hasta tres fotos. Esta parte si es obligatoria para crear el perfil.',
      canContinue: fotos.some(Boolean),
      content: (
        <PhotoSlotsEditor
          photos={fotos}
          onChange={setFotos}
          disabled={creatingProfile}
        />
      ),
    },
    {
      id: 'rango_edad',
      label: 'Rango de edad',
      helper: 'Define que edades quieres ver en tu radar.',
      canContinue: Number(edadMinPref) <= Number(edadMaxPref),
      content: (
        <View style={styles.inlineInputs}>
          <TextInput style={[styles.input, styles.compactInput]} placeholder="Edad min" placeholderTextColor="#666" value={edadMinPref} onChangeText={setEdadMinPref} keyboardType="numeric" />
          <TextInput style={[styles.input, styles.compactInput]} placeholder="Edad max" placeholderTextColor="#666" value={edadMaxPref} onChangeText={setEdadMaxPref} keyboardType="numeric" />
        </View>
      ),
    },
    {
      id: 'distancia',
      label: 'Distancia maxima',
      helper: 'En kilometros. Puedes cambiarlo despues desde tu perfil.',
      canContinue: !!distanciaMaxKm,
      content: (
        <TextInput style={styles.input} placeholder="Distancia maxima en km" placeholderTextColor="#666" value={distanciaMaxKm} onChangeText={setDistanciaMaxKm} keyboardType="numeric" />
      ),
    },
    {
      id: 'privacidad',
      label: 'Visibilidad y privacidad',
      helper: 'Ultimo paso antes de crear tu perfil.',
      canContinue: true,
      content: (
        <>
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
        </>
      ),
    },
  ]), [
    bio,
    consentimientoUbicacion,
    creatingProfile,
    distanciaMaxKm,
    edadMaxPref,
    edadMinPref,
    educacion,
    fecha,
    fotos,
    genero,
    generoInteres,
    gustos,
    horaNacimiento,
    intencion,
    locationMessage,
    lugarNacimiento,
    mostrarDistancia,
    mostrarEdad,
    nombre,
    ocupacion,
    perfilActivo,
    prompts,
    timezoneNacimiento,
    ubicacion,
  ]);

  const currentProfileStep = profileSteps[profileStepIndex];

  useEffect(() => {
    if (step !== 'profile_wizard') return;

    stepAnimation.setValue(0);
    Animated.timing(stepAnimation, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [profileStepIndex, step, stepAnimation]);

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
    if (codigo !== '1234') {
      Alert.alert('Error', 'Codigo incorrecto. Usa 1234.');
      return;
    }

    setProfileStepIndex(0);
    setStep('profile_wizard');
  };

  const goToNextProfileStep = () => {
    if (!currentProfileStep?.canContinue) {
      if (currentProfileStep?.id === 'fotos') {
        Alert.alert('Error', 'Agrega al menos una foto real antes de continuar.');
      } else if (currentProfileStep?.id === 'rango_edad') {
        Alert.alert('Error', 'El rango de edad no es valido.');
      }
      return;
    }

    if (profileStepIndex === profileSteps.length - 1) {
      registrar();
      return;
    }

    setProfileStepIndex((current) => current + 1);
  };

  const goToPreviousProfileStep = () => {
    if (profileStepIndex === 0) {
      setStep('verify_code');
      return;
    }
    setProfileStepIndex((current) => current - 1);
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

    if (!fotos.some(Boolean)) {
      Alert.alert('Error', 'Agrega al menos una foto real antes de crear tu perfil.');
      return;
    }

    setCreatingProfile(true);
    try {
      const response = await fetch(`${baseUrl}/registrar-cronos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          fecha_nacimiento: fecha,
          hora_nacimiento: horaNacimiento,
          lugar_nacimiento: lugarNacimiento,
          timezone_nacimiento: timezoneNacimiento,
          latitud_nacimiento: latitudNacimiento,
          longitud_nacimiento: longitudNacimiento,
          ubicacion,
          gustos,
          bio,
          ocupacion,
          educacion,
          prompts: compactProfilePrompts(prompts),
          fotos: [],
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

      let nextUser = data.usuario;
      const requestWithSession = (path, options = {}) => {
        const headers = new Headers(options.headers || {});
        headers.set('x-session-token', data.token);
        if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json');
        }
        return fetch(`${baseUrl}${path}`, {
          ...options,
          headers,
        });
      };

      const uploadedDrafts = await uploadDraftPhotos({
        drafts: fotos,
        userId: data.usuario.id,
        request: requestWithSession,
        onDraftsChange: setFotos,
      });
      const uploadedPhotoUrls = extractPhotoUrls(uploadedDrafts);

      const profileResponse = await requestWithSession(`/perfil/${data.usuario.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          fotos: uploadedPhotoUrls,
        }),
      });
      const profileData = await profileResponse.json();
      if (profileResponse.ok) {
        nextUser = profileData.usuario ?? nextUser;
      }

      await completeLogin(nextUser, data.token);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo conectar con el servidor.');
    } finally {
      setCreatingProfile(false);
    }
  };

  const renderMethodSelection = () => (
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
      <View style={styles.footerActions}>
        <TouchableOpacity style={[styles.footerButton, styles.secondaryButton]} onPress={() => setStep('method_selection')}>
          <Text style={styles.secondaryButtonText}>Atras</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.footerButton, styles.primaryButton]} onPress={enviarCodigo}>
          <Text style={styles.primaryButtonText}>Continuar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderVerifyCode = () => (
    <View style={styles.card}>
      <Text style={styles.title}>Verifica tu codigo</Text>
      <Text style={styles.stepHelper}>Usa el codigo de prueba para avanzar al constructor de perfil.</Text>
      <TextInput style={styles.input} placeholder="1234" placeholderTextColor="#666" value={codigo} onChangeText={setCodigo} keyboardType="numeric" />
      <View style={styles.footerActions}>
        <TouchableOpacity style={[styles.footerButton, styles.secondaryButton]} onPress={() => setStep('enter_contact')}>
          <Text style={styles.secondaryButtonText}>Atras</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.footerButton, styles.primaryButton]} onPress={verificarCodigo}>
          <Text style={styles.primaryButtonText}>Construir perfil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProfileWizard = () => (
    <Animated.View
      style={{
        opacity: stepAnimation,
        transform: [{
          translateX: stepAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [26, 0],
          }),
        }],
      }}
    >
      <WizardCard
        stepNumber={profileStepIndex + 1}
        totalSteps={profileSteps.length}
        title="Construye tu perfil"
        label={currentProfileStep.label}
        helper={currentProfileStep.helper}
        onNext={goToNextProfileStep}
        onBack={goToPreviousProfileStep}
        nextLabel={profileStepIndex === profileSteps.length - 1 ? (creatingProfile ? 'Creando...' : 'Crear perfil') : 'Siguiente'}
        canGoBack
        nextDisabled={creatingProfile || !currentProfileStep.canContinue}
      >
        {currentProfileStep.content}
      </WizardCard>
    </Animated.View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.logo}>SYNCRONOS</Text>
      <Text style={styles.subtitle}>Conexiones guiadas por fecha de nacimiento, afinidad y conversacion real.</Text>

      {step === 'method_selection' && renderMethodSelection()}
      {step === 'enter_contact' && renderEnterContact()}
      {step === 'verify_code' && renderVerifyCode()}
      {step === 'profile_wizard' && renderProfileWizard()}

      <AstralPickerModal
        visible={showBirthDatePicker}
        mode="date"
        value={birthDate}
        title="Elige tu fecha de nacimiento"
        helperText="Selecciona el dia exacto que marca tu energia base y tu compatibilidad."
        onClose={() => setShowBirthDatePicker(false)}
        onConfirm={(selectedDate) => {
          setBirthDate(selectedDate);
          setFecha(formatDate(selectedDate));
        }}
      />

      <AstralPickerModal
        visible={showBirthTimePicker}
        mode="time"
        value={birthTime}
        title="Elige tu hora de nacimiento"
        helperText="La hora ayuda a calcular con mas precision tu carta y afinidad astral."
        onClose={() => setShowBirthTimePicker(false)}
        onConfirm={(selectedTime) => {
          setBirthTime(selectedTime);
          setHoraNacimiento(formatTime(selectedTime));
        }}
      />

      <LocationSelectorModal
        visible={showBirthPlaceSelector}
        title="Elige tu lugar de nacimiento"
        helperText="Busca y selecciona la ciudad donde naciste para enriquecer tu perfil astral."
        placeholder="Ejemplo: Medellin, Colombia"
        currentValue={lugarNacimiento}
        onClose={() => setShowBirthPlaceSelector(false)}
        onSelect={(location) => {
          setLugarNacimiento(location.label);
          setLatitudNacimiento(location.latitude);
          setLongitudNacimiento(location.longitude);
          const inferredTimezone = inferTimeZoneFromLocationLabel(location.label);
          if (inferredTimezone) {
            setTimezoneNacimiento(inferredTimezone);
          }
        }}
      />

      <TimeZoneSelectorModal
        visible={showBirthTimezoneSelector}
        title="Elige tu zona horaria de nacimiento"
        helperText="La usamos para calcular con precision Luna, Ascendente, Venus y Marte segun tu lugar de origen."
        currentValue={timezoneNacimiento}
        suggestedValue={inferTimeZoneFromLocationLabel(lugarNacimiento)}
        onClose={() => setShowBirthTimezoneSelector(false)}
        onSelect={setTimezoneNacimiento}
      />

      <LocationSelectorModal
        visible={showCurrentLocationSelector}
        title="Elige tu ubicacion actual"
        helperText="Puedes buscar tu ciudad o usar tu ubicacion actual desde la app."
        placeholder="Ejemplo: Bogota, Colombia"
        currentValue={ubicacion}
        allowCurrentLocation
        currentLocationLabel="Usar mi ubicacion"
        onClose={() => setShowCurrentLocationSelector(false)}
        onSelect={(location) => {
          setUbicacion(location.label);
          setLatitud(location.latitude);
          setLongitud(location.longitude);
          setConsentimientoUbicacion(true);
          setLocationMessage(
            location.source === 'current-location'
              ? 'Ubicacion actual vinculada desde la app.'
              : 'Ciudad seleccionada para tus filtros por distancia.'
          );
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050510' },
  content: { padding: 18, paddingBottom: 48 },
  logo: { color: '#D4AF37', fontSize: 36, fontWeight: '800', marginTop: 70, textAlign: 'center' },
  subtitle: { color: '#a0a0b8', marginTop: 10, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  card: { backgroundColor: '#0f0f25', borderRadius: 22, padding: 18, borderWidth: 1, borderColor: '#1a1a3a' },
  progressHeader: {
    marginBottom: 18,
  },
  progressText: {
    color: '#8f8fa8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 10,
    letterSpacing: 1,
  },
  progressBar: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#171736',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#D4AF37',
  },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 12 },
  stepLabel: { color: '#D4AF37', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  stepHelper: { color: '#b7b7c9', lineHeight: 21, marginBottom: 16 },
  stepBody: { marginBottom: 10 },
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
  dateInput: {
    backgroundColor: '#050510',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1a1a3a',
    paddingHorizontal: 14,
    paddingVertical: 16,
    marginBottom: 12,
  },
  datePlaceholder: { color: '#666' },
  dateValue: { color: '#fff' },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
  primaryButton: {
    backgroundColor: '#D4AF37',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: { color: '#050510', fontWeight: '800', fontSize: 15 },
  secondaryButton: { backgroundColor: '#171736', borderWidth: 1, borderColor: '#2a2a4c' },
  secondaryButtonText: { color: '#fff', fontWeight: '700' },
  footerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  footerButton: {
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
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
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap' },
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
