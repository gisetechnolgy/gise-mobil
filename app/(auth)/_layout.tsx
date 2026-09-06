import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Auth ekranları kendi ImageBackground'larını kullanır;
        // boş bir koyu arka plan flash önleme için yeter.
        contentStyle: { backgroundColor: '#0a0a14' },
        // iOS soldan sağa swipe; Android'de native back gesture.
        animation: 'slide_from_right',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        // Ekranın her yerinden (sadece kenar değil) swipe back yapılabilsin.
        fullScreenGestureEnabled: true,
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="sso" />
    </Stack>
  );
}
