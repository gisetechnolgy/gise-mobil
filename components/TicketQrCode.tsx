import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

type Props = {
  /** QR içeriği: yalnızca PNR metni (web e-bilet/PDF ve eski qrserver QR'larıyla aynı). */
  value: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Bilet QR'ı cihazda üretilir; PNR üçüncü tarafa gitmez ve çevrimdışı çalışır.
 * İçerik değişmediği için eski okuyucular / kâğıt biletler / web ile uyumludur.
 */
export function TicketQrCode({ value, size = 220, style }: Props) {
  const data = String(value ?? '').trim();
  return (
    <View style={[styles.box, { width: size, height: size }, style]}>
      {data ? (
        <QRCode value={data} size={size} backgroundColor="#FFFFFF" color="#000000" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
