'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

interface Stats {
  totalVehicles: number;
  liveVehicles: number;
  totalLeads: number;
  todayLeads: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalVehicles: 0,
    liveVehicles: 0,
    totalLeads: 0,
    todayLeads: 0,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserClient();

  useEffect(() => {
    async function loadStats() {
      const { count: totalVehicles } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      const { count: liveVehicles } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'live')
        .is('deleted_at', null);

      const { count: totalLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      const today = new Date().toISOString().split('T')[0];
      const { count: todayLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('contact_day', today)
        .is('deleted_at', null);

      setStats({
        totalVehicles: totalVehicles || 0,
        liveVehicles: liveVehicles || 0,
        totalLeads: totalLeads || 0,
        todayLeads: todayLeads || 0,
      });
      setLoading(false);
    }

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-lg text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Vehicles', value: stats.totalVehicles, color: 'bg-blue-500' },
    { label: 'Live on Site', value: stats.liveVehicles, color: 'bg-green-500' },
    { label: 'Total Leads', value: stats.totalLeads, color: 'bg-purple-500' },
    { label: "Today's Leads", value: stats.todayLeads, color: 'bg-orange-500' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-600">Welcome to MotorDealOS.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-lg bg-white p-6 shadow">
            <div className={`inline-flex rounded-full p-3 ${card.color} text-white`}>
              <span className="text-2xl font-bold">{card.value}</span>
            </div>
            <p className="mt-3 text-sm font-medium text-gray-600">{card.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}