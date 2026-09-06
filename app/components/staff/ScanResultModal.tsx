import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { AppColors } from '../../../constants/colors';
import {
  formatTicketDateLong,
  formatTicketTime,
} from '../../../lib/tickets';
import type { TicketScanEvaluation } from '../../../lib/ticketScan';
import { AppText as Text } from '@/components/ui/AppText';

type Props = {
  visible: boolean;
  evaluation: TicketScanEvaluation | null;
  loading: boolean;
  using: boolean;
  onCancel: () => void;
  onUse?: () => void;
};

function statusColor(status: TicketScanEvaluation['status'] | undefined) {
  switch (status) {
    case 'valid':
      return '#1B8A4A';
    case 'already_used':
    case 'past_event':
      return '#C47A00';
    case 'not_found':
    case 'error':
    default:
      return '#C0392B';
  }
}

function statusIcon(status: TicketScanEvaluation['status'] | undefined) {
  switch (status) {
    case 'valid':
      return 'checkmark-circle' as const;
    case 'already_used':
    case 'past_event':
      return 'alert-circle' as const;
    default:
      return 'close-circle' as const;
  }
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value || value === '—') return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function ScanResultModal({
  visible,
  evaluation,
  loading,
  using,
  onCancel,
  onUse,
}: Props) {
  const ticket = evaluation?.ticket;
  const color = statusColor(evaluation?.status);
  const canUse = evaluation?.canUse === true && !loading && !using;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={AppColors.accent} size="large" />
              <Text style={styles.loadingText}>Bilet sorgulanıyor…</Text>
            </View>
          ) : evaluation ? (
            <>
              <View style={[styles.statusBadge, { backgroundColor: `${color}18` }]}>
                <Ionicons name={statusIcon(evaluation.status)} size={28} color={color} />
                <Text style={[styles.statusTitle, { color }]}>{evaluation.title}</Text>
              </View>

              <Text style={styles.message}>{evaluation.message}</Text>

              {ticket ? (
                <View style={styles.detailsBox}>
                  <InfoRow label="Etkinlik" value={ticket.eventTitle} />
                  <InfoRow label="Bilet" value={ticket.ticketLabel} />
                  <InfoRow label="PNR" value={ticket.ticketNo} />
                  {ticket.eventDate ? (
                    <InfoRow
                      label="Tarih"
                      value={`${formatTicketDateLong(ticket.eventDate)} ${formatTicketTime(ticket.eventDate)}`}
                    />
                  ) : null}
                  {ticket.venueName ? (
                    <InfoRow label="Mekan" value={ticket.venueName} />
                  ) : null}
                  <View style={styles.divider} />
                  <InfoRow label="Ad Soyad" value={ticket.holderName} />
                  <InfoRow label="E-posta" value={ticket.holderEmail ?? ''} />
                  <InfoRow label="Telefon" value={ticket.holderPhone ?? ''} />
                </View>
              ) : null}

              <View style={styles.actions}>
                {canUse ? (
                  <>
                    <Pressable
                      style={[styles.btn, styles.btnSecondary]}
                      onPress={onCancel}
                      disabled={using}
                    >
                      <Text style={styles.btnSecondaryText}>İptal</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.btn, styles.btnPrimary, using && styles.btnDisabled]}
                      onPress={onUse}
                      disabled={using}
                    >
                      {using ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.btnPrimaryText}>Kullan</Text>
                      )}
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    style={[styles.btn, styles.btnPrimary, styles.btnFull]}
                    onPress={onCancel}
                    disabled={using}
                  >
                    <Text style={styles.btnPrimaryText}>İptal</Text>
                  </Pressable>
                )}
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 12,
  },
  loadingText: {
    color: AppColors.cardText,
    fontSize: 15,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusTitle: {
    flex: 1,
    fontSize: 17,
    fontFamily: 'PoppinsBold',
  },
  message: {
    color: 'rgba(25,58,88,0.8)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  detailsBox: {
    backgroundColor: '#F7F7F8',
    borderRadius: 14,
    padding: 14,
    gap: 8,
    marginBottom: 16,
  },
  infoRow: {
    gap: 2,
  },
  infoLabel: {
    color: 'rgba(25,58,88,0.55)',
    fontSize: 12,
  },
  infoValue: {
    color: AppColors.cardText,
    fontSize: 14,
    fontFamily: 'PoppinsMedium',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnFull: {
    flex: 1,
  },
  btnPrimary: {
    backgroundColor: AppColors.accent,
  },
  btnSecondary: {
    backgroundColor: '#E8E8EA',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'PoppinsBold',
  },
  btnSecondaryText: {
    color: AppColors.cardText,
    fontSize: 15,
    fontFamily: 'PoppinsBold',
  },
});
