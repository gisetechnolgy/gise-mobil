import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppColors } from '../../constants/colors';
import { getNotificationHref } from '../../lib/notificationNavigation';
import {
  fetchNotifications,
  markAllNotificationsRead,
  type AppNotification,
} from '../../lib/notifications';
import { useIsTablet } from '../../lib/responsive';
import { useNotificationsPanel } from '../context/NotificationContext';
import { AppText as Text } from "@/components/ui/AppText";

const SCREEN_WIDTH = Dimensions.get('window').width;
const IS_TABLET_LAYOUT = SCREEN_WIDTH >= 768;
export const NOTIF_DRAWER_WIDTH = IS_TABLET_LAYOUT
  ? Math.min(Math.round(SCREEN_WIDTH * 0.52), 520)
  : Math.round(SCREEN_WIDTH * 0.82);

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type Props = {
  modalVisible: boolean;
  pushAnim: Animated.Value;
  onClose: () => void;
};

export default function NotificationDrawer({
  modalVisible,
  pushAnim,
  onClose,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { refreshUnreadCount } = useNotificationsPanel();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const drawerTranslateX = pushAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [NOTIF_DRAWER_WIDTH, 0],
  });

  const overlayOpacity = pushAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchNotifications(1, 40);
      const now = new Date().toISOString();
      if (res.unreadCount > 0) {
        await markAllNotificationsRead();
        setItems(
          res.items.map((n) => ({
            ...n,
            readAt: n.readAt ?? now,
          })),
        );
        await refreshUnreadCount();
      } else {
        setItems(res.items);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (modalVisible) {
      void load();
    }
  }, [modalVisible, load]);

  const onPressItem = (item: AppNotification) => {
    const href = getNotificationHref(item.metadata);
    if (href) {
      onClose();
      router.push(href as Href);
    }
  };

  return (
    <Modal
      visible={modalVisible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: overlayOpacity,
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: NOTIF_DRAWER_WIDTH,
          backgroundColor: AppColors.cardBg,
          transform: [{ translateX: drawerTranslateX }],
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 16,
          shadowOffset: { width: -8, height: 0 },
          elevation: 20,
        }}
      >
        <View
          style={{
            paddingTop: insets.top + (isTablet ? 20 : 14),
            paddingHorizontal: isTablet ? 24 : 18,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(0,0,0,0.06)',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text
            style={{
              fontSize: isTablet ? 26 : 20,
              fontFamily: 'PoppinsBold',
              color: '#000',
            }}
          >
            Bildirimler
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={isTablet ? 28 : 24} color="#000" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={AppColors.accent} />
          </View>
        ) : items.length === 0 ? (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 28,
            }}
          >
            <Ionicons
              name="notifications-off-outline"
              size={48}
              color="rgba(0,0,0,0.2)"
            />
            <Text
              style={{
                marginTop: 12,
                fontSize: 15,
                color: 'rgba(0,0,0,0.45)',
                textAlign: 'center',
              }}
            >
              Henüz bildiriminiz yok.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingBottom: Math.max(insets.bottom, 16) + 12,
            }}
            showsVerticalScrollIndicator={false}
          >
            {items.map((item) => {
              const link = getNotificationHref(item.metadata);
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={link ? 0.75 : 1}
                  onPress={() => onPressItem(item)}
                  style={{
                    paddingHorizontal: isTablet ? 24 : 18,
                    paddingVertical: isTablet ? 18 : 14,
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(0,0,0,0.05)',
                    backgroundColor: AppColors.cardBg,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: isTablet ? 17 : 15,
                        fontFamily: 'PoppinsSemiBold',
                        color: '#000',
                      }}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={{
                        marginTop: 4,
                        fontSize: isTablet ? 14 : 13,
                        lineHeight: isTablet ? 22 : 20,
                        color: 'rgba(0,0,0,0.62)',
                      }}
                    >
                      {item.body}
                    </Text>
                    <View
                      style={{
                        marginTop: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          color: 'rgba(0,0,0,0.38)',
                        }}
                      >
                        {formatWhen(item.createdAt)}
                      </Text>
                      {link ? (
                        <Text
                          style={{
                            fontSize: 12,
                            color: AppColors.accent,
                            fontFamily: 'PoppinsSemiBold',
                          }}
                        >
                          Detaya git →
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </Animated.View>
    </Modal>
  );
}
