import React, { createContext, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { StatusBar } from 'react-native';

import AuthScreen from './screens/AuthScreen';
import MainScreen from './screens/MainScreen';
import SuggestionsScreen from './screens/SuggestionsScreen';
import VaultScreen from './screens/VaultScreen';

const Stack = createNativeStackNavigator();
const Tab = createMaterialTopTabNavigator();

export const AppContext = createContext();

function HomeTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Main"
      screenOptions={{
        tabBarStyle: { backgroundColor: '#0f0f25' },
        tabBarActiveTintColor: '#D4AF37',
        tabBarInactiveTintColor: '#666',
        tabBarIndicatorStyle: { backgroundColor: '#D4AF37' },
      }}
    >
      <Tab.Screen name="Suggestions" component={SuggestionsScreen} options={{ title: 'Sugerencias' }} />
      <Tab.Screen name="Main" component={MainScreen} options={{ title: 'Principal' }} />
      <Tab.Screen name="Vault" component={VaultScreen} options={{ title: 'Bóveda' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  
  // Recuerda poner aquí tu IP si pruebas en móvil (ej. '192.168.1.113')
  const MI_IP = 'localhost';
  
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