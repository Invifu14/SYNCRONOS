import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import AuthScreen from './screens/AuthScreen';
import MainScreen from './screens/MainScreen';
import SuggestionsScreen from './screens/SuggestionsScreen';
import VaultScreen from './screens/VaultScreen';
import { AppContext } from './context/AppContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Main"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0f0f25', borderTopWidth: 0 },
        tabBarActiveTintColor: '#D4AF37',
        tabBarInactiveTintColor: '#666',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Suggestions') {
            iconName = focused ? 'planet' : 'planet-outline';
          } else if (route.name === 'Main') {
            iconName = focused ? 'flame' : 'flame-outline';
          } else if (route.name === 'Vault') {
            iconName = focused ? 'lock-closed' : 'lock-closed-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Suggestions" component={SuggestionsScreen} options={{ title: 'Sugerencias' }} />
      <Tab.Screen name="Main" component={MainScreen} options={{ title: 'Radar' }} />
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