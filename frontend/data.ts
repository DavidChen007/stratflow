import { AppState, Enterprise, User, ProcessDefinition, Department, WeeklyPAD } from "./types";

const API_BASE = "/api";

const api = async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'API Request Failed' }));
    throw new Error(err.error || 'Request Error');
  }
  const text = await response.text();
  return text ? JSON.parse(text) : {} as T;
};

// --- Auth & Enterprise ---
export const login = async (entId: string, username: string, password: string): Promise<User> => {
  const res = await api<{ success: boolean; user: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ entId, username, password })
  });
  return res.user;
};

export const saveEnterprise = (ent: Enterprise) => api('/enterprises', { method: 'POST', body: JSON.stringify(ent) });
export const getEnterprises = () => api<Enterprise[]>('/enterprises');

// --- Granular Workspace Data ---
export const getWorkspace = async (entId: string): Promise<AppState> => {
  const [users, processes, departments, strategy, pads] = await Promise.all([
    api<User[]>(`/users?entId=${entId}`),
    api<ProcessDefinition[]>(`/workspace/processes/${entId}`),
    api<Department[]>(`/workspace/departments/${entId}`),
    api<any>(`/workspace/strategy/${entId}`),
    api<WeeklyPAD[]>(`/workspace/pads/${entId}`).catch(() => [])
  ]);

  return {
    users: users || [],
    processes: processes || [],
    departments: departments || [],
    strategy: strategy || { mission: '', vision: '', companyOKRs: {} },
    weeklyPADs: pads || []
  };
};

export const saveUser = (entId: string, user: User) => api('/users', { method: 'POST', body: JSON.stringify({ ...user, ent_name: entId }) });
export const deleteUser = (id: string) => api(`/users/${id}`, { method: 'DELETE' });

export const saveProcess = (entId: string, proc: ProcessDefinition) => api(`/workspace/processes/${entId}`, { method: 'POST', body: JSON.stringify(proc) });
export const saveStrategy = (entId: string, strat: any) => api(`/workspace/strategy/${entId}`, { method: 'POST', body: JSON.stringify(strat) });
export const saveDepartments = (entId: string, depts: Department[]) => api(`/workspace/departments/${entId}`, { method: 'POST', body: JSON.stringify(depts) });
export const savePADs = (entId: string, pads: WeeklyPAD[]) => api(`/workspace/pads/${entId}`, { method: 'POST', body: JSON.stringify(pads) });