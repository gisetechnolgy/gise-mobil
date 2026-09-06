import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppColors } from '../../../constants/colors';
import {
  lookupTicketByPnr,
  markTicketAsUsed,
  type TicketScanEvaluation,
} from '../../../lib/ticketScan';
import ScanResultModal from './ScanResultModal';
import { useTranslation } from '../../context/LocaleContext';
import { AppText as Text } from '@/components/ui/AppText';

export default function StaffScanHome() {
  const router = useRouter();
  const { t } = useTranslation();
  const [pnr, setPnr] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [using, setUsing] = useState(false);
  const [evaluation, setEvaluation] = useState<TicketScanEvaluation | null>(null);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setEvaluation(null);
    setLoading(false);
    setUsing(false);
  }, []);

  const checkPnr = useCallback(async () => {
    const trimmed = pnr.trim();
    if (!trimmed) return;
    Keyboard.dismiss();
    setModalVisible(true);
    setLoading(true);
    setEvaluation(null);
    const result = await lookupTicketByPnr(trimmed);
    setEvaluation(result);
    setLoading(false);
  }, [pnr]);

  const handleUse = useCallback(async () => {
    if (!evaluation?.ticket || !evaluation.canUse) return;
    setUsing(true);
    try {
      await markTicketAsUsed(evaluation.ticket.id);
      closeModal();
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
  }, [evaluation, closeModal, t]);

  const canCheck = pnr.trim().length > 0 && !loading;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Text style={styles.pageTitle}>{t('scanTicket')}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('ticketVerification')}</Text>

        <TextInput
          value={pnr}
          onChangeText={setPnr}
          placeholder={t('enterPnr')}
          placeholderTextColor="rgba(25,58,88,0.45)"
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.input}
          returnKeyType="search"
          onSubmitEditing={() => {
            if (canCheck) void checkPnr();
          }}
        />

        <Pressable
          style={[styles.pnrBtn, !canCheck && styles.pnrBtnDisabled]}
          onPress={() => void checkPnr()}
          disabled={!canCheck}
        >
          {loading && modalVisible ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.pnrBtnText}>{t('pnrCheck')}</Text>
          )}
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          style={styles.qrBtn}
          onPress={() => router.push('/admin/scan-qr')}
        >
          <Ionicons name="qr-code-outline" size={42} color="#fff" />
          <Text style={styles.qrBtnText}>QR Okut</Text>
        </Pressable>
      </View>

      <ScanResultModal
        visible={modalVisible}
        evaluation={evaluation}
        loading={loading}
        using={using}
        onCancel={closeModal}
        onUse={() => void handleUse()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AppColors.background,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  pageTitle: {
    textAlign: 'center',
    fontSize: 20,
    fontFamily: 'PoppinsBold',
    color: AppColors.cardText,
    marginTop: 8,
    marginBottom: 18,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    gap: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'PoppinsBold',
    color: AppColors.cardText,
  },
  input: {
    backgroundColor: '#EFEFEF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: AppColors.cardText,
    fontFamily: 'PoppinsRegular',
  },
  pnrBtn: {
    backgroundColor: '#B8B8B8',
    borderRadius: 10,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pnrBtnDisabled: {
    opacity: 0.65,
  },
  pnrBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'PoppinsBold',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: 4,
  },
  qrBtn: {
    backgroundColor: AppColors.accent,
    borderRadius: 14,
    minHeight: 130,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  qrBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'PoppinsBold',
  },
});
