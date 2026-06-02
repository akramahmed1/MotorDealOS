'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';

interface UserCompany {
  company_id: string;
  role: 'super_admin' | 'manager' | 'viewer';
  companies: { id: string; name: string; legal_name: string };
}

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  companies: UserCompany[];
  activeCompanyId?: string;
}

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', session.user.id)
        .single();

      const { data: userCompanies } = await supabase
        .from('user_companies')
        .select('company_id, role, companies(id, name, legal_name)')
        .eq('user_id', session.user.id);

      const companies = (userCompanies || []).map((uc: any) => ({
        company_id: uc.company_id,
        role: uc.role,
        companies: uc.companies,
      }));

      setUser({
        id: session.user.id,
        full_name: profile?.full_name || session.user.email?.split('@')[0] || 'User',
        email: session.user.email || '',
        companies,
        activeCompanyId: companies[0]?.company_id,
      });
      setLoading(false);
    }

    loadUser();
  }, []);

  return { user, loading };
}
