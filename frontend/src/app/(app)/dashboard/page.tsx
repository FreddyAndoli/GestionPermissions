'use client';

import { motion } from 'framer-motion';
import {
  Users, Shield, CalendarDays, AlertTriangle, Building2,
  KeyRound, FileText, ArrowUpRight, TrendingUp, Clock,
  Wallet, CheckCircle2, XCircle, Hourglass,
  CalendarPlus, MessageSquare, UserCircle, Megaphone, PartyPopper
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import apiClient from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import PageWrapper from '@/components/layout/PageWrapper';
import { SkeletonStatCards, SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';
import { staggerContainer, fadeInUp } from '@/lib/animations';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

interface MyLeave {
  id: number;
  status: string;
  totalDays: number;
  reason?: string;
  createdAt: string;
  leaveType?: { name: string; color?: string };
  periods?: { startDate: string; endDate: string }[];
}

interface BalanceItem {
  leaveType?: { name: string; color?: string };
  totalQuota: number;
  usedDays: number;
  pendingDays: number;
  carriedOverDays: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { hasPermission } = usePermissions();

  const canReadUsers = hasPermission('users.read');
  const canReadDepartments = hasPermission('departments.read');
  const canReadRoles = hasPermission('roles.read');
  const canReadPermissions = hasPermission('permissions.read');
  const canReadLeaves = hasPermission('leaves.read');
  const canReadAudit = hasPermission('audit.read');

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users-count'],
    enabled: canReadUsers,
    queryFn: async () => {
      const { data } = await apiClient.get('/users?limit=1');
      return data.pagination?.total || 0;
    }
  });

  const { data: departmentsData, isLoading: departmentsLoading } = useQuery({
    queryKey: ['departments-count'],
    enabled: canReadDepartments,
    queryFn: async () => {
      const { data } = await apiClient.get('/departments?limit=1');
      return data.pagination?.total || 0;
    }
  });

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles-count'],
    enabled: canReadRoles,
    queryFn: async () => {
      const { data } = await apiClient.get('/roles?limit=1');
      return data.pagination?.total || 0;
    }
  });

  const { data: permissionsData, isLoading: permissionsLoading } = useQuery({
    queryKey: ['permissions-count'],
    enabled: canReadPermissions,
    queryFn: async () => {
      const { data } = await apiClient.get('/permissions?limit=1');
      return data.pagination?.total || 0;
    }
  });

  const { data: leavesData, isLoading: leavesLoading } = useQuery({
    queryKey: ['leaves-pending'],
    enabled: canReadLeaves,
    queryFn: async () => {
      const { data } = await apiClient.get('/leaves?status=pending&limit=1');
      return Array.isArray(data) ? data.length : (data.pagination?.total || 0);
    }
  });

  const { data: leavesStatusData, isLoading: leavesStatusLoading } = useQuery({
    queryKey: ['leaves-status-distribution'],
    enabled: canReadLeaves,
    queryFn: async () => {
      const { data } = await apiClient.get('/leaves?limit=1000');
      const rows = Array.isArray(data) ? data : (data.data || []);
      const counts: Record<string, number> = {};
      rows.forEach((l: any) => {
        counts[l.status] = (counts[l.status] || 0) + 1;
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }
  });

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['recent-activity'],
    enabled: canReadAudit,
    queryFn: async () => {
      const { data } = await apiClient.get('/audit?limit=10');
      return data.data || [];
    }
  });

  const { data: monthlyLeaves, isLoading: monthlyLeavesLoading } = useQuery({
    queryKey: ['leaves-monthly'],
    enabled: canReadLeaves,
    queryFn: async () => {
      const { data } = await apiClient.get('/leaves?limit=1000');
      const rows = Array.isArray(data) ? data : (data.data || []);
      const counts: Record<string, number> = {};
      rows.forEach((l: any) => {
        const d = new Date(l.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        counts[key] = (counts[key] || 0) + 1;
      });
      return Object.entries(counts)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([name, value]) => ({ name, value }));
    }
  });

  const { data: myLeaves = [], isLoading: myLeavesLoading } = useQuery<MyLeave[]>({
    queryKey: ['my-leaves'],
    queryFn: async () => {
      const { data } = await apiClient.get('/leaves/me');
      return Array.isArray(data) ? data : [];
    }
  });

  const { data: balance = [], isLoading: balanceLoading } = useQuery<BalanceItem[]>({
    queryKey: ['my-balance'],
    queryFn: async () => {
      const { data } = await apiClient.get('/leaves/balance');
      return Array.isArray(data) ? data : [];
    }
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['dashboard-announcements'],
    queryFn: async () => {
      const { data } = await apiClient.get('/announcements?limit=3');
      return Array.isArray(data) ? data : [];
    }
  });

  const isStatsLoading = authLoading || (canReadUsers && usersLoading) || (canReadDepartments && departmentsLoading) || (canReadRoles && rolesLoading) || (canReadPermissions && permissionsLoading) || (canReadLeaves && leavesLoading);
  const isPersonalLoading = authLoading || myLeavesLoading;
  const isChartsLoading = authLoading || (canReadLeaves && (monthlyLeavesLoading || leavesStatusLoading));
  const isAuditLoading = authLoading || (canReadAudit && auditLoading);
  const isBalanceLoading = authLoading || balanceLoading;

  const stats = [
    ...(canReadUsers ? [{ label: 'Utilisateurs', value: usersData ?? 0, icon: Users, color: 'bg-blue-500', link: '/users' }] : []),
    ...(canReadDepartments ? [{ label: 'Departements', value: departmentsData ?? 0, icon: Building2, color: 'bg-violet-500', link: '/departments' }] : []),
    ...(canReadRoles ? [{ label: 'Roles', value: rolesData ?? 0, icon: Shield, color: 'bg-indigo-500', link: '/roles' }] : []),
    ...(canReadPermissions ? [{ label: 'Permissions', value: permissionsData ?? 0, icon: KeyRound, color: 'bg-cyan-500', link: '/permissions' }] : []),
    ...(canReadLeaves ? [{ label: 'Conges en attente', value: leavesData ?? 0, icon: CalendarDays, color: 'bg-emerald-500', link: '/leaves' }] : []),
  ];

  const myPending = myLeaves.filter(l => l.status === 'pending' || l.status === 'pending_director').length;
  const myApproved = myLeaves.filter(l => l.status === 'approved' || l.status === 'auto_approved').length;
  const myRejected = myLeaves.filter(l => l.status === 'rejected').length;

  const recentRequests = myLeaves.slice(0, 5);
  const isEmployee = !canReadUsers && !canReadDepartments && !canReadRoles;

  return (
    <PageWrapper>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Bonjour, {user?.firstName || 'Utilisateur'}
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          {isEmployee ? 'Voici un apercu de votre espace personnel.' : 'Voici l\'etat de votre organisation en temps reel.'}
        </p>
      </div>

      {isBalanceLoading ? (
        <SkeletonCard className="mb-6" />
      ) : balance.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 p-4"
        >
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Wallet size={16} /> Solde de conges restant
          </h3>
          <div className="flex flex-wrap gap-3">
            {balance.map((b) => {
              const remaining = (b.totalQuota || 0) + (b.carriedOverDays || 0) - (b.usedDays || 0) - (b.pendingDays || 0);
              return (
                <div
                  key={b.leaveType?.name}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-700/50"
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: b.leaveType?.color || '#6366F1' }}
                  />
                  <span className="text-sm text-gray-700 dark:text-slate-200">
                    {b.leaveType?.name}: <span className="font-semibold">{remaining}</span> jours
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
      >
        {[
          { label: 'Demander un conge', icon: CalendarPlus, color: 'bg-indigo-500', link: '/leaves' },
          { label: 'Calendrier equipe', icon: CalendarDays, color: 'bg-violet-500', link: '/team-calendar' },
          { label: 'Messagerie', icon: MessageSquare, color: 'bg-emerald-500', link: '/messages' },
          { label: 'Mon profil', icon: UserCircle, color: 'bg-amber-500', link: '/profile' },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <motion.div
              key={action.label}
              variants={fadeInUp}
              onClick={() => router.push(action.link)}
              className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow text-center"
            >
              <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center text-white mx-auto mb-2`}>
                <Icon size={20} />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{action.label}</span>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8"
      >
        {isPersonalLoading || isStatsLoading ? (
          <div className="contents">
            <SkeletonStatCards count={!canReadLeaves ? 3 : 0} />
            <SkeletonStatCards count={stats.length || 5} />
          </div>
        ) : (
          <>
            {!canReadLeaves && (
              <>
                <motion.div
                  variants={fadeInUp}
                  onClick={() => router.push('/leaves')}
                  className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-slate-400">Mes conges en attente</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{myPending}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center text-white">
                      <Hourglass size={20} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                    Voir la liste <ArrowUpRight size={12} className="ml-1" />
                  </div>
                </motion.div>
                <motion.div
                  variants={fadeInUp}
                  onClick={() => router.push('/leaves')}
                  className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-slate-400">Conges approuves</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{myApproved}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
                      <CheckCircle2 size={20} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                    Voir la liste <ArrowUpRight size={12} className="ml-1" />
                  </div>
                </motion.div>
                <motion.div
                  variants={fadeInUp}
                  onClick={() => router.push('/leaves')}
                  className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-slate-400">Conges refuses</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{myRejected}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center text-white">
                      <XCircle size={20} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                    Voir la liste <ArrowUpRight size={12} className="ml-1" />
                  </div>
                </motion.div>
              </>
            )}

            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  variants={fadeInUp}
                  onClick={() => stat.link && router.push(stat.link)}
                  className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-slate-400">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center text-white`}>
                      <Icon size={20} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                    Voir la liste <ArrowUpRight size={12} className="ml-1" />
                  </div>
                </motion.div>
              );
            })}
          </>
        )}
      </motion.div>

      {/* My Recent Requests */}
      {recentRequests.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border dark:border-slate-700 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <CalendarDays size={18} /> Mes dernieres demandes
          </h2>
          <div className="space-y-3">
            {recentRequests.map((leave) => (
              <div
                key={leave.id}
                onClick={() => router.push('/leaves')}
                className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        leave.status === 'approved' || leave.status === 'auto_approved'
                          ? '#22C55E'
                          : leave.status === 'rejected'
                          ? '#EF4444'
                          : leave.status === 'pending_director'
                          ? '#8B5CF6'
                          : '#F59E0B'
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {leave.leaveType?.name || 'Conge'} · {leave.totalDays} jour{leave.totalDays > 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {leave.periods?.map((p) => `${new Date(p.startDate).toLocaleDateString('fr-FR')} - ${new Date(p.endDate).toLocaleDateString('fr-FR')}`).join(', ')}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 capitalize">
                  {leave.status === 'auto_approved' ? 'Approuve' : leave.status}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => router.push('/leaves')}
            className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
          >
            Voir toutes mes demandes
          </button>
        </div>
      )}

      {/* Recent Announcements */}
      {announcements.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border dark:border-slate-700 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Megaphone size={18} /> Annonces recentes
          </h2>
          <div className="space-y-3">
            {announcements.map((a: any) => (
              <div key={a.id} className="flex items-start gap-3 px-4 py-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <div className="mt-0.5">
                  {a.level === 'critical' ? <AlertTriangle size={16} className="text-red-500" /> :
                   a.level === 'warning' ? <PartyPopper size={16} className="text-amber-500" /> :
                   <Megaphone size={16} className="text-indigo-500" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{a.title}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-2">{a.message}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => router.push('/announcements')}
            className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
          >
            Voir toutes les annonces
          </button>
        </div>
      )}

      {canReadLeaves && (
        isChartsLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <SkeletonCard className="h-80" />
            <SkeletonCard className="h-80" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <TrendingUp size={18} /> Conges par mois
                </h2>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyLeaves || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                    <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
                    <YAxis stroke="#6B7280" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F3F4F6' }}
                    />
                    <Bar dataKey="value" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText size={18} /> Repartition des conges
                </h2>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leavesStatusData || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {(leavesStatusData || []).map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F3F4F6' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 mt-2">
                {(leavesStatusData || []).map((entry: any, index: number) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-300">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    {entry.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      )}

      {canReadAudit && (
        isAuditLoading ? (
          <SkeletonTable rows={5} columns={4} />
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock size={18} /> Activite recente
            </h2>
            {auditData && auditData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-700/50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Action</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Entite</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Utilisateur</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditData.map((item: any) => (
                      <tr key={item.id} className="border-t dark:border-slate-700">
                        <td className="px-4 py-2 text-gray-900 dark:text-slate-100">
                          <span className="font-medium">{item.action}</span>
                        </td>
                        <td className="px-4 py-2 text-gray-500 dark:text-slate-400">{item.entityType}</td>
                        <td className="px-4 py-2 text-gray-500 dark:text-slate-400">
                          {item.user?.firstName} {item.user?.lastName}
                        </td>
                        <td className="px-4 py-2 text-gray-500 dark:text-slate-400 text-xs">
                          {new Date(item.createdAt).toLocaleString('fr-FR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-slate-400">Aucune activite recente.</p>
            )}
          </div>
        )
      )}
    </PageWrapper>
  );
}
