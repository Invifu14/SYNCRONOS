import React, { useContext, useEffect } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import AuthScreen from './screens/AuthScreen';
import AuthChoiceScreen from './screens/AuthChoiceScreen';
import MainScreen from './screens/MainScreen';
import SuggestionsScreen from './screens/SuggestionsScreen';
import VaultScreen from './screens/VaultScreen';
import ProfileScreen from './screens/ProfileScreen';
import ChatScreen from './screens/ChatScreen';
import { AppContext, AppProvider } from './context/AppContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const TAB_ICONS = {
  Radar: { active: 'flame', inactive: 'flame-outline' },
  Afinidad: { active: 'sparkles', inactive: 'sparkles-outline' },
  Conexiones: { active: 'chatbubbles', inactive: 'chatbubbles-outline' },
  Perfil: { active: 'person', inactive: 'person-outline' },
};

const MI_IP = '172.20.10.8';
const BASE_URL = MI_IP === 'localhost' ? 'http://localhost:3000' : `http://${MI_IP}:3000`;

function HomeTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Radar"
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#0f0f25' },
        headerTintColor: '#D4AF37',
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: '#0f0f25',
          borderTopColor: '#1a1a3a',
          height: 68,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = TAB_ICONS[route.name] ?? TAB_ICONS.Radar;
          return <Ionicons name={focused ? icons.active : icons.inactive} size={size ?? 24} color={color} />;
        },
        tabBarActiveTintColor: '#D4AF37',
        tabBarInactiveTintColor: '#666',
      })}
    >
      <Tab.Screen name="Radar" component={MainScreen} />
      <Tab.Screen name="Afinidad" component={SuggestionsScreen} />
      <Tab.Screen name="Conexiones" component={VaultScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user, restoreSession, sessionReady } = useContext(AppContext);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data ?? {};
      const otherUserId = Number(data.otherUserId);
      if (!navigationRef.isReady() || !user || !Number.isFinite(otherUserId)) return;

      navigationRef.navigate('Chat', {
        otherUserId,
        nombre: data.nombre ?? 'Chat',
      });
    });

    return () => {
      subscription.remove();
    };
  }, [user]);

  if (!sessionReady) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#0f0f25' },
          headerTintColor: '#D4AF37',
          contentStyle: { backgroundColor: '#050510' },
        }}
      >
        {!user ? (
          <>
            <Stack.Screen name="AuthChoice" component={AuthChoiceScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
          </>
        ) : (
          <>
            <Stack.Screen name="HomeTabs" component={HomeTabs} options={{ headerShown: false }} />
            <Stack.Screen name="Chat" component={ChatScreen} options={({ route }) => ({ title: route.params?.nombre ?? 'Chat' })} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AppProvider baseUrl={BASE_URL}>
      <StatusBar barStyle="light-content" backgroundColor="#050510" />
      <AppNavigator />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050510',
  },
});
