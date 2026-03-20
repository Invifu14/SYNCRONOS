import React from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { createPhotoDraftFromAsset, getPhotoDraftUri } from '../utils/photos';

function PhotoSlotCard({ item, index, onChange, disabled, moderated }) {
  const uri = getPhotoDraftUri(item);

  const openLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galeria para elegir una foto real.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.85,
    });

    if (!result.canceled && result.assets?.[0]) {
      onChange(index, createPhotoDraftFromAsset(result.assets[0]));
    }
  };

  const openCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a la camara para tomar una foto.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.85,
    });

    if (!result.canceled && result.assets?.[0]) {
      onChange(index, createPhotoDraftFromAsset(result.assets[0]));
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.preview}>
        {uri ? (
          <Image source={{ uri }} style={styles.previewImage} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Foto {index + 1}</Text>
          </View>
        )}

        {item?.uploading ? (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator color="#D4AF37" />
            <Text style={styles.uploadingText}>Subiendo...</Text>
          </View>
        ) : null}

        {moderated ? (
          <View style={styles.moderationBadge}>
            <Text style={styles.moderationBadgeText}>Oculta por moderacion</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={openLibrary} disabled={disabled || item?.uploading}>
          <Text style={styles.actionButtonText}>Galeria</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={openCamera} disabled={disabled || item?.uploading}>
          <Text style={styles.actionButtonText}>Camara</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.removeButton]}
          onPress={() => onChange(index, null)}
          disabled={disabled || item?.uploading || !item}
        >
          <Text style={styles.removeButtonText}>Quitar</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.slotHint}>
        {item?.remoteUrl ? 'Foto lista para mostrarse.' : item ? 'Pendiente de subir al servidor.' : 'Agrega una foto real.'}
      </Text>
    </View>
  );
}

export default function PhotoSlotsEditor({
  title,
  helperText,
  photos,
  onChange,
  disabled = false,
  moderatedUrls = [],
}) {
  const handleChange = (index, nextItem) => {
    const nextPhotos = photos.map((item, currentIndex) => (currentIndex === index ? nextItem : item));
    onChange(nextPhotos);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}

      {photos.map((item, index) => (
        <PhotoSlotCard
          key={`photo-slot-${index}`}
          item={item}
          index={index}
          onChange={handleChange}
          disabled={disabled}
          moderated={Boolean(item?.remoteUrl && moderatedUrls.includes(item.remoteUrl))}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  title: {
    color: '#D4AF37',
    fontWeight: '700',
    marginBottom: 8,
  },
  helperText: {
    color: '#a0a0b8',
    lineHeight: 20,
    marginBottom: 12,
  },
  card: {
    marginBottom: 14,
  },
  preview: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0a0a18',
    borderWidth: 1,
    borderColor: '#1a1a3a',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f25',
  },
  placeholderText: {
    color: '#8f8fa8',
    fontSize: 16,
    fontWeight: '700',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 5, 16, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  uploadingText: {
    color: '#fff',
    fontWeight: '700',
  },
  moderationBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(120, 24, 24, 0.9)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  moderationBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#171736',
    borderWidth: 1,
    borderColor: '#2a2a4c',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  removeButton: {
    backgroundColor: '#24131a',
    borderColor: '#4a202b',
  },
  removeButtonText: {
    color: '#ffbfc9',
    fontWeight: '700',
  },
  slotHint: {
    color: '#8f8fa8',
    marginTop: 8,
    lineHeight: 18,
  },
});
