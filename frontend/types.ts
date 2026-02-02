
export interface SIPOC {
  source?: string[]; 
  target?: string[]; 
  inputs: string[];
  standard: string; 
  outputs: string[];
  customers: string[];
  ownerRole: string;
}

export interface ProcessNode {
  id: string;
  label: string;
  description: string;
  type: 'start' | 'process' | 'decision' | 'end';
  sipoc: SIPOC;
  decisionDescription?: string;
  isSubProcess?: boolean;
  subProcessNodes?: ProcessNode[];
  subProcessLinks?: ProcessLink[];
  x: number;
  y: number;
}

export interface ProcessLink {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export type ProcessCategory = '供应链' | '需求链' | '产品研发' | '辅助体系';

export interface ProcessHistory {
  id: string;
  version: string;
  nodes: ProcessNode[];
  links: ProcessLink[];
  publishedAt: number;
  publishedBy: string;
}

export interface ProcessDefinition {
  id: string;
  name: string;
  category: ProcessCategory;
  level: 1 | 2;
  version: string;
  isActive: boolean;
  type: 'main' | 'auxiliary';
  owner: string;
  coOwner: string;
  objective: string;
  nodes: ProcessNode[];
  links: ProcessLink[];
  history: ProcessHistory[];
  updatedAt: number;
}

export interface Department {
  id: string;
  name: string;
  manager?: string;
  roles: string[];
  subDepartments?: Department[];
  okrs?: Record<number, Record<string, OKR[]>>; // Year -> Quarter -> OKRs
}

export interface OKR {
  id: string;
  objective: string;
  keyResults: string[];
  alignedToId?: string; // Links to Company OKR ID
}

export interface CompanyStrategy {
  mission: string;
  vision: string;
  companyOKRs: Record<number, OKR[]>; // Year -> OKRs
}

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: 'Admin' | 'User';
  departmentId?: string;
}

export interface PADEntry {
  plan: string;
  action: string;
  deliverable: string;
  alignedOkrId?: string;
}

export interface WeeklyPAD {
  id: string;
  weekId: string;
  ownerId: string;
  type: 'dept' | 'user';
  entries: PADEntry[];
}

export interface AppState {
  processes: ProcessDefinition[];
  departments: Department[];
  strategy: CompanyStrategy;
  users: User[];
  weeklyPADs: WeeklyPAD[];
}

export interface Enterprise {
  name: string;
  displayName: string;
  password?: string;
}
