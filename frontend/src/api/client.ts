import axios from 'axios';

const API_BASE = 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('sentinel_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface User {
  id: string;
  email: string;
  username: string;
  role: 'employee' | 'manager' | 'hr' | 'admin';
  department: string;
  org_id: string;
  is_active: boolean;
  created_at: string;
}

export interface PromptResponse {
  prompt_id: string;
  action: 'approved' | 'redact' | 'escalate' | 'blocked';
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_factors: string[];
  masked_preview: string;
  llm_response: string | null;
  status: string;
  reason: string | null;
  pii_detected_count: number;
  target: string;
}

export interface EscalationItem {
  id: string;
  masked_prompt: string;
  risk_score: number;
  risk_action: string;
  risk_factors: string[];
  pii_detected: Array<{ entity_type: string; placeholder: string }>;
  status: string;
  user_id: string;
  username: string;
  user_email: string;
  department: string;
  timestamp: string;
}

export interface HRAnalytics {
  total_prompts: number;
  average_risk_score: number;
  actions_breakdown: {
    approved: number;
    redact: number;
    escalate: number;
    blocked: number;
  };
  department_stats: Array<{
    department: string;
    prompt_count: number;
    avg_risk_score: number;
  }>;
}

export interface AdminStats {
  total_users: number;
  total_audited_prompts: number;
  policy_thresholds: Record<string, string>;
  recent_logs: Array<{
    id: string;
    username: string;
    masked_prompt: string;
    risk_score: number;
    risk_action: string;
    status: string;
    raw_text_hash: string;
    model_used: string;
    timestamp: string;
  }>;
}

export const api = {
  login: async (formData: FormData) => {
    const res = await axios.post(`${API_BASE}/auth/login`, formData);
    return res.data;
  },
  register: async (payload: { email: string; username: string; password: string; role?: string; department?: string }) => {
    const res = await apiClient.post('/auth/register', payload);
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },
  processPrompt: async (text: string, target = 'cloud'): Promise<PromptResponse> => {
    const res = await apiClient.post('/prompt', { text, target });
    return res.data;
  },
  getHistory: async () => {
    const res = await apiClient.get('/gateway/history');
    return res.data;
  },
  getManagerEscalations: async (): Promise<{ pending_count: number; escalations: EscalationItem[] }> => {
    const res = await apiClient.get('/dashboard/manager');
    return res.data;
  },
  reviewEscalation: async (promptId: string, decision: 'approve' | 'reject') => {
    const res = await apiClient.post(`/dashboard/manager/review/${promptId}`, { decision });
    return res.data;
  },
  getHRAnalytics: async (): Promise<HRAnalytics> => {
    const res = await apiClient.get('/dashboard/hr');
    return res.data;
  },
  getAdminDashboard: async (): Promise<AdminStats> => {
    const res = await apiClient.get('/dashboard/admin');
    return res.data;
  },
};
