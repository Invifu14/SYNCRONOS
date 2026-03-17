import React, { useState } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AuthScreen from './screens/AuthScreen';
import MainScreen from './screens/MainScreen';
import SuggestionsScreen from './screens/SuggestionsScreen';
import VaultScreen from './screens/VaultScreen';
import ProfileScreen from './screens/ProfileScreen';
import { AppContext } from './context/AppContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Radar"
      screenOptions={{
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
        tabBarActiveTintColor: '#D4AF37',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tab.Screen name="Radar" component={MainScreen} options={{ title: 'Radar' }} />
      <Tab.Screen name="Afinidad" component={SuggestionsScreen} options={{ title: 'Afinidad' }} />
      <Tab.Screen name="Matches" component={VaultScreen} options={{ title: 'Matches' }} />
      <Tab.Screen name="Perfil" component={ProfileScreen} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);

  // Recuerda poner aqui tu IP si pruebas en movil.
  const MI_IP = '192.168.1.2';

  return (
    <AppContext.Provider value={{ user, setUser, MI_IP }}>
      <StatusBar barStyle="light-content" backgroundColor="#050510" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            <Stack.Screen name="Auth" component={AuthScreen} />
          ) : (
            <Stack.Screen name="HomeTabs" component={HomeTabs} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AppContext.Provider>
  );
}
