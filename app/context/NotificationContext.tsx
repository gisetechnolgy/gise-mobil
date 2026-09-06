import { Animated } from 'react-native';
import { createContext, useContext } from 'react';

type NotificationContextType = {
  isOpen: boolean;
  pushAnim: Animated.Value;
  unreadCount: number;
  openNotifications: () => void;
  closeNotifications: () => void;
  refreshUnreadCount: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
};

const fallbackAnim = new Animated.Value(0);

export const NotificationContext = createContext<NotificationContextType>({
  isOpen: false,
  pushAnim: fallbackAnim,
  unreadCount: 0,
  openNotifications: () => {},
  closeNotifications: () => {},
  refreshUnreadCount: async () => {},
  refreshNotifications: async () => {},
});

export const useNotificationsPanel = () => useContext(NotificationContext);

export default function NotificationContextRoute() {
  return null;
}
