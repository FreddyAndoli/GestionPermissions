'use client';

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { usePermissions } from '@/hooks/usePermissions';
import PageWrapper from '@/components/layout/PageWrapper';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#6366F1', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function HRDashboardPage() {
  const { hasPermission } = usePermissions();
  const canReadUsers = hasPermission('users.read');
  const canReadLeaves = hasPermission('leaves.read');
  const canReadDepts = hasPermission('departments.read');

  const { data: usersData } = useQuery({
    queryKey: ['users-hr'],
    enabled: canReadUsers,
    queryFn: async () => {
      const { data } = await apiClient.get('/users?limit=1000');
      return data.data || [];
    }
  });

  const { data: leavesData } = useQuery({
    queryKey: ['leaves-hr'],
    enabled: canReadLeaves,
    queryFn: async () => {
      const { data } = await apiClient.get('/leaves');
      return data || [];
    }
  });

  const { data: departmentsData } = useQuery({
    queryKey: ['departments-hr'],
    enabled: canReadDepts,
    queryFn: async () => {
      const { data } = await apiClient.get('/departments');
      return data || [];
    }
  });

  const usersByDept = departmentsData?.map((dept: any) => ({
    name: dept.name,
    count: usersData?.filter((u: any) => u.departmentId === dept.id).length || 0
  })) || [];

  const leavesByType = (() => {
    const map: Record<string, number> = {};
    leavesData?.forEach((l: any) => {
      const name = l.leaveType?.name || 'Inconnu';
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  })();

  const pendingLeaves = leavesData?.filter((l: any) => l.status === 'pending').length || 0;
  const approvedLeaves = leavesData?.filter((l: any) => l.status === 'approved').length || 0;
  const totalUsers = usersData?.length || 0;

  return (
    <PageWrapper>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Tableau de bord RH</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <motion.div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border dark:border-slate-700">
          <p className="text-sm text-gray-500 dark:text-slate-400">Total utilisateurs</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalUsers}</p>
        </motion.div>
        <motion.div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border dark:border-slate-700">
          <p className="text-sm text-gray-500 dark:text-slate-400">Conges approuves</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{approvedLeaves}</p>
        </motion.div>
        <motion.div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border dark:border-slate-700">
          <p className="text-sm text-gray-500 dark:text-slate-400">Conges en attente</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{pendingLeaves}</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Utilisateurs par departement</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usersByDept}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Repartition des types de conge</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={leavesByType}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {leavesByType.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
