import React, { useContext, useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppContext } from '../context/AppContext';

export default function ProfileScreen() {
  const { user, baseUrl, setUser, refreshUser, logout } = useContext(AppContext);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setDraft({
        ...user,
        fotos: [...(user.fotos || ['', '', '']), '', ''].slice(0, 3),
        edad_min_pref: `${user.edad_min_pref ?? 18}`,
        edad_max_pref: `${user.edad_max_pref ?? 99}`,
        distancia_max_km: `${user.distancia_max_km ?? 50}`,
      });
    }
  }, [user]);

  if (!user || !draft) {
    return null;
  }

  const updateField = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const updatePhoto = (index, value) => {
    setDraft((current) => ({
      ...current,
      fotos: current.fotos.map((item, position) => (position === index ? value : item)),
    }));
  };

  const saveProfile = async () => {
    if (Number(draft.edad_min_pref) > Number(draft.edad_max_pref)) {
      Alert.alert('Error', 'El rango de edad no es valido.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${baseUrl}/perfil/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          fotos: draft.fotos.filter(Boolean),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        Alert.alert('Error', data.mensaje || 'No se pudo guardar el perfil.');
        return;
      }
      setUser(data.usuario);
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
        {draft.foto ? <Image source={{ uri: draft.foto }} style={styles.heroImage} /> : null}
        <Text style={styles.heroTitle}>{draft.nombre}</Text>
        <Text style={styles.heroSubtitle}>{draft.signo_zodiacal || 'Signo pendiente'} · {draft.generacion || 'Generacion pendiente'}</Text>
        <Text style={styles.heroMeta}>{draft.intencion || 'Intencion pendiente'} · {draft.ubicacion || 'Ubicacion pendiente'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Identidad y perfil publico</Text>
        <TextInput style={styles.input} value={draft.nombre} onChangeText={(value) => updateField('nombre', value)} placeholder="Nombre" placeholderTextColor="#666" />
        <TextInput style={styles.input} value={draft.bio} onChangeText={(value) => updateField('bio', value)} placeholder="Bio" placeholderTextColor="#666" multiline />
        <TextInput style={styles.input} value={draft.ocupacion} onChangeText={(value) => updateField('ocupacion', value)} placeholder="Ocupacion" placeholderTextColor="#666" />
        <TextInput style={styles.input} value={draft.educacion} onChangeText={(value) => updateField('educacion', value)} placeholder="Educacion" placeholderTextColor="#666" />
        <TextInput style={styles.input} value={draft.gustos} onChangeText={(value) => updateField('gustos', value)} placeholder="Gustos" placeholderTextColor="#666" />
        <TextInput style={styles.input} value={draft.ubicacion} onChangeText={(value) => updateField('ubicacion', value)} placeholder="Ciudad" placeholderTextColor="#666" />
        {draft.fotos.map((foto, index) => (
          <TextInput
            key={`foto-profile-${index}`}
            style={styles.input}
            value={foto}
            onChangeText={(value) => updatePhoto(index, value)}
            placeholder={`URL de foto ${index + 1}`}
            placeholderTextColor="#666"
            autoCapitalize="none"
          />
        ))}
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
        <Text style={styles.infoLine}>Luna: {draft.luna || 'Desconocido'}</Text>
        <Text style={styles.infoLine}>Ascendente: {draft.ascendente || 'Desconocido'}</Text>
        <Text style={styles.infoLine}>Venus: {draft.venus || 'Desconocido'}</Text>
        <Text style={styles.infoLine}>Marte: {draft.marte || 'Desconocido'}</Text>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={saveProfile} disabled={saving}>
        <Text style={styles.saveText}>{saving ? 'Guardando...' : 'Guardar cambios'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Cerrar sesion</Text>
      </TouchableOpacity>
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
  heroImage: { width: '100%', height: 220, borderRadius: 18, marginBottom: 16 },
  heroTitle: { color: '#fff', fontSize: 28, fontWeight: '700' },
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
  inlineRow: { flexDirection: 'row', gap: 10 },
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
