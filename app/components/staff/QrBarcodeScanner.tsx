import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppColors } from '../../../constants/colors';
import ScanResultModal from './ScanResultModal';
import {
  lookupTicketScan,
  markTicketAsUsed,
  type TicketScanEvaluation,
} from '../../../lib/ticketScan';
import { useTranslation } from '../../context/LocaleContext';
import { AppText as Text } from '@/components/ui/AppText';

const SCAN_DEBOUNCE_MS = 2500;

type Props = {
  onClose: () => void;
};

export default function QrBarcodeScanner({ onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const frameSize = Math.min(width - 72, 300);

  const [permission, requestPermission] = useCameraPermissions();
  const [paused, setPaused] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [using, setUsing] = useState(false);
  const [evaluation, setEvaluation] = useState<TicketScanEvaluation | null>(null);
  const lastScanRef = useRef<{ value: string; at: number } | null>(null);

  useEffect(() => {
    if (!permission?.granted) {
      void requestPermission();
    }
  }, [permission?.granted, requestPermission]);

  const resumeScanning = useCallback(() => {
    setModalVisible(false);
    setEvaluation(null);
    setLoading(false);
    setUsing(false);
    setPaused(false);
  }, []);

  const handleScan = useCallback(async (raw: string) => {
    const value = raw.trim();
    if (!value || paused) return;

    const now = Date.now();
    const last = lastScanRef.current;
    if (last && last.value === value && now - last.at < SCAN_DEBOUNCE_MS) {
      return;
    }
    lastScanRef.current = { value, at: now };

    setPaused(true);
    setModalVisible(true);
    setLoading(true);
    setEvaluation(null);

    const result = await lookupTicketScan(value);
    setEvaluation(result);
    setLoading(false);
  }, [paused]);

  const handleUse = useCallback(async () => {
    if (!evaluation?.ticket || !evaluation.canUse) return;
    setUsing(true);
    try {
      await markTicketAsUsed(evaluation.ticket.id);
      resumeScanning();
    } catch {
      setEvaluation({
        status: 'error',
        ticket: evaluation.ticket,
        title: t('usageFailed'),
        message: t('usageFailedMessage'),
        canUse: false,
      });
      setUsing(false);
    }
  }, [evaluation, resumeScanning, t]);

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.centered, { padding: 24 }]}>
        <Text style={styles.permissionText}>
          {t('cameraPermissionRequired')}
        </Text>
        <Pressable style={styles.permissionBtn} onPress={() => void requestPermission()}>
          <Text style={styles.permissionBtnText}>{t('grantPermission')}</Text>
        </Pressable>
        <Pressable style={styles.closeGhost} onPress={onClose}>
          <Text style={styles.closeGhostText}>{t('close')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={paused ? undefined : (event) => {
          void handleScan(event.data);
        }}
      />

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.dimTop} />
        <View style={styles.middleRow}>
          <View style={styles.dimSide} />
          <View style={{ width: frameSize, height: frameSize }}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.dimSide} />
        </View>
        <View style={styles.dimBottom}>
          <Text style={styles.hint}>
            {t('scanQrHint')}
          </Text>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>Kapat</Text>
        </Pressable>
      </View>

      <ScanResultModal
        visible={modalVisible}
        evaluation={evaluation}
        loading={loading}
        using={using}
        onCancel={resumeScanning}
        onUse={() => void handleUse()}
      />
    </View>
  );
}

const CORNER = 28;
const STROKE = 4;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  dimTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  middleRow: {
    flexDirection: 'row',
  },
  dimSide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  dimBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: '#fff',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: STROKE,
    borderLeftWidth: STROKE,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: STROKE,
    borderRightWidth: STROKE,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: STROKE,
    borderLeftWidth: STROKE,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: STROKE,
    borderRightWidth: STROKE,
  },
  hint: {
    color: '#fff',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  closeBtn: {
    backgroundColor: AppColors.accent,
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'PoppinsBold',
  },
  permissionText: {
    color: '#fff',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  permissionBtn: {
    backgroundColor: AppColors.accent,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 12,
  },
  permissionBtnText: {
    color: '#fff',
    fontFamily: 'PoppinsBold',
  },
  closeGhost: {
    padding: 8,
  },
  closeGhostText: {
    color: 'rgba(255,255,255,0.8)',
  },
});
