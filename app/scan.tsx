import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import StaffScanHome from './components/staff/StaffScanHome';
import { useAuth } from './context/AuthContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { AppColors } from '../constants/colors';
import { useIsTablet } from '../lib/responsive';
import { AppText as Text } from "@/components/ui/AppText";
import { TicketQrCode } from '../components/TicketQrCode';
import {
  fetchMyTickets,
  formatTicketDateLong,
  formatTicketTime,
  type TicketItem,
} from '../lib/tickets';

/** Satış modu / bilet QR — consumer tab bar ortasındaki FAB ile açılır. */
export default function ScanScreen() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useRequireAuth('/scan');
  const { user } = useAuth();
  const isTablet = useIsTablet();
  const isStaff = user?.isSaleMode === true;

  const [ticket, setTicket] = useState<TicketItem | null>(null);
  const [loadingTicket, setLoadingTicket] = useState(true);

  const loadMyTicket = useCallback(async () => {
    if (!user) return;
    setLoadingTicket(true);
    try {
      const res = await fetchMyTickets({ userId: user.id, limit: 20 });
      const active = res.items.find((t) => !t.isUsed) ?? res.items[0] ?? null;
      setTicket(active);
    } catch {
      setTicket(null);
    } finally {
      setLoadingTicket(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && user && !isStaff) {
        void loadMyTicket();
      }
    }, [isAuthenticated, user, isStaff, loadMyTicket]),
  );

  if (isLoading || !isAuthenticated || !user) {
    return (
      <SafeAreaView style={styles.loader}>
        <ActivityIndicator color={AppColors.accent} />
      </SafeAreaView>
    );
  }

  if (isStaff) {
    return <StaffScanHome />;
  }

  const qrSize = isTablet ? 248 : 220;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.customerScroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.name}>{user.fullName}</Text>
        <Text style={styles.hint}>Etkinlik girişinde bu QR kodu gösterin.</Text>

        {loadingTicket ? (
          <ActivityIndicator color={AppColors.accent} style={{ marginTop: 24 }} />
        ) : ticket ? (
          <View style={styles.qrCard}>
            <TicketQrCode value={ticket.qrData} size={qrSize} />
            <Text style={styles.eventTitle}>{ticket.eventTitle}</Text>
            {ticket.eventDate ? (
              <Text style={styles.eventDate}>
                {formatTicketDateLong(ticket.eventDate)}{' '}
                {formatTicketTime(ticket.eventDate)}
              </Text>
            ) : null}
            <Text style={styles.pnr}>PNR: {ticket.ticketNo}</Text>
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Aktif biletiniz bulunmuyor.</Text>
            <TouchableOpacity
              onPress={() => router.push('/tickets')}
              style={styles.linkBtn}
            >
              <Text style={styles.linkBtnText}>Biletlerime git</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.background },
  loader: {
    flex: 1,
    backgroundColor: AppColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerScroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 130,
    gap: 10,
  },
  name: {
    color: AppColors.cardText,
    fontSize: 22,
    fontFamily: 'PoppinsBold',
    textAlign: 'center',
  },
  hint: {
    color: 'rgba(25,58,88,0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  qrCard: {
    marginTop: 20,
    backgroundColor: AppColors.cardBg,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    gap: 8,
  },
  eventTitle: {
    color: AppColors.cardText,
    fontSize: 18,
    fontFamily: 'PoppinsBold',
    textAlign: 'center',
    marginTop: 8,
  },
  eventDate: {
    color: 'rgba(25,58,88,0.75)',
    fontSize: 14,
    textAlign: 'center',
  },
  pnr: {
    color: AppColors.cardText,
    fontSize: 14,
    fontFamily: 'PoppinsSemiBold',
    marginTop: 4,
  },
  emptyBox: {
    marginTop: 28,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: 'rgba(25,58,88,0.75)',
    fontSize: 15,
    textAlign: 'center',
  },
  linkBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: AppColors.navBg,
  },
  linkBtnText: {
    color: '#fff',
    fontFamily: 'PoppinsBold',
  },
});
