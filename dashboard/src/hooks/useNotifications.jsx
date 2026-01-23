import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const POLL_INTERVAL = 30000; // 30 seconds

export const useNotifications = (isAuthenticated) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newNotifications, setNewNotifications] = useState([]);
  const prevCountRef = useRef(0);

  const fetchNotifications = useCallback(async (signal) => {
    if (!isAuthenticated) return;
    try {
      const response = await fetch(`${API_BASE}/api/notifications/unread`, {
        credentials: 'include',
        signal,
      });
      if (!response.ok) return;
      const data = await response.json();

      // Detect newly arrived notifications for toast display
      const prevCount = prevCountRef.current;
      if (data.length > prevCount && prevCount >= 0 && prevCountRef.current !== 0) {
        const newOnes = data.slice(0, data.length - prevCount);
        setNewNotifications(newOnes);
      }

      setNotifications(data);
      setUnreadCount(data.length);
      prevCountRef.current = data.length;
    } catch (err) {
      if (err.name === 'AbortError') return;
      // Silently fail - polling will retry
    }
  }, [isAuthenticated]);

  const markAsRead = useCallback(async (id) => {
    try {
      const response = await fetch(`${API_BASE}/api/notifications/${id}/read`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) return;
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));
      prevCountRef.current = Math.max(0, prevCountRef.current - 1);
    } catch (err) {
      // Silent failure
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/notifications/read-all`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) return;
      setNotifications([]);
      setUnreadCount(0);
      prevCountRef.current = 0;
    } catch (err) {
      // Silent failure
    }
  }, []);

  const clearNewNotifications = useCallback(() => {
    setNewNotifications([]);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const controller = new AbortController();
    let interval;

    const poll = async () => {
      if (controller.signal.aborted) return;
      await fetchNotifications(controller.signal);
    };

    poll();
    interval = setInterval(poll, POLL_INTERVAL);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [isAuthenticated, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    newNotifications,
    clearNewNotifications,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
};
