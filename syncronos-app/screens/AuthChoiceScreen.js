import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AuthChoiceScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>SYNCRONOS</Text>
        <Text style={styles.subtitle}>Conexiones guiadas por fecha de nacimiento, afinidad y conversacion real.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Bienvenido</Text>
        <Text style={styles.helper}>Elige si quieres entrar a tu cuenta o crear una nueva experiencia desde cero.</Text>

        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Auth', { mode: 'login' })}>
          <Text style={styles.primaryButtonText}>Ya tienes cuenta</Text>
          <Text style={styles.primaryButtonHint}>Inicia sesion con tu correo o telefono</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Auth', { mode: 'register' })}>
          <Text style={styles.secondaryButtonText}>No tienes cuenta</Text>
          <Text style={styles.secondaryButtonHint}>Crea tu perfil y entra a SYNCRONOS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050510',
    padding: 22,
    justifyContent: 'center',
  },
  hero: {
    marginBottom: 28,
  },
  logo: {
    color: '#D4AF37',
    fontSize: 42,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: '#a0a0b8',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 18,
  },
  card: {
    backgroundColor: '#0f0f25',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#1a1a3a',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  helper: {
    color: '#b7b7c9',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 12,
    marginBottom: 22,
  },
  primaryButton: {
    backgroundColor: '#D4AF37',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  primaryButtonText: {
    color: '#050510',
    fontSize: 18,
    fontWeight: '800',
  },
  primaryButtonHint: {
    color: '#130E22',
    marginTop: 6,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#171736',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4c',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  secondaryButtonHint: {
    color: '#c8c8da',
    marginTop: 6,
    fontWeight: '600',
  },
});
