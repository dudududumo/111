import { useEffect } from "react";
import { notificationApi } from "../services/api";
import { UserProfile } from "../types";

/* 测评定时提醒：从原 App.tsx 逐字迁出，业务逻辑不变 */
export function useAssessmentReminder(profile: UserProfile | null) {
  useEffect(() => {
    if (!profile || !profile.uid) return;

    // 获取上次通知时间
    const lastNotifyTime = localStorage.getItem("last_assessment_notify_time");

    // 根据测评频率设置提醒间隔（毫秒）
    const getInterval = () => {
      switch (profile.syncFrequency) {
        case "hourly":
          return 60 * 60 * 1000; // 每小时
        case "daily":
          return 24 * 60 * 60 * 1000; // 每天
        case "realtime":
          return 0; // 实时模式不需要定时提醒
        default:
          return 24 * 60 * 60 * 1000; // 默认每天
      }
    };

    const interval = getInterval();

    // 如果是实时模式或者没有启用提醒，则不发送定时通知
    if (profile.syncFrequency === "realtime" || interval === 0) {
      return;
    }

    // 每天最多提醒 3 次
    const MAX_NOTIFY_COUNT = 3;

    const sendNotification = async () => {
      // 检查今天是否已经提醒了 3 次
      const currentToday = new Date().toDateString();
      const currentNotifyCount = parseInt(localStorage.getItem("today_assessment_notify_count") || "0");
      const savedDate = localStorage.getItem("today_date");

      if (savedDate !== currentToday || currentNotifyCount >= MAX_NOTIFY_COUNT) {
        // 重置计数
        localStorage.setItem("today_assessment_notify_count", "0");
        localStorage.setItem("today_date", currentToday);
        return;
      }

      try {
        await notificationApi.create({
          userId: profile.uid,
          type: "reminder",
          title: "【心理测评提醒】",
          content: "您今天还没有完成心理测评哦~关注心理健康，从测评开始。点击前往完成测评吧！",
          relatedId: "",
        });

        // 更新通知计数
        const newCount = currentNotifyCount + 1;
        localStorage.setItem("today_assessment_notify_count", newCount.toString());
        localStorage.setItem("today_date", currentToday);
        localStorage.setItem("last_assessment_notify_time", new Date().toISOString());
      } catch (error) {
        console.error("发送测评提醒通知失败:", error);
      }
    };

    // 立即发送一次通知（如果上次通知时间超过间隔）
    if (lastNotifyTime) {
      const lastTime = new Date(lastNotifyTime).getTime();
      const now = Date.now();
      if (now - lastTime >= interval) {
        sendNotification();
      }
    }

    // 设置定时器
    const timer = setInterval(() => {
      sendNotification();
    }, interval);

    return () => {
      clearInterval(timer);
    };
  }, [profile]);
}
