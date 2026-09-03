import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, Clock, X, AlertTriangle, UserPlus, Sparkles, ChevronRight, Calendar } from 'lucide-react';
import { notificationApi, default as api } from '../services/api';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';

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

interface NotificationDropdownProps {
  profile: UserProfile | null;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ profile }) => {
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
      
      // 查找这个通知
      const notification = notifications.find(n => n.id === id);
      
      // 如果是预警通知且有 related_id，同步标记对应的预警为已读
      if (notification && notification.type === 'warning' && notification.related_id) {
        try {
          // 先获取预警详细信息，了解预警级别
          const warning = await api.warning.getById(notification.related_id);
          
          // 判断预警级别
          const isLevel1 = notification.title === '【心理健康关怀】' || notification.content.includes('一级提醒');
          const isLevel2 = notification.title === '【心理健康关注】' || notification.content.includes('二级关注');
          
          if (isLevel1 || isLevel2) {
            if (profile) {
              // 检查是否是教师本人（不管是一级还是二级预警）
              const isTeacherSelf = profile.uid === warning.user_id;
              
              if (isTeacherSelf) {
                // 教师本人标记已读
                await api.warning.markAsRead(notification.related_id);
                console.log(`✅ 教师本人已同步标记预警 ${notification.related_id} 为已读`);
              } else if (profile.role === 'dept_head') {
                // 教研组长标记已读
                await api.warning.markDeptHeadAsRead(notification.related_id);
                console.log(`✅ 教研组长已同步标记预警 ${notification.related_id} 为已读`);
              }
            }
          }
        } catch (error) {
          console.error('同步标记预警已读失败:', error);
        }
      }
      
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
      // 检查是否是一级提醒（一级提醒跳转到调适工具页面）
      // 一级提醒的标志：
      // 1. 标题是 "【心理健康关怀】"（教师收到的一级提醒）
      // 2. 内容包含 "一级提醒"（管理人员收到的一级提醒）
      const isLevel1 = notification.title === '【心理健康关怀】' || notification.content.includes('一级提醒');
      
      if (isLevel1) {
        navigate('/toolkit');
      } else {
        // 二级和三级预警跳转到干预任务页面
        // 二级：标题是 "【心理健康关注】" 或内容包含 "二级关注"
        // 三级：标题是 "【紧急心理关怀】" 或内容包含 "三级干预" 或 "紧急"
        navigate('/intervention');
      }
    } else if (notification.type === 'intervention') {
      navigate('/intervention');
    } else if (notification.type === 'appointment' || notification.type === 'appointment_update') {
      // 预约相关通知跳转到干预页面，因为预约管理在干预页面
      navigate('/intervention');
    }

    setSelectedNotification(null);
  };

  const getNotificationIcon = (type: string, title: string) => {
    if (type === 'warning') {
      if (title.includes('紧急')) return <AlertTriangle className="text-coral-500" size={18} />;
      return <AlertTriangle className="text-coral-500" size={18} />;
    }
    if (type === 'intervention') return <UserPlus className="text-terra-500" size={18} />;
    if (type === 'appointment' || type === 'appointment_update') return <Calendar className="text-terra-500" size={18} />;
    return <Sparkles className="text-ink-400" size={18} />;
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => n.status === 'unread');
      await Promise.all(
        unreadNotifications.map(notification => 
          markAsRead(notification.id)
        )
      );
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
        className="relative p-2 rounded-full hover:bg-frost-100 transition-colors"
      >
        <Bell size={20} className="text-ink-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-coral-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
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
            className="absolute right-0 top-12 w-80 glass rounded-2xl shadow-float border-frost-200 z-50"
          >
            <div className="p-4 border-b border-frost-100 flex justify-between items-center">
              <h3 className="font-semibold text-ink-900">通知中心</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-ink-500 hover:text-ink-700 hover:underline"
                >
                  全部标为已读
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-8 flex justify-center items-center">
                  <div className="h-4 w-4 border-2 border-ink-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-ink-400">
                  暂无通知
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 border-b border-frost-100 hover:bg-frost-50 transition-colors cursor-pointer relative ${notification.status === 'unread' ? 'bg-frost-100/60' : ''}`}
                  >
                    <div className="flex gap-3">
                      <div className="mt-1 flex-shrink-0">
                        {getNotificationIcon(notification.type, notification.title)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className={`text-sm font-semibold truncate ${notification.status === 'unread' ? 'text-ink-900' : 'text-ink-600'}`}>
                            {notification.title}
                          </h4>
                            <div className="flex items-center gap-1 ml-2">
                            {notification.status === 'unread' ? (
                              <button
                                onClick={(e) => markAsRead(notification.id, e)}
                                className="p-1 rounded-full hover:bg-frost-100 text-ink-400 hover:text-ink-700 transition-colors"
                                title="标为已读"
                              >
                                <CheckCircle size={14} />
                              </button>
                            ) : (
                              <button
                                onClick={(e) => deleteNotification(notification.id, e)}
                                className="p-1 rounded-full hover:bg-frost-100 text-ink-400 hover:text-coral-500 transition-colors"
                                title="删除通知"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className={`text-xs mt-1 line-clamp-2 ${notification.status === 'unread' ? 'text-ink-800' : 'text-ink-500'}`}>
                          {notification.content}
                        </p>
                        <div className="flex items-center mt-2 text-[10px] text-ink-400">
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

            <div className="p-3 border-t border-frost-100 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="text-sm text-ink-400 hover:text-ink-700"
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
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-ink-900/30 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="text-center space-y-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                  selectedNotification.type === 'warning' 
                    ? (selectedNotification.title.includes('紧急') ? 'bg-coral-50' : 'bg-coral-50') 
                    : 'bg-frost-100'
                }`}>
                  {getNotificationIcon(selectedNotification.type, selectedNotification.title)}
                </div>
                <h3 className="text-xl font-bold text-ink-900">{selectedNotification.title}</h3>
                <p className="text-ink-500 leading-relaxed">{selectedNotification.content}</p>
                <div className="flex items-center justify-center gap-2 mt-2 text-ink-400 text-sm">
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
                    className="flex-1 py-3 rounded-2xl bg-white/70 text-ink-700 border border-frost-200 font-semibold hover:bg-white transition-all"
                  >
                    稍后处理
                  </button>
                  <button
                    onClick={() => handleAction(selectedNotification)}
                    className={`flex-1 py-3 rounded-2xl text-white font-semibold hover:brightness-110 transition-all shadow-md ${
                      selectedNotification.type === 'warning' 
                        ? (selectedNotification.title.includes('紧急') ? 'bg-coral-500' : 'bg-coral-500') 
                        : 'bg-ink-900'
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
