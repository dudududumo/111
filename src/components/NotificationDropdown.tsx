import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, Clock, X } from 'lucide-react';
import { notificationApi } from '../services/api';
import { motion, AnimatePresence } from 'motion/react';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  content: string;
  status: string;
  related_id: string | null;
  created_at: string;
  read_at: string | null;
}

const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationApi.getAll();
      setNotifications(data);
      
      // 获取未读数量
      const countData = await notificationApi.getUnreadCount();
      setUnreadCount(countData.count);
    } catch (error) {
      console.error('获取通知失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      // 更新本地状态
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id 
            ? { ...notification, status: 'read', read_at: new Date().toISOString() }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('标记通知已读失败:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => n.status === 'unread');
      await Promise.all(
        unreadNotifications.map(notification => 
          notificationApi.markAsRead(notification.id)
        )
      );
      // 更新本地状态
      setNotifications(prev => 
        prev.map(notification => 
          notification.status === 'unread'
            ? { ...notification, status: 'read', read_at: new Date().toISOString() }
            : notification
        )
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('标记所有通知已读失败:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-stone-100 transition-colors"
      >
        <Bell size={20} className="text-stone-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-stone-200 z-50"
          >
            <div className="p-4 border-b border-stone-100 flex justify-between items-center">
              <h3 className="font-semibold text-stone-900">通知中心</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-emerald-600 hover:underline"
                >
                  全部标为已读
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-8 flex justify-center items-center">
                  <div className="h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-stone-500">
                  暂无通知
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-stone-100 hover:bg-stone-50 transition-colors ${notification.status === 'unread' ? 'bg-rose-50' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-stone-900 mb-1">
                          {notification.title}
                        </h4>
                        <p className="text-sm text-stone-600 mb-2">
                          {notification.content}
                        </p>
                        <div className="flex items-center text-xs text-stone-500">
                          <Clock size={12} className="mr-1" />
                          <span>
                            {new Date(notification.created_at).toLocaleString('zh-CN')}
                          </span>
                        </div>
                      </div>
                      {notification.status === 'unread' && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="ml-2 p-1.5 rounded-full hover:bg-stone-100 transition-colors"
                        >
                          <CheckCircle size={16} className="text-emerald-600" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-stone-100 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="text-sm text-stone-500 hover:text-stone-700"
              >
                关闭
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationDropdown;
