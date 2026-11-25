import { createAdminClient } from '@/lib/supabase/admin';

export interface ChatSession {
  id: string;
  session_token: string;
  lead_id: string | null;
}

export interface ChatStore {
  findSession(token: string): Promise<ChatSession | null>;
  createSession(input: {
    companyId: string;
    sessionToken: string;
    vehicleId: string | null;
  }): Promise<{ session: ChatSession } | { error: string }>;
  addMessage(sessionId: string, role: 'user' | 'assistant', content: string): Promise<void>;
  linkLead(sessionId: string, leadId: string): Promise<void>;
  recentMessages(sessionId: string): Promise<{ role: string; content: string }[]>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readSession(data: unknown): ChatSession | null {
  if (!isRecord(data)) return null;
  if (typeof data.id !== 'string' || typeof data.session_token !== 'string') return null;
  return {
    id: data.id,
    session_token: data.session_token,
    lead_id: typeof data.lead_id === 'string' ? data.lead_id : null,
  };
}

type DbResult = { data: unknown; error: { message: string } | null };

// Untyped Supabase client. Results are narrowed before they leave this file.
function asResult(value: unknown): DbResult {
  if (!isRecord(value)) return { data: null, error: { message: 'Unexpected database response' } };
  const error = value.error;
  const message = isRecord(error) && typeof error.message === 'string' ? error.message : null;
  return { data: value.data, error: message ? { message } : null };
}

export function createChatStore(supabase = createAdminClient()): ChatStore {
  return {
    async findSession(token) {
      const { data, error } = asResult(
        await supabase
          .from('chat_sessions')
          .select('id, session_token, lead_id')
          .eq('session_token', token)
          .maybeSingle(),
      );
      if (error) {
        console.error('[chat] chat_sessions lookup errored:', error.message);
        return null;
      }
      return readSession(data);
    },

    async createSession(input) {
      const { data, error } = asResult(
        await supabase
          .from('chat_sessions')
          .insert({
            company_id: input.companyId,
            session_token: input.sessionToken,
            source: 'website',
            status: 'active',
            vehicle_id: input.vehicleId,
          })
          .select('id, session_token, lead_id')
          .single(),
      );
      if (error) return { error: error.message };
      const session = readSession(data);
      if (!session) return { error: 'Chat session was not returned.' };
      return { session };
    },

    async addMessage(sessionId, role, content) {
      const { error } = asResult(
        await supabase.from('chat_messages').insert({ session_id: sessionId, role, content }),
      );
      if (error) console.error(`[chat] chat_messages (${role}) insert errored:`, error.message);
    },

    async linkLead(sessionId, leadId) {
      const { error } = asResult(
        await supabase.from('chat_sessions').update({ lead_id: leadId }).eq('id', sessionId),
      );
      if (error) console.error('[chat] chat_sessions lead_id link update errored:', error.message);
    },

    async recentMessages(sessionId) {
      const { data, error } = asResult(
        await supabase
          .from('chat_messages')
          .select('role, content')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true })
          .limit(20),
      );
      if (error) {
        console.error('[chat] chat_messages history errored:', error.message);
        return [];
      }
      if (!Array.isArray(data)) return [];
      const rows: { role: string; content: string }[] = [];
      for (const row of data) {
        if (!isRecord(row) || typeof row.role !== 'string' || typeof row.content !== 'string') continue;
        rows.push({ role: row.role, content: row.content });
      }
      return rows;
    },
  };
}
