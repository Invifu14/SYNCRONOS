import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { AppContext } from '../context/AppContext';
import AstralPickerModal from '../components/AstralPickerModal';
import LocationSelectorModal from '../components/LocationSelectorModal';
import PhotoSlotsEditor from '../components/PhotoSlotsEditor';
import ProfilePromptsEditor from '../components/ProfilePromptsEditor';
import { RangeSlider, SingleSlider } from '../components/PreferenceSliders';
import TimeZoneSelectorModal from '../components/TimeZoneSelectorModal';
import { GENDER_OPTIONS, ORIENTATION_OPTIONS, usesExpandedOrientationStep } from '../utils/identityOptions';
import { extractPhotoUrls, normalizePhotoDrafts, uploadDraftPhotos } from '../utils/photos';
import { compactProfilePrompts, normalizeProfilePrompts } from '../utils/profilePrompts';
import { formatTimeZoneLabel, getDefaultBirthTimeZone, inferTimeZoneFromLocationLabel } from '../utils/timezones';

const LOCATION_ACCESS_ERROR_PATTERN = /not authorized to use location services/i;

const uniqueLocationParts = (values) => [...new Set(values.filter(Boolean))];

const formatDetectedLocationLabel = (place) => {
  const rawName = place?.city || place?.district || place?.subregion || place?.region || 'Mi ciudad actual';
  const parts = uniqueLocationParts([rawName, place?.region, place?.country]);
  return parts.join(', ');
};

const getReadableCurrentLocationError = (error) => {
  const rawMessage = `${error?.message || error || ''}`.trim();
  if (LOCATION_ACCESS_ERROR_PATTERN.test(rawMessage)) {
    return 'Activa la ubicacion del telefono y concede permiso a SYNCRONOS para continuar.';
  }
  return 'No pudimos obtener tu ciudad actual desde el dispositivo.';
};

