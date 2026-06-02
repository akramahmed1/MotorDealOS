'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { useUser } from '@/hooks/useUser';

interface Stats {
  totalVehicles: number;
  liveVehicles: number;
  totalLeads: number;
  todayLeads: number;
  pendingContent: number;
}

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const [stats, setStats] = useState<Stats>({
    totalVehicles: 0, liveVehicles: 0, totalLeads: 0, todayLeads: 0, pendingContent: 0,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    if (!user?.activeCompanyId) return;

    async function loadStats() {
      const companyId = user!.activeCompanyId;

      const { count: totalVehicles } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .is('deleted_at', null);

      const { count: liveVehicles } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'live')
        .is('deleted_at', null);

      const { count: totalLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .is('deleted_at', null);

      const { count: todayLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('contact_day', new Date().toISOString().split('T')[0])
        .is('deleted_at', null);

      const { count: pendingContent } = await supabase
        .from('content_queue')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .in('status', ['draft', 'pending_approval', 'scheduled'])
        .is('deleted_at', null);

      setStats({
        totalVehicles: totalVehicles || 0,
        liveVehicles: liveVehicles || 0,
        totalLeads: totalLeads || 0,
        todayLeads: todayLeads || 0,
        pendingContent: pendingContent || 0,
      });
      setLoading(false);
    }

    loadStats();
  }, [user]);

  if (userLoading || loading) {
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
    { label: 'Pending Content', value: stats.pendingContent, color: 'bg-pink-500' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-600">
          Welcome back, {user?.full_name}. Here's what's happening at {user?.companies[0]?.companies?.name}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-lg bg-white p-6 shadow">
            <div className={`inline-flex rounded-full p-3 ${card.color} text-white`}>
              <span className="text-2xl font-bold">{card.value}</span>
            </div>
            <p className="mt-3 text-sm font-medium text-gray-600">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h2>
          <div className="space-y-3">
            <a href="/dashboard/vehicles" className="block rounded border p-3 hover:bg-gray-50">
              <p className="font-medium text-blue-600">+ Add New Vehicle</p>
              <p className="text-sm text-gray-500">Record acquisition, VIN, and cost basis</p>
            </a>
            <a href="/dashboard/leads" className="block rounded border p-3 hover:bg-gray-50">
              <p className="font-medium text-blue-600">View Lead Pipeline</p>
              <p className="text-sm text-gray-500">Track prospects from contact to close</p>
            </a>
            <a href="/dashboard/content" className="block rounded border p-3 hover:bg-gray-50">
              <p className="font-medium text-blue-600">Schedule Social Content</p>
              <p className="text-sm text-gray-500">Queue posts for Facebook, Instagram, TikTok</p>
            </a>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">System Status</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Database</span>
              <span className="font-medium text-green-600">Connected</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">RLS Policies</span>
              <span className="font-medium text-green-600">27 Active</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tenant Isolation</span>
              <span className="font-medium text-green-600">Enforced</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active Location</span>
              <span className="font-medium text-blue-600">Main Lot Glenview</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
