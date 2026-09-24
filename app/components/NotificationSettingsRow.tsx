import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { AppColors } from '../../constants/colors';
import { AppText as Text } from '@/components/ui/AppText';
import { useTranslation } from '../context/_LocaleContext';
import {
  disablePushNotifications,
  enablePushNotifications,
  readPushNotificationsEnabled,
} from '../../lib/push-notifications';

type Props = {
  isTablet?: boolean;
};

export default function NotificationSettingsRow({ isTablet = false }: Props) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const on = await readPushNotificationsEnabled();
    setEnabled(on);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const onToggle = async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      if (next) {
        const ok = await enablePushNotifications();
        setEnabled(ok);
        if (!ok) {
          Alert.alert(t('notifications'), t('notificationsPermissionDenied'), [
            { text: t('cancel'), style: 'cancel' },
            {
              text: t('openSettings'),
              onPress: () => {
                void Linking.openSettings();
              },
            },
          ]);
        }
      } else {
        await disablePushNotifications();
        setEnabled(false);
      }
    } catch {
      setEnabled(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.row, isTablet && styles.rowTablet]}>
      <View style={[styles.iconWrap, isTablet && styles.iconWrapTablet]}>
        <Ionicons
          name="notifications-outline"
          size={isTablet ? 24 : 19}
          color={AppColors.cardText}
        />
      </View>
      <Text style={[styles.label, isTablet && styles.labelTablet]}>
        {t('notifications')}
      </Text>
      {busy ? (
        <ActivityIndicator size="small" color={AppColors.cardText} />
      ) : (
        <Switch
          value={enabled}
          onValueChange={(v) => void onToggle(v)}
          disabled={busy}
          trackColor={{
            false: 'rgba(25,58,88,0.2)',
            true: AppColors.accent,
          }}
          thumbColor="#fff"
          ios_backgroundColor="rgba(25,58,88,0.2)"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.cardBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 10,
  },
  rowTablet: {
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginTop: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(25,58,88,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapTablet: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  label: {
    flex: 1,
    marginLeft: 12,
    color: AppColors.cardText,
    fontSize: 15,
    fontFamily: 'PoppinsMedium',
  },
  labelTablet: {
    fontSize: 20,
    marginLeft: 14,
  },
});
