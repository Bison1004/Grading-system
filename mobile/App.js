import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import CameraScreen from './src/screens/CameraScreen';
import AnswerKeyScreen from './src/screens/AnswerKeyScreen';
import ResultScreen from './src/screens/ResultScreen';
import HistoryScreen from './src/screens/HistoryScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#2563EB',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 18,
            },
            headerShadowVisible: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: '📝 영어시험 채점' }}
          />
          <Stack.Screen
            name="Camera"
            component={CameraScreen}
            options={{ title: '📸 시험지 촬영' }}
          />
          <Stack.Screen
            name="AnswerKey"
            component={AnswerKeyScreen}
            options={{ title: '✏️ 정답 입력' }}
          />
          <Stack.Screen
            name="Result"
            component={ResultScreen}
            options={{ title: '📊 채점 결과' }}
          />
          <Stack.Screen
            name="History"
            component={HistoryScreen}
            options={{ title: '📚 채점 기록' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