function OptionButton({ active, label, onPress }) {
  return (
    <TouchableOpacity style={[styles.optionButton, active && styles.optionButtonActive]} onPress={onPress}>
      <Text style={[styles.optionText, active && styles.optionTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function SelectionTile({ active, label, description, onPress }) {
  return (
    <TouchableOpacity style={[styles.selectionTile, active && styles.selectionTileActive]} onPress={onPress}>
      <Text style={[styles.selectionTileLabel, active && styles.selectionTileLabelActive]}>{label}</Text>
      <Text style={[styles.selectionTileDescription, active && styles.selectionTileDescriptionActive]}>{description}</Text>
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

export default function AuthScreen({ navigation, route }) {
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
  const [orientacionSexual, setOrientacionSexual] = useState('');

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
  const [latitud, setLatitud] = useState(null);
  const [longitud, setLongitud] = useState(null);
  const [locationMessage, setLocationMessage] = useState('');
  const [resolvingCurrentLocation, setResolvingCurrentLocation] = useState(false);

  const [bio, setBio] = useState('');
  const [ocupacion, setOcupacion] = useState('');
  const [educacion, setEducacion] = useState('');
  const [gustos, setGustos] = useState('');
  const [prompts, setPrompts] = useState(() => normalizeProfilePrompts());
  const [fotos, setFotos] = useState(() => normalizePhotoDrafts());

  const [edadMinPref, setEdadMinPref] = useState('18');
  const [edadMaxPref, setEdadMaxPref] = useState('35');
  const [distanciaMaxKm, setDistanciaMaxKm] = useState('50');
  const [mostrarEdad] = useState(true);
  const [mostrarDistancia] = useState(true);
  const [consentimientoUbicacion, setConsentimientoUbicacion] = useState(false);
  const [perfilActivo] = useState(true);

  const [creatingProfile, setCreatingProfile] = useState(false);
  const stepAnimation = useRef(new Animated.Value(1)).current;
  const currentLocationAttemptedRef = useRef(false);
  const { baseUrl, completeLogin } = useContext(AppContext);
  const authMode = route?.params?.mode === 'login' ? 'login' : 'register';
  const isLoginMode = authMode === 'login';

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

  const resolveCurrentLocation = useCallback(async () => {
    setResolvingCurrentLocation(true);
    setLocationMessage('');

    try {
      let permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== 'granted' && permission.canAskAgain !== false) {
        permission = await Location.requestForegroundPermissionsAsync();
      }

      if (permission.status !== 'granted') {
        setConsentimientoUbicacion(false);
        setUbicacion('');
        setLatitud(null);
        setLongitud(null);
        setLocationMessage(
          permission.canAskAgain === false
            ? 'La ubicacion esta bloqueada desde Ajustes. Sin este permiso no podras avanzar.'
            : 'Necesitamos tu permiso de ubicacion. Sin ese permiso no podras avanzar.'
        );
        return;
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setConsentimientoUbicacion(false);
        setUbicacion('');
        setLatitud(null);
        setLongitud(null);
        setLocationMessage('Activa la ubicacion del telefono para que SYNCRONOS detecte tu ciudad actual.');
        return;
      }

      const coords = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const places = await Location.reverseGeocodeAsync({
        latitude: coords.coords.latitude,
        longitude: coords.coords.longitude,
      });

      const nextLabel = places.length ? formatDetectedLocationLabel(places[0]) : 'Mi ciudad actual';
      setUbicacion(nextLabel);
      setLatitud(coords.coords.latitude);
      setLongitud(coords.coords.longitude);
      setConsentimientoUbicacion(true);
      setLocationMessage('Listo, detectamos tu ciudad actual desde la app.');
    } catch (error) {
      console.error('No se pudo obtener la ubicacion actual', error);
      setConsentimientoUbicacion(false);
      setUbicacion('');
      setLatitud(null);
      setLongitud(null);
      setLocationMessage(getReadableCurrentLocationError(error));
    } finally {
      setResolvingCurrentLocation(false);
    }
  }, []);

  const selectedPhotosCount = useMemo(() => fotos.filter(Boolean).length, [fotos]);
  const currentAgeMin = Number.parseInt(edadMinPref, 10) || 18;
  const currentAgeMax = Number.parseInt(edadMaxPref, 10) || 35;
  const currentDistance = Number.parseInt(distanciaMaxKm, 10) || 50;

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
      helper: 'Elige como quieres presentarte. Si eliges Otro, abriremos un paso adicional para definir tu orientacion.',
      canContinue: !!genero,
      content: (
        <View style={styles.selectionGrid}>
          {GENDER_OPTIONS.map((item) => (
            <SelectionTile
              key={item.value}
              label={item.label}
              description={item.description}
              active={genero === item.value}
              onPress={() => {
                setGenero(item.value);
                if (!usesExpandedOrientationStep(item.value)) {
                  setOrientacionSexual('');
                }
              }}
            />
          ))}
        </View>
      ),
    },
    ...(usesExpandedOrientationStep(genero) ? [{
      id: 'orientacion',
      label: 'Tu orientacion sexual',
      helper: 'Elige la opcion que mejor describa como quieres definirte en esta etapa.',
      canContinue: !!orientacionSexual,
      content: (
        <View style={styles.selectionGrid}>
          {ORIENTATION_OPTIONS.map((item) => (
            <SelectionTile
              key={item.value}
              label={item.label}
              description={item.description}
              active={orientacionSexual === item.value}
              onPress={() => setOrientacionSexual(item.value)}
            />
          ))}
        </View>
      ),
    }] : []),
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
      label: 'Tu ciudad actual',
      helper: 'SYNCRONOS la obtiene automaticamente con permiso de ubicacion. Sin ese permiso no podras avanzar.',
      canContinue: !!ubicacion && Number.isFinite(latitud) && Number.isFinite(longitud),
      content: (
        <View style={styles.locationCard}>
          <Text style={styles.locationCardTitle}>{ubicacion || 'Vamos a detectar tu ciudad actual'}</Text>
          <Text style={styles.locationCardText}>
            {locationMessage || 'Pediremos permiso de ubicacion y completaremos esta ciudad automaticamente desde la app.'}
          </Text>

          {resolvingCurrentLocation ? (
            <View style={styles.locationLoadingRow}>
              <ActivityIndicator color="#D4AF37" />
              <Text style={styles.locationLoadingText}>Detectando tu ciudad...</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.locationActionButton, resolvingCurrentLocation && styles.primaryButtonDisabled]}
            onPress={resolveCurrentLocation}
            disabled={resolvingCurrentLocation}
          >
            <Text style={styles.locationActionText}>
              {ubicacion ? 'Volver a detectar mi ciudad' : 'Permitir ubicacion actual'}
            </Text>
          </TouchableOpacity>
        </View>
      ),
    },
    {
      id: 'bio_gustos',
      label: 'Bio corta y gustos',
      helper: 'Tu vibra y tus gustos ayudan a que el otro lado te lea rapido.',
      canContinue: true,
      content: (
        <>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Cuenta un poco de ti"
            placeholderTextColor="#666"
            value={bio}
            onChangeText={setBio}
            multiline
            textAlignVertical="top"
          />
          <TextInput
            style={styles.input}
            placeholder="Musica, viajes, cine, cafe..."
            placeholderTextColor="#666"
            value={gustos}
            onChangeText={setGustos}
          />
        </>
      ),
    },
    {
      id: 'ocupacion_educacion',
      label: 'Ocupacion y educacion',
      helper: 'Opcional, pero juntas hacen que tu perfil se sienta mas completo.',
      canContinue: true,
      content: (
        <>
          <TextInput
            style={styles.input}
            placeholder="A que te dedicas"
            placeholderTextColor="#666"
            value={ocupacion}
            onChangeText={setOcupacion}
          />
          <TextInput
            style={styles.input}
            placeholder="Tu formacion o estudios"
            placeholderTextColor="#666"
            value={educacion}
            onChangeText={setEducacion}
          />
        </>
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
      helper: 'Sube minimo 2 fotos y, si quieres, hasta 6 para que tu perfil se vea mas vivo.',
      canContinue: selectedPhotosCount >= 2,
      content: (
        <>
          <PhotoSlotsEditor
            photos={fotos}
            onChange={setFotos}
            disabled={creatingProfile}
          />
          <Text style={styles.helperText}>{`${selectedPhotosCount}/6 fotos listas para tu perfil.`}</Text>
        </>
      ),
    },
    {
      id: 'preferencias',
      label: 'Rango de edad y distancia maxima',
      helper: 'Ajusta ambos filtros desde aqui con sliders y luego podras cambiarlos en tu perfil.',
      canContinue: currentAgeMin <= currentAgeMax,
      content: (
        <View style={styles.sliderGroup}>
          <RangeSlider
            label="Rango de edad"
            lowValue={currentAgeMin}
            highValue={currentAgeMax}
            min={18}
            max={80}
            step={1}
            minLabel="18 anos"
            maxLabel="80 anos"
            formatValue={(low, high) => `${low} - ${high} anos`}
            onChangeLow={(value) => setEdadMinPref(`${value}`)}
            onChangeHigh={(value) => setEdadMaxPref(`${value}`)}
          />
          <SingleSlider
            label="Distancia maxima"
            value={currentDistance}
            min={1}
            max={300}
            step={1}
            minLabel="1 km"
            maxLabel="300 km"
            formatValue={(value) => `${value} km`}
            onChange={(value) => setDistanciaMaxKm(`${value}`)}
          />
        </View>
      ),
    },
  ]), [
    bio,
    creatingProfile,
    currentAgeMax,
    currentAgeMin,
    currentDistance,
    educacion,
    fecha,
    fotos,
    genero,
    generoInteres,
    gustos,
    horaNacimiento,
    intencion,
    latitud,
    locationMessage,
    longitud,
    lugarNacimiento,
    nombre,
    ocupacion,
    orientacionSexual,
    prompts,
    resolvingCurrentLocation,
    resolveCurrentLocation,
    selectedPhotosCount,
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

  useEffect(() => {
    setStep('method_selection');
    setMetodoRegistro('');
    setCorreo('');
    setTelefono('');
    setCodigo('');
    setGenero('');
    setGeneroInteres('');
    setOrientacionSexual('');
    setUbicacion('');
    setLatitud(null);
    setLongitud(null);
    setLocationMessage('');
    setConsentimientoUbicacion(false);
    setResolvingCurrentLocation(false);
    currentLocationAttemptedRef.current = false;
    setCreatingProfile(false);
  }, [authMode]);

  useEffect(() => {
    if (step !== 'profile_wizard') return;
    if (currentProfileStep?.id !== 'ubicacion') return;
    if (ubicacion || resolvingCurrentLocation || currentLocationAttemptedRef.current) return;

    currentLocationAttemptedRef.current = true;
    resolveCurrentLocation();
  }, [currentProfileStep?.id, resolveCurrentLocation, resolvingCurrentLocation, step, ubicacion]);
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

    if (isLoginMode) {
      iniciarSesion();
      return;
    }

    setProfileStepIndex(0);
    setStep('profile_wizard');
  };

  const iniciarSesion = async () => {
    try {
      const response = await fetch(`${baseUrl}/login-cronos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correo,
          telefono,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const notFound = response.status === 404 || `${data.mensaje || ''}`.toLowerCase().includes('no encontramos');
        if (isLoginMode && notFound) {
          Alert.alert('SYNCRONOS', 'Ups no logramos encontrar esta cuenta :(');
          return;
        }
        Alert.alert('SYNCRONOS', data.mensaje || 'No se pudo iniciar sesion.');
        return;
      }

      await completeLogin(data.usuario, data.token);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo conectar con el servidor.');
    }
  };

  const goToNextProfileStep = () => {
    if (!currentProfileStep?.canContinue) {
      if (currentProfileStep?.id === 'fotos') {
        Alert.alert('Error', 'Agrega minimo dos fotos reales antes de continuar.');
      } else if (currentProfileStep?.id === 'ubicacion') {
        Alert.alert('Error', 'Necesitamos tu ubicacion actual para continuar con SYNCRONOS.');
      } else if (currentProfileStep?.id === 'preferencias') {
        Alert.alert('Error', 'Revisa tus filtros antes de continuar.');
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

    if (usesExpandedOrientationStep(genero) && !orientacionSexual) {
      Alert.alert('Error', 'Elige tu orientacion antes de crear el perfil.');
      return;
    }

    if (!ubicacion || !Number.isFinite(latitud) || !Number.isFinite(longitud)) {
      Alert.alert('Error', 'Necesitamos tu ubicacion actual para crear el perfil.');
      return;
    }

    if (currentAgeMin > currentAgeMax) {
      Alert.alert('Error', 'El rango de edad no es valido.');
      return;
    }

    if (selectedPhotosCount < 2) {
      Alert.alert('Error', 'Agrega minimo dos fotos reales antes de crear tu perfil.');
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
          orientacion_sexual: usesExpandedOrientationStep(genero) ? orientacionSexual : '',
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
      <Text style={styles.title}>{isLoginMode ? 'Elige como quieres iniciar sesion' : 'Elige tu metodo de registro'}</Text>
      <TouchableOpacity style={styles.primaryButton} onPress={() => { setMetodoRegistro('correo'); setStep('enter_contact'); }}>
        <Text style={styles.primaryButtonText}>{isLoginMode ? 'Entrar con correo' : 'Registrarse con correo'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.primaryButton, styles.secondaryButton]} onPress={() => { setMetodoRegistro('telefono'); setStep('enter_contact'); }}>
        <Text style={styles.secondaryButtonText}>{isLoginMode ? 'Entrar con telefono' : 'Registrarse con telefono'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.changeModeButton} onPress={() => navigation.goBack()}>
        <Text style={styles.changeModeText}>Cambiar opcion</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEnterContact = () => (
    <View style={styles.card}>
      <Text style={styles.title}>{metodoRegistro === 'correo' ? 'Ingresa tu correo' : 'Ingresa tu telefono'}</Text>
      <Text style={styles.stepHelper}>{isLoginMode ? 'Usaremos este dato para encontrar tu cuenta.' : 'Lo usaremos para crear y validar tu acceso.'}</Text>
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
      <Text style={styles.stepHelper}>{isLoginMode ? 'Usa el codigo de prueba para entrar a tu cuenta.' : 'Usa el codigo de prueba para avanzar al constructor de perfil.'}</Text>
      <TextInput style={styles.input} placeholder="1234" placeholderTextColor="#666" value={codigo} onChangeText={setCodigo} keyboardType="numeric" />
      <View style={styles.footerActions}>
        <TouchableOpacity style={[styles.footerButton, styles.secondaryButton]} onPress={() => setStep('enter_contact')}>
          <Text style={styles.secondaryButtonText}>Atras</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.footerButton, styles.primaryButton]} onPress={verificarCodigo}>
          <Text style={styles.primaryButtonText}>{isLoginMode ? 'Iniciar sesion' : 'Construir perfil'}</Text>
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
  changeModeButton: {
    marginTop: 14,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  changeModeText: {
    color: '#a0a0b8',
    fontWeight: '700',
  },
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
  selectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  selectionTile: {
    width: '48%',
    minHeight: 138,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2a2a4c',
    backgroundColor: '#14142f',
    paddingHorizontal: 14,
    paddingVertical: 16,
    justifyContent: 'space-between',
  },
  selectionTileActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  selectionTileLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  selectionTileLabelActive: {
    color: '#050510',
  },
  selectionTileDescription: {
    color: '#c9c9db',
    lineHeight: 19,
    fontSize: 12,
  },
  selectionTileDescriptionActive: {
    color: '#130E22',
  },
  locationCard: {
    backgroundColor: '#11112a',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#242448',
    padding: 16,
  },
  locationCardTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  locationCardText: {
    color: '#c9c9db',
    lineHeight: 21,
    marginTop: 10,
  },
  locationLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  locationLoadingText: {
    color: '#D4AF37',
    fontWeight: '700',
  },
  locationActionButton: {
    marginTop: 16,
    backgroundColor: '#D4AF37',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  locationActionText: {
    color: '#050510',
    fontWeight: '800',
  },
  sliderGroup: {
    marginTop: 2,
  },
  helperText: { color: '#D4AF37', marginBottom: 10 },
});
