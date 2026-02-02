import { AppState, Enterprise, User, ProcessDefinition, Department, WeeklyPAD } from "./types";

const API_BASE = "/api";

const api = async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'API Request Failed');
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
  // 这里是一个聚合请求，实际生产中可以分多次加载
  const users = await api<User[]>(`/users?entId=${entId}`);
  const processes = await api<ProcessDefinition[]>(`/workspace/processes/${entId}`);
  const departments = await api<Department[]>(`/workspace/departments/${entId}`);
  const strategy = await api<any>(`/workspace/strategy/${entId}`);
  const weeklyPADs = await api<WeeklyPAD[]>(`/workspace/pads/${entId}`);

  return {
    users,
    processes: processes || [],
    departments: departments || [],
    strategy: strategy || { mission: '', vision: '', companyOKRs: {} },
    weeklyPADs: weeklyPADs || []
  };
};

export const saveUser = (entId: string, user: User) => api('/users', { method: 'POST', body: JSON.stringify({ ...user, ent_name: entId }) });
export const deleteUser = (id: string) => api(`/users/${id}`, { method: 'DELETE' });

export const saveProcess = (entId: string, proc: ProcessDefinition) => api(`/workspace/processes/${entId}`, { method: 'POST', body: JSON.stringify(proc) });
export const deleteProcess = (id: string) => api(`/workspace/processes/${id}`, { method: 'DELETE' });

export const saveStrategy = (entId: string, strat: any) => api(`/workspace/strategy/${entId}`, { method: 'POST', body: JSON.stringify(strat) });
export const saveDepartments = (entId: string, depts: Department[]) => api(`/workspace/departments/${entId}`, { method: 'POST', body: JSON.stringify(depts) });
export const savePADs = (entId: string, pads: WeeklyPAD[]) => api(`/workspace/pads/${entId}`, { method: 'POST', body: JSON.stringify(pads) });
