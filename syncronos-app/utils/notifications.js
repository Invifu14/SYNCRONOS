import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const getExpoProjectId = () => (
  Constants.easConfig?.projectId
  ?? Constants.expoConfig?.extra?.eas?.projectId
  ?? Constants.expoConfig?.extra?.projectId
  ?? null
);

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Mensajes',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D4AF37',
      showBadge: true,
    });
  }

  if (!Device.isDevice) {
    return { token: null, reason: 'Las push remotas necesitan un dispositivo fisico.' };
  }

  const existing = await Notifications.getPermissionsAsync();
  let finalStatus = existing.status;
  if (finalStatus !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== 'granted') {
    return { token: null, reason: 'Permiso de notificaciones denegado.' };
  }

  const projectId = getExpoProjectId();
  if (!projectId) {
    return { token: null, reason: 'Falta el projectId de Expo/EAS para push remotas.' };
  }

  const pushToken = await Notifications.getExpoPushTokenAsync({ projectId });
  return { token: pushToken.data, reason: null };
}
