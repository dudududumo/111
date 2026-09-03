import { LayoutDashboard, ClipboardCheck, Wind, Users, AlertTriangle, BarChart3, type LucideIcon } from "lucide-react";
import { UserRole } from "../../types";
import type { AccentKey } from "../ui/accents";

/* ============================================================
   导航配置：六模块 + 五色强调（小面积，不破坏全局简约感）
   slate=个人中心 / meadow=测评 / breeze=调适 / terra=干预 / coral=预警 / iris=评估
   ============================================================ */

export type { AccentKey };

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
  accent: AccentKey;
}

const ALL = [UserRole.TEACHER, UserRole.ADMIN, UserRole.PSYCHOLOGIST, UserRole.DEPT_HEAD];

export const navItems: NavItem[] = [
  { path: "/", label: "个人中心", icon: LayoutDashboard, roles: ALL, accent: "slate" },
  { path: "/assessment", label: "绿色测评", icon: ClipboardCheck, roles: ALL, accent: "meadow" },
  { path: "/toolkit", label: "蓝色调适", icon: Wind, roles: ALL, accent: "breeze" },
  { path: "/intervention", label: "橙色干预", icon: Users, roles: ALL, accent: "terra" },
  { path: "/warnings", label: "红色预警", icon: AlertTriangle, roles: [UserRole.ADMIN, UserRole.PSYCHOLOGIST, UserRole.DEPT_HEAD], accent: "coral" },
  { path: "/cockpit", label: "紫色评估", icon: BarChart3, roles: [UserRole.ADMIN], accent: "iris" },
];
