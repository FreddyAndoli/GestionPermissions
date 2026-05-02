'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, Shield, KeyRound, Building2,
  CalendarDays, MessageSquare, ClipboardList,
  BarChart3, Settings, Monitor, Megaphone, UserCheck, HandHelping,
  TreePine
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: null, tour: 'dashboard' },
  { href: '/users', label: 'Utilisateurs', icon: Users, perm: 'users.read', tour: 'users' },
  { href: '/roles', label: 'Roles', icon: Shield, perm: 'roles.read', tour: 'roles' },
  { href: '/permissions', label: 'Permissions', icon: KeyRound, perm: 'permissions.read', tour: 'permissions' },
  { href: '/departments', label: 'Departements', icon: Building2, perm: 'departments.read', tour: 'departments' },
  { href: '/leaves', label: 'Conges', icon: CalendarDays, perm: 'leaves.read', tour: 'leaves' },
  { href: '/leave-types', label: 'Types de conges', icon: TreePine, perm: 'leave_types.read', tour: 'leave-types' },
  { href: '/team-calendar', label: 'Calendrier equipe', icon: CalendarDays, perm: 'leaves.read', tour: 'team-calendar' },
  { href: '/delegations', label: 'Delegations', icon: UserCheck, perm: 'leaves.approve', tour: 'delegations' },
  { href: '/proxy-requests', label: 'Procuration', icon: HandHelping, perm: 'permissions.read', tour: 'proxy-requests' },
  { href: '/messages', label: 'Messages', icon: MessageSquare, perm: 'messages.read', tour: 'messages' },
  { href: '/announcements', label: 'Annonces', icon: Megaphone, perm: null, tour: 'announcements' },
  { href: '/audit', label: 'Audit', icon: ClipboardList, perm: 'audit.read', tour: 'audit' },
  { href: '/reports', label: 'Rapports', icon: BarChart3, perm: 'reports.read', tour: 'reports' },
  { href: '/simulator', label: 'Simulateur', icon: Monitor, perm: 'admin.simulate', tour: 'simulator' },
  { href: '/settings', label: 'Parametres', icon: Settings, perm: null, tour: 'settings' }
];

export default function Sidebar() {
  const pathname = usePathname();
  const { hasPermission, isAdmin } = usePermissions();

  return (
    <aside className="w-64 h-screen bg-[#1E1B4B] text-[#C7D2FE] flex flex-col fixed left-0 top-0 z-40">
      <div className="h-16 flex items-center px-6 border-b border-white/10">
        <span className="text-lg font-bold text-white">Permission Manager</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        {navItems.map((item) => {
          if (item.perm && !hasPermission(item.perm) && !isAdmin()) return null;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} data-tour={item.tour}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className={`mx-3 mb-1 flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive ? 'bg-[#6366F1] text-white' : 'hover:bg-[#312E81]'
                }`}
              >
                <Icon size={18} />
                <span className="text-sm font-medium">{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
