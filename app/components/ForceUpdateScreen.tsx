import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppColors } from '../../constants/colors';
import {
  openStoreUpdate,
  resolveMandatoryUpdate,
  type UpdateRequirement,
} from '../../lib/mandatoryUpdate';
import { t } from '../../lib/i18n';
import { AppText as Text } from '@/components/ui/AppText';

type Props = {
  requirement: UpdateRequirement;
  onRequirementChange: (req: UpdateRequirement) => void;
};

export default function ForceUpdateScreen({
  requirement,
  onRequirementChange,
}: Props) {
  const insets = useSafeAreaInsets();
  const softShownRef = useRef(false);
  const [softDismissed, setSoftDismissed] = useState(false);

  const recheck = useCallback(async () => {
    const next = await resolveMandatoryUpdate();
    onRequirementChange(next);
    if (next.kind !== 'soft') {
      softShownRef.current = false;
      setSoftDismissed(false);
    }
  }, [onRequirementChange]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void recheck();
    });
    return () => sub.remove();
  }, [recheck]);

  useEffect(() => {
    if (requirement.kind === 'soft' && !softShownRef.current) {
      softShownRef.current = true;
      setSoftDismissed(false);
    }
  }, [requirement]);

  const blocking =
    requirement.kind === 'force' || requirement.kind === 'maintenance';
  const softVisible =
    requirement.kind === 'soft' && !softDismissed;

  if (!blocking && !softVisible) return null;

  const isMaintenance = requirement.kind === 'maintenance';
  const storeUrl =
    requirement.kind === 'force' || requirement.kind === 'soft'
      ? requirement.storeUrl
      : '';
  const releaseNotes =
    requirement.kind === 'force' || requirement.kind === 'soft'
      ? requirement.releaseNotes
      : [];

  const title = isMaintenance
    ? t('maintenanceTitle')
    : requirement.kind === 'force'
      ? t('forceUpdateTitle')
      : t('softUpdateTitle');

  const message = isMaintenance
    ? requirement.message
    : requirement.kind === 'force'
      ? t('forceUpdateMessage')
      : t('softUpdateMessage');

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={[styles.overlay, { paddingTop: insets.top + 24 }]}>
        <View style={[styles.card, { marginBottom: Math.max(insets.bottom, 24) }]}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {releaseNotes.length > 0 ? (
            <ScrollView
              style={styles.notesScroll}
              contentContainerStyle={styles.notesContent}
            >
              {releaseNotes.map((note, index) => (
                <Text key={`${note}-${index}`} style={styles.noteItem}>
                  • {note}
                </Text>
              ))}
            </ScrollView>
          ) : null}

          {!isMaintenance ? (
            <Pressable
              onPress={() => openStoreUpdate(storeUrl)}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>
                {requirement.kind === 'force'
                  ? t('forceUpdateButton')
                  : t('softUpdateNow')}
              </Text>
            </Pressable>
          ) : null}

          {requirement.kind === 'soft' ? (
            <Pressable
              onPress={() => setSoftDismissed(true)}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryBtnText}>{t('softUpdateLater')}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 33, 55, 0.72)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  title: {
    color: AppColors.heading,
    fontFamily: 'PoppinsBold',
    fontSize: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    color: AppColors.cardText,
    fontFamily: 'PoppinsRegular',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  notesScroll: {
    maxHeight: 140,
    marginTop: 14,
  },
  notesContent: {
    gap: 6,
  },
  noteItem: {
    color: 'rgba(52, 61, 72, 0.8)',
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    lineHeight: 18,
  },
  primaryBtn: {
    marginTop: 22,
    backgroundColor: AppColors.accent,
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: AppColors.navText,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 16,
  },
  secondaryBtn: {
    marginTop: 10,
    borderRadius: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: AppColors.cardText,
    fontFamily: 'PoppinsMedium',
    fontSize: 15,
  },
});
