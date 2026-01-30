import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const POLL_INTERVAL = 30000; // 30 seconds

export const useNotifications = (isAuthenticated) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newNotifications, setNewNotifications] = useState([]);
  const sessionStartRef = useRef(null);
  const initialFetchDoneRef = useRef(false);
  const prevSessionCountRef = useRef(0);

  const fetchNotifications = useCallback(async (signal) => {
    if (!isAuthenticated) return;
    try {
      const response = await fetch(`${API_BASE}/api/notifications/unread`, {
        credentials: 'include',
        signal,
      });
      if (!response.ok) return;
      const data = await response.json();

      if (!initialFetchDoneRef.current) {
        // First fetch - record session start, don't show any badge
        sessionStartRef.current = new Date();
        initialFetchDoneRef.current = true;
        return;
      }

      // Only show notifications created after session start
      const sessionStart = sessionStartRef.current;
      const sessionNotifs = data.filter(n => new Date(n.created_at) > sessionStart);

      // Detect newly arrived notifications for toast display
      if (sessionNotifs.length > prevSessionCountRef.current) {
        const newOnes = sessionNotifs.slice(0, sessionNotifs.length - prevSessionCountRef.current);
        setNewNotifications(newOnes);
      }

      prevSessionCountRef.current = sessionNotifs.length;
      setNotifications(sessionNotifs);
      setUnreadCount(sessionNotifs.length);
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
    } catch (err) {
      // Silent failure
    }
  }, []);

  const dismissAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    prevSessionCountRef.current = 0;
    sessionStartRef.current = new Date();
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

  const refetch = useCallback(() => {
    const controller = new AbortController();
    fetchNotifications(controller.signal);
    return () => controller.abort();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    newNotifications,
    clearNewNotifications,
    markAsRead,
    markAllAsRead,
    dismissAll,
    refetch,
  };
};
