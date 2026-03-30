import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, Clock, X, AlertTriangle, UserPlus, Sparkles, ChevronRight } from 'lucide-react';
import { notificationApi } from '../services/api';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

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
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const navigate = useNavigate();

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

  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

  const deleteNotification = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    // 检查是否已读
    const notification = notifications.find(n => n.id === id);
    if (notification && notification.status !== 'read') {
      alert('请先将通知标记为已读后再删除。');
      return;
    }

    try {
      await notificationApi.delete(id);
      // 从本地列表中移除
      setNotifications(prev => prev.filter(n => n.id !== id));
      // 如果该通知未读，则更新未读数量
      const deletedNotif = notifications.find(n => n.id === id);
      if (deletedNotif && deletedNotif.status === 'unread') {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('删除通知失败:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // 标记为已读
    if (notification.status === 'unread') {
      markAsRead(notification.id);
    }
    
    // 打开详情弹窗
    setSelectedNotification(notification);
    setIsOpen(false);
  };

  const handleAction = (notification: Notification) => {
    // 根据通知类型进行跳转
    if (notification.type === 'warning') {
      // 一级预警（【心理健康关怀】）跳转到调适工具页面
      if (notification.title === '【心理健康关怀】') {
        navigate('/toolkit');
      } else {
        // 二级和三级预警跳转到干预任务页面
        navigate('/intervention');
      }
    } else if (notification.type === 'intervention') {
      navigate('/intervention');
    }

    setSelectedNotification(null);
  };

  const getNotificationIcon = (type: string, title: string) => {
    if (type === 'warning') {
      if (title.includes('紧急')) return <AlertTriangle className="text-rose-500" size={18} />;
      return <AlertTriangle className="text-amber-500" size={18} />;
    }
    if (type === 'intervention') return <UserPlus className="text-blue-500" size={18} />;
    return <Sparkles className="text-emerald-500" size={18} />;
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
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 border-b border-stone-100 hover:bg-stone-50 transition-colors cursor-pointer relative ${notification.status === 'unread' ? 'bg-rose-50/50' : ''}`}
                  >
                    <div className="flex gap-3">
                      <div className="mt-1 flex-shrink-0">
                        {getNotificationIcon(notification.type, notification.title)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className={`text-sm font-semibold truncate ${notification.status === 'unread' ? 'text-stone-900' : 'text-stone-600'}`}>
                            {notification.title}
                          </h4>
                            <div className="flex items-center gap-1 ml-2">
                            {notification.status === 'unread' ? (
                              <button
                                onClick={(e) => markAsRead(notification.id, e)}
                                className="p-1 rounded-full hover:bg-stone-200 text-stone-400 hover:text-emerald-600 transition-colors"
                                title="标为已读"
                              >
                                <CheckCircle size={14} />
                              </button>
                            ) : (
                              <button
                                onClick={(e) => deleteNotification(notification.id, e)}
                                className="p-1 rounded-full hover:bg-stone-200 text-stone-400 hover:text-rose-600 transition-colors"
                                title="删除通知"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className={`text-xs mt-1 line-clamp-2 ${notification.status === 'unread' ? 'text-stone-800' : 'text-stone-500'}`}>
                          {notification.content}
                        </p>
                        <div className="flex items-center mt-2 text-[10px] text-stone-400">
                          <Clock size={10} className="mr-1" />
                          <span>
                            {new Date(notification.created_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
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
      {/* 详情弹窗 */}
      <AnimatePresence>
        {selectedNotification && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl"
            >
              <div className="text-center space-y-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                  selectedNotification.type === 'warning' 
                    ? (selectedNotification.title.includes('紧急') ? 'bg-rose-100' : 'bg-amber-100') 
                    : 'bg-emerald-100'
                }`}>
                  {getNotificationIcon(selectedNotification.type, selectedNotification.title)}
                </div>
                <h3 className="text-xl font-bold text-stone-900">{selectedNotification.title}</h3>
                <p className="text-stone-500 leading-relaxed">{selectedNotification.content}</p>
                <div className="flex items-center justify-center gap-2 mt-2 text-stone-400 text-sm">
                  <Clock size={14} />
                  <span>{new Date(selectedNotification.created_at).toLocaleString('zh-CN', { 
                    month: 'numeric', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}</span>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setSelectedNotification(null)}
                    className="flex-1 py-3 rounded-2xl bg-stone-100 text-stone-700 font-semibold hover:bg-stone-200 transition-all"
                  >
                    稍后处理
                  </button>
                  <button
                    onClick={() => handleAction(selectedNotification)}
                    className={`flex-1 py-3 rounded-2xl text-white font-semibold hover:brightness-110 transition-all shadow-md ${
                      selectedNotification.type === 'warning' 
                        ? (selectedNotification.title.includes('紧急') ? 'bg-rose-600' : 'bg-amber-500') 
                        : 'bg-emerald-600'
                    }`}
                  >
                    立即前往处理
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationDropdown;
