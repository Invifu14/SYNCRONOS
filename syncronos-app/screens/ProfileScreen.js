import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppContext } from '../context/AppContext';
import AstralPickerModal from '../components/AstralPickerModal';
import LocationSelectorModal from '../components/LocationSelectorModal';
import PhotoSlotsEditor from '../components/PhotoSlotsEditor';
import ProfilePhotoCarousel from '../components/ProfilePhotoCarousel';
import ProfilePromptsEditor from '../components/ProfilePromptsEditor';
import TimeZoneSelectorModal from '../components/TimeZoneSelectorModal';
import { GENDER_OPTIONS, ORIENTATION_OPTIONS, usesExpandedOrientationStep } from '../utils/identityOptions';
import { extractPhotoUrls, normalizePhotoDrafts, uploadDraftPhotos } from '../utils/photos';
import { compactProfilePrompts, normalizeProfilePrompts } from '../utils/profilePrompts';
import { formatTimeZoneLabel, getDefaultBirthTimeZone, inferTimeZoneFromLocationLabel } from '../utils/timezones';

function SelectionTile({ active, label, description, onPress }) {
  return (
    <TouchableOpacity style={[styles.selectionTile, active && styles.selectionTileActive]} onPress={onPress}>
      <Text style={[styles.selectionTileLabel, active && styles.selectionTileLabelActive]}>{label}</Text>
      <Text style={[styles.selectionTileDescription, active && styles.selectionTileDescriptionActive]}>{description}</Text>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { user, apiFetch, setUser, refreshUser, logout } = useContext(AppContext);
  const [draft, setDraft] = useState(null);
  const [photoDrafts, setPhotoDrafts] = useState(() => normalizePhotoDrafts());
  const [saving, setSaving] = useState(false);
  const [birthDate, setBirthDate] = useState(new Date(2000, 0, 1));
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const [birthTime, setBirthTime] = useState(new Date(2000, 0, 1, 12, 0));
  const [showBirthTimePicker, setShowBirthTimePicker] = useState(false);
  const [showBirthPlaceSelector, setShowBirthPlaceSelector] = useState(false);
  const [showBirthTimezoneSelector, setShowBirthTimezoneSelector] = useState(false);
  const [showCurrentLocationSelector, setShowCurrentLocationSelector] = useState(false);

  useEffect(() => {
    if (!user) return;

    const parsedBirthDate = user.fecha_nacimiento ? new Date(`${user.fecha_nacimiento}T12:00:00`) : new Date(2000, 0, 1);
    const parsedBirthTime = user.hora_nacimiento ? new Date(`2000-01-01T${user.hora_nacimiento}:00`) : new Date(2000, 0, 1, 12, 0);
    const birthTimeZone = user.timezone_nacimiento
      || inferTimeZoneFromLocationLabel(user.lugar_nacimiento)
      || getDefaultBirthTimeZone();

    setDraft({
      ...user,
      timezone_nacimiento: birthTimeZone,
      prompts: normalizeProfilePrompts(user.prompts),
      edad_min_pref: `${user.edad_min_pref ?? 18}`,
      edad_max_pref: `${user.edad_max_pref ?? 99}`,
      distancia_max_km: `${user.distancia_max_km ?? 50}`,
    });
    setPhotoDrafts(normalizePhotoDrafts(user.fotos));
    setBirthDate(Number.isNaN(parsedBirthDate.getTime()) ? new Date(2000, 0, 1) : parsedBirthDate);
    setBirthTime(Number.isNaN(parsedBirthTime.getTime()) ? new Date(2000, 0, 1, 12, 0) : parsedBirthTime);
  }, [user]);

  const heroPhotos = useMemo(() => photoDrafts
    .filter(Boolean)
    .map((item) => item.remoteUrl || item.uri)
    .filter(Boolean), [photoDrafts]);

  if (!user || !draft) {
    return null;
  }

  const updateField = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

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

  const saveProfile = async () => {
    if (Number(draft.edad_min_pref) > Number(draft.edad_max_pref)) {
      Alert.alert('Error', 'El rango de edad no es valido.');
      return;
    }

    if (usesExpandedOrientationStep(draft.genero) && !draft.orientacion_sexual) {
      Alert.alert('Error', 'Elige tu orientacion antes de guardar el perfil.');
      return;
    }

    setSaving(true);
    try {
      const uploadedDrafts = await uploadDraftPhotos({
        drafts: photoDrafts,
        userId: user.id,
        request: apiFetch,
        onDraftsChange: setPhotoDrafts,
      });

      const response = await apiFetch(`/perfil/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...draft,
          prompts: compactProfilePrompts(draft.prompts),
          fotos: extractPhotoUrls(uploadedDrafts),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        Alert.alert('Error', data.mensaje || 'No se pudo guardar el perfil.');
        return;
      }

      setUser(data.usuario);
      setPhotoDrafts(normalizePhotoDrafts(data.usuario?.fotos));
      await refreshUser();
      Alert.alert('Perfil actualizado', 'Tus cambios ya quedaron guardados.');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo actualizar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <ProfilePhotoCarousel photos={heroPhotos.length ? heroPhotos : [draft.foto].filter(Boolean)} height={260} borderRadius={18} />
        <Text style={styles.heroTitle}>{draft.nombre}</Text>
        <Text style={styles.heroSubtitle}>{`${draft.signo_zodiacal || 'Signo pendiente'} | ${draft.generacion || 'Generacion pendiente'}`}</Text>
        <Text style={styles.heroMeta}>{`${draft.intencion || 'Intencion pendiente'} | ${draft.ubicacion || 'Ubicacion pendiente'}`}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Identidad y perfil publico</Text>
        <TextInput style={styles.input} value={draft.nombre} onChangeText={(value) => updateField('nombre', value)} placeholder="Nombre" placeholderTextColor="#666" />
        <Text style={styles.selectionHelper}>Elige como quieres presentarte dentro de SYNCRONOS.</Text>
        <View style={styles.selectionGrid}>
          {GENDER_OPTIONS.map((item) => (
            <SelectionTile
              key={item.value}
              label={item.label}
              description={item.description}
              active={draft.genero === item.value}
              onPress={() => {
                updateField('genero', item.value);
                if (!usesExpandedOrientationStep(item.value)) {
                  updateField('orientacion_sexual', '');
                }
              }}
            />
          ))}
        </View>
        {usesExpandedOrientationStep(draft.genero) ? (
          <>
            <Text style={styles.selectionHelper}>Cuentanos tambien como quieres definir tu orientacion sexual.</Text>
            <View style={styles.selectionGrid}>
              {ORIENTATION_OPTIONS.map((item) => (
                <SelectionTile
                  key={item.value}
                  label={item.label}
                  description={item.description}
                  active={draft.orientacion_sexual === item.value}
                  onPress={() => updateField('orientacion_sexual', item.value)}
                />
              ))}
            </View>
          </>
        ) : null}
        <TouchableOpacity style={styles.dateInput} onPress={() => setShowBirthDatePicker(true)} activeOpacity={0.85}>
          <Text style={draft.fecha_nacimiento ? styles.dateValue : styles.datePlaceholder}>{formatDateLabel(draft.fecha_nacimiento)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateInput} onPress={() => setShowBirthTimePicker(true)} activeOpacity={0.85}>
          <Text style={draft.hora_nacimiento ? styles.dateValue : styles.datePlaceholder}>{formatTimeLabel(draft.hora_nacimiento)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateInput} onPress={() => setShowBirthPlaceSelector(true)} activeOpacity={0.85}>
          <Text style={draft.lugar_nacimiento ? styles.dateValue : styles.datePlaceholder}>
            {formatLocationLabel(draft.lugar_nacimiento, 'Selecciona tu lugar de nacimiento')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateInput} onPress={() => setShowBirthTimezoneSelector(true)} activeOpacity={0.85}>
          <Text style={draft.timezone_nacimiento ? styles.dateValue : styles.datePlaceholder}>
            {formatTimeZoneLabel(draft.timezone_nacimiento)}
          </Text>
        </TouchableOpacity>
        <TextInput style={styles.input} value={draft.bio} onChangeText={(value) => updateField('bio', value)} placeholder="Bio" placeholderTextColor="#666" multiline />
        <TextInput style={styles.input} value={draft.ocupacion} onChangeText={(value) => updateField('ocupacion', value)} placeholder="Ocupacion" placeholderTextColor="#666" />
        <TextInput style={styles.input} value={draft.educacion} onChangeText={(value) => updateField('educacion', value)} placeholder="Educacion" placeholderTextColor="#666" />
        <TextInput style={styles.input} value={draft.gustos} onChangeText={(value) => updateField('gustos', value)} placeholder="Gustos" placeholderTextColor="#666" />
        <TouchableOpacity style={styles.dateInput} onPress={() => setShowCurrentLocationSelector(true)} activeOpacity={0.85}>
          <Text style={draft.ubicacion ? styles.dateValue : styles.datePlaceholder}>
            {formatLocationLabel(draft.ubicacion, 'Selecciona tu ciudad actual')}
          </Text>
        </TouchableOpacity>

        <PhotoSlotsEditor
          title="Fotos reales"
          helperText="Puedes actualizar tus fotos desde la galeria o la camara. Si una foto recibe varios reportes, se ocultara del feed."
          photos={photoDrafts}
          onChange={setPhotoDrafts}
          disabled={saving}
          moderatedUrls={draft.fotos_moderadas || []}
        />

        <ProfilePromptsEditor
          title="Tus datos curiosos"
          helperText="Cuentanos algunos datos para conocerte mejor."
          prompts={draft.prompts}
          onChange={(value) => updateField('prompts', value)}
          disabled={saving}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Filtros</Text>
        <View style={styles.inlineRow}>
          <TextInput style={[styles.input, styles.halfInput]} value={draft.edad_min_pref} onChangeText={(value) => updateField('edad_min_pref', value)} placeholder="Edad min" placeholderTextColor="#666" keyboardType="numeric" />
          <TextInput style={[styles.input, styles.halfInput]} value={draft.edad_max_pref} onChangeText={(value) => updateField('edad_max_pref', value)} placeholder="Edad max" placeholderTextColor="#666" keyboardType="numeric" />
        </View>
        <TextInput style={styles.input} value={draft.distancia_max_km} onChangeText={(value) => updateField('distancia_max_km', value)} placeholder="Distancia maxima" placeholderTextColor="#666" keyboardType="numeric" />
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Mostrar edad en tu perfil</Text>
          <Switch value={!!draft.mostrar_edad} onValueChange={(value) => updateField('mostrar_edad', value)} thumbColor="#D4AF37" trackColor={{ false: '#333', true: '#4a4120' }} />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Mostrar distancia</Text>
          <Switch value={!!draft.mostrar_distancia} onValueChange={(value) => updateField('mostrar_distancia', value)} thumbColor="#D4AF37" trackColor={{ false: '#333', true: '#4a4120' }} />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Perfil visible en el radar</Text>
          <Switch value={!!draft.perfil_activo} onValueChange={(value) => updateField('perfil_activo', value)} thumbColor="#D4AF37" trackColor={{ false: '#333', true: '#4a4120' }} />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Permitir filtros por ubicacion</Text>
          <Switch value={!!draft.consentimiento_ubicacion} onValueChange={(value) => updateField('consentimiento_ubicacion', value)} thumbColor="#D4AF37" trackColor={{ false: '#333', true: '#4a4120' }} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Carta astral</Text>
        <Text style={styles.infoLine}>{`Zona horaria: ${formatTimeZoneLabel(draft.timezone_nacimiento)}`}</Text>
        <Text style={styles.infoLine}>{`Luna: ${draft.luna || 'Desconocido'}`}</Text>
        <Text style={styles.infoLine}>{`Ascendente: ${draft.ascendente || 'Desconocido'}`}</Text>
        <Text style={styles.infoLine}>{`Venus: ${draft.venus || 'Desconocido'}`}</Text>
        <Text style={styles.infoLine}>{`Marte: ${draft.marte || 'Desconocido'}`}</Text>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={saveProfile} disabled={saving}>
        <Text style={styles.saveText}>{saving ? 'Guardando...' : 'Guardar cambios'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Cerrar sesion</Text>
      </TouchableOpacity>

      <AstralPickerModal
        visible={showBirthDatePicker}
        mode="date"
        value={birthDate}
        title="Actualiza tu fecha de nacimiento"
        helperText="Ajusta la fecha para mantener correctos tu carta astral y tus calculos de afinidad."
        onClose={() => setShowBirthDatePicker(false)}
        onConfirm={(selectedDate) => {
          setBirthDate(selectedDate);
          updateField('fecha_nacimiento', formatDate(selectedDate));
        }}
      />

      <AstralPickerModal
        visible={showBirthTimePicker}
        mode="time"
        value={birthTime}
        title="Actualiza tu hora de nacimiento"
        helperText="La hora precisa mejora la lectura de luna, ascendente, Venus y Marte."
        onClose={() => setShowBirthTimePicker(false)}
        onConfirm={(selectedTime) => {
          setBirthTime(selectedTime);
          updateField('hora_nacimiento', formatTime(selectedTime));
        }}
      />

      <LocationSelectorModal
        visible={showBirthPlaceSelector}
        title="Actualiza tu lugar de nacimiento"
        helperText="Selecciona la ciudad que mejor represente tu origen para refinar tu perfil astral."
        placeholder="Ejemplo: Cali, Colombia"
        currentValue={draft.lugar_nacimiento}
        onClose={() => setShowBirthPlaceSelector(false)}
        onSelect={(location) => {
          updateField('lugar_nacimiento', location.label);
          updateField('latitud_nacimiento', location.latitude);
          updateField('longitud_nacimiento', location.longitude);
          const inferredTimezone = inferTimeZoneFromLocationLabel(location.label);
          if (inferredTimezone) {
            updateField('timezone_nacimiento', inferredTimezone);
          }
        }}
      />

      <TimeZoneSelectorModal
        visible={showBirthTimezoneSelector}
        title="Actualiza tu zona horaria de nacimiento"
        helperText="La hora y la zona correcta hacen que tu lectura astral sea mucho mas precisa."
        currentValue={draft.timezone_nacimiento}
        suggestedValue={inferTimeZoneFromLocationLabel(draft.lugar_nacimiento)}
        onClose={() => setShowBirthTimezoneSelector(false)}
        onSelect={(value) => updateField('timezone_nacimiento', value)}
      />

      <LocationSelectorModal
        visible={showCurrentLocationSelector}
        title="Actualiza tu ubicacion actual"
        helperText="Usa tu ubicacion real o elige una ciudad para tus filtros por distancia."
        placeholder="Ejemplo: Bogota, Colombia"
        currentValue={draft.ubicacion}
        allowCurrentLocation
        currentLocationLabel="Usar mi ubicacion"
        onClose={() => setShowCurrentLocationSelector(false)}
        onSelect={(location) => {
          updateField('ubicacion', location.label);
          updateField('latitud', location.latitude);
          updateField('longitud', location.longitude);
          updateField('consentimiento_ubicacion', true);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050510' },
  content: { padding: 16, paddingBottom: 40 },
  heroCard: {
    backgroundColor: '#0f0f25',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#1a1a3a',
    marginBottom: 20,
  },
  heroTitle: { color: '#fff', fontSize: 28, fontWeight: '700', marginTop: 16 },
  heroSubtitle: { color: '#D4AF37', fontSize: 16, fontWeight: '600', marginTop: 8 },
  heroMeta: { color: '#aaa', fontSize: 14, marginTop: 8 },
  section: {
    backgroundColor: '#0f0f25',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1a1a3a',
    marginBottom: 16,
  },
  sectionTitle: { color: '#D4AF37', fontSize: 16, fontWeight: '700', marginBottom: 14 },
  selectionHelper: {
    color: '#b7b7c9',
    lineHeight: 20,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#050510',
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1a1a3a',
  },
  dateInput: {
    backgroundColor: '#050510',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a3a',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  datePlaceholder: { color: '#666' },
  dateValue: { color: '#fff' },
  inlineRow: { flexDirection: 'row', gap: 10 },
  selectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
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
  halfInput: { flex: 1 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
  },
  toggleLabel: { color: '#fff', flex: 1, lineHeight: 20 },
  infoLine: { color: '#fff', marginBottom: 8, lineHeight: 20 },
  saveButton: {
    backgroundColor: '#D4AF37',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveText: { color: '#050510', fontSize: 16, fontWeight: '700' },
  logoutButton: {
    backgroundColor: '#171736',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#2a2a4c',
  },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
