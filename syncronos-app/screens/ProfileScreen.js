import React, { useContext } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppContext } from '../context/AppContext';

function ProfileField({ label, value }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || 'Pendiente por completar'}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, setUser } = useContext(AppContext);

  if (!user) {
    return null;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>{user.nombre}</Text>
        <Text style={styles.heroSubtitle}>
          {user.signo_zodiacal || 'Signo pendiente'} - {user.generacion || 'Generacion pendiente'}
        </Text>
        <Text style={styles.heroMeta}>
          {user.intencion || 'Intencion pendiente'} - {user.ubicacion || 'Ubicacion pendiente'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Identidad</Text>
        <ProfileField label="Fecha de nacimiento" value={user.fecha_nacimiento} />
        <ProfileField label="Hora de nacimiento" value={user.hora_nacimiento} />
        <ProfileField label="Lugar de nacimiento" value={user.lugar_nacimiento} />
        <ProfileField label="Genero" value={user.genero} />
        <ProfileField label="Interes" value={user.genero_interes} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Carta astral</Text>
        <ProfileField label="Luna" value={user.luna} />
        <ProfileField label="Ascendente" value={user.ascendente} />
        <ProfileField label="Venus" value={user.venus} />
        <ProfileField label="Marte" value={user.marte} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferencias</Text>
        <ProfileField label="Gustos" value={user.gustos} />
        <ProfileField label="Correo" value={user.correo} />
        <ProfileField label="Telefono" value={user.telefono} />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={() => setUser(null)}>
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
  field: { marginBottom: 12 },
  fieldLabel: { color: '#7f7f99', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  fieldValue: { color: '#fff', fontSize: 15, marginTop: 4, lineHeight: 21 },
  logoutButton: {
    backgroundColor: '#D4AF37',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutText: { color: '#050510', fontSize: 16, fontWeight: '700' },
});
