import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import QrBarcodeScanner from '../components/staff/QrBarcodeScanner';

export default function AdminScanQrScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar style="light" />
      <QrBarcodeScanner onClose={() => router.back()} />
    </View>
  );
}
