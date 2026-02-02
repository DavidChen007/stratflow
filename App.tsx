
import React, { useState, useEffect, useCallback } from 'react';
import ProcessView from './components/ProcessView';
import OrgView from './components/OrgView';
import StrategyView from './components/StrategyView';
import WeeklyView from './components/WeeklyView';
import UserView from './components/UserView';
import { AppState, ProcessDefinition, Department, CompanyStrategy, Enterprise, ProcessHistory, User, WeeklyPAD } from './types';
import { getEnterprises, saveEnterprise, getWorkspace, saveWorkspace } from './data';
import { 
  GitGraph, Users, Target, Building2, Lock, Plus, Calendar,
  LogOut, ChevronRight, Save, ShieldCheck, UserCog, Building, UserCircle, ClipboardCheck, CheckCircle
} from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'process' | 'okr' | 'weekly' | 'org' | 'user'>('process');
  const [currentProcessId, setCurrentProcessId] = useState<string | null>(null);
  const [processMode, setProcessMode] = useState<'design' | 'view'>('design');
  
  const [authenticatedEnt, setAuthenticatedEnt] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showRegSuccess, setShowRegSuccess] = useState<Enterprise | null>(null);
  
  const [entId, setEntId] = useState('');
  const [entDisplayName, setEntDisplayName] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);

  const [state, setState] = useState<AppState>({
    processes: [],
    departments: [],
    strategy: { mission: '', vision: '', customerIssues: '', employeeIssues: '', companyOKRs: {} },
    users: [],
    weeklyPADs: []
  });

  useEffect(() => {
    getEnterprises().then(setEnterprises);
  }, []);

  const loadWorkspace = useCallback(async (enterpriseId: string) => {
    const savedData = await getWorkspace(enterpriseId);
    if (savedData) {
      const merged = {
        ...savedData,
        users: (savedData.users && savedData.users.length > 0) ? savedData.users : [
          { id: 'admin', username: 'admin', password: '888888', name: '系统管理员', role: 'Admin' } as User
        ]
      };
      setState(merged);
      return merged;
    }
    return null;
  }, []);

  const handleSave = useCallback(async () => {
    if (!authenticatedEnt) return;
    setIsSaving(true);
    try {
      await saveWorkspace(authenticatedEnt, state);
      setIsSaving(false);
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
    } catch (error) {
      setIsSaving(false);
    }
  }, [authenticatedEnt, state]);

  // Use functional updates to ensure state is always fresh
  const setProcessData = (id: string, nodes: any[], links: any[]) => {
    setState(prev => ({
      ...prev,
      processes: prev.processes.map(p => p.id === id ? { ...p, nodes, links, updatedAt: Date.now() } : p)
    }));
  };

  const updateProcessProps = (id: string, props: Partial<ProcessDefinition>) => {
    setState(prev => ({
      ...prev,
      processes: prev.processes.map(p => p.id === id ? { ...p, ...props, updatedAt: Date.now() } : p)
    }));
  };

  const addProcess = (category: any, level: 1 | 2, name: string) => {
    const newProcess: ProcessDefinition = {
      id: `proc-${Date.now()}`, name, category, level, version: 'Draft', isActive: false, type: category === '辅助体系' ? 'auxiliary' : 'main',
      owner: '', coOwner: '', objective: '', nodes: [], links: [], history: [], updatedAt: Date.now()
    };
    setState(prev => ({ ...prev, processes: [...prev.processes, newProcess] }));
    setCurrentProcessId(newProcess.id);
    setProcessMode('design');
  };

  // Added logic to fix the deleteProcess signature and implementation
  const deleteProcess = (id: string) => {
    setState(prev => ({
      ...prev,
      processes: prev.processes.filter(p => p.id !== id)
    }));
  };

  const publishProcess = (id: string, version: string) => {
    setState(prev => ({
      ...prev,
      processes: prev.processes.map(p => {
        if (p.id !== id) return p;
        const newRecord: ProcessHistory = { id: `hist-${Date.now()}`, version, nodes: JSON.parse(JSON.stringify(p.nodes)), links: JSON.parse(JSON.stringify(p.links)), publishedAt: Date.now(), publishedBy: currentUser?.name || 'System' };
        return { ...p, version, isActive: true, history: [newRecord, ...p.history] };
      })
    }));
  };

  // Added logic to fix the rollbackProcess signature and implementation
  const rollbackProcess = (procId: string, historyId: string) => {
    setState(prev => ({
      ...prev,
      processes: prev.processes.map(p => {
        if (p.id !== procId) return p;
        const record = p.history.find(h => h.id === historyId);
        if (!record) return p;
        return { 
          ...p, 
          nodes: JSON.parse(JSON.stringify(record.nodes)), 
          links: JSON.parse(JSON.stringify(record.links)), 
          updatedAt: Date.now() 
        };
      })
    }));
  };

  const setDepartments = (newDepts: Department[]) => 
    setState(prev => ({ ...prev, departments: newDepts }));

  const setStrategy = (strategyPartial: Partial<CompanyStrategy>) => 
    setState(prev => ({ ...prev, strategy: { ...prev.strategy, ...strategyPartial } }));

  const setUsers = (newUsers: User[]) => 
    setState(prev => ({ ...prev, users: newUsers }));

  const setWeeklyPADs = (newWeeklyPADs: WeeklyPAD[]) => 
    setState(prev => ({ ...prev, weeklyPADs: newWeeklyPADs }));

  const navigateToProcess = (procId: string) => {
    setCurrentProcessId(procId);
    setProcessMode('view');
    setActiveTab('process');
  };

  const handleCreateEnterprise = async () => {
    if (!entId || !entDisplayName) return;
    const exists = enterprises.find(e => e.name === entId);
    if (exists) { alert('企业ID已存在'); return; }

    const newEnt: Enterprise = { name: entId, displayName: entDisplayName, password: 'root' };
    await saveEnterprise(newEnt);
    const initialState: AppState = {
      processes: [], departments: [],
      strategy: { mission: '', vision: '', customerIssues: '', employeeIssues: '', companyOKRs: {} },
      users: [{ id: 'admin', username: 'admin', password: '888888', name: '系统管理员', role: 'Admin' }],
      weeklyPADs: []
    };
    await saveWorkspace(entId, initialState);
    setEnterprises(await getEnterprises());
    setShowRegSuccess(newEnt);
  };

  const proceedToAppAfterReg = async () => {
    if (!showRegSuccess) return;
    setAuthenticatedEnt(showRegSuccess.name);
    const workspace = await loadWorkspace(showRegSuccess.name);
    if (workspace) setCurrentUser(workspace.users[0]);
    setShowRegSuccess(null);
    setIsRegistering(false);
  };

  const handleLogin = async () => {
    const workspace = await loadWorkspace(entId);
    if (workspace) {
      const user = workspace.users.find(u => u.username === loginUsername && u.password === loginPassword);
      if (user) {
        setAuthenticatedEnt(entId);
        setCurrentUser(user);
      } else {
        alert('用户名或密码错误');
      }
    } else {
      alert('企业ID无效');
    }
  };

  if (!authenticatedEnt || !currentUser) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 p-6">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-50 rounded-3xl mb-4"><ShieldCheck className="h-10 w-10 text-brand-600" /></div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tighter text-center">StratFlow AI 工作台</h1>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
            <button onClick={() => setIsRegistering(false)} className={`flex-1 py-2 text-xs font-black uppercase rounded-xl transition-all ${!isRegistering ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400'}`}>登录空间</button>
            <button onClick={() => setIsRegistering(true)} className={`flex-1 py-2 text-xs font-black uppercase rounded-xl transition-all ${isRegistering ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400'}`}>注册企业</button>
          </div>
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 border rounded-2xl focus-within:border-brand-500 transition-all">
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">企业标识 ID</label>
              <input type="text" className="w-full bg-transparent text-sm font-bold outline-none" value={entId} onChange={e => setEntId(e.target.value)} />
            </div>
            {isRegistering ? (
              <div className="p-3 bg-slate-50 border rounded-2xl focus-within:border-brand-500 transition-all">
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">企业全称</label>
                <input type="text" className="w-full bg-transparent text-sm font-bold outline-none" value={entDisplayName} onChange={e => setEntDisplayName(e.target.value)} />
              </div>
            ) : (
              <>
                <div className="p-3 bg-slate-50 border rounded-2xl focus-within:border-brand-500 transition-all">
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">用户账号</label>
                  <input type="text" className="w-full bg-transparent text-sm font-bold outline-none" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} />
                </div>
                <div className="p-3 bg-slate-50 border rounded-2xl focus-within:border-brand-500 transition-all">
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">密码</label>
                  <input type="password"  className="w-full bg-transparent text-sm font-bold outline-none" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
                </div>
              </>
            )}
            <button onClick={isRegistering ? handleCreateEnterprise : handleLogin} className="w-full bg-brand-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-brand-700 transition-all">
              {isRegistering ? '立即创建空间' : '验证身份并进入'}
            </button>
          </div>
        </div>

        {showRegSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-6">
            <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl text-center">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6"><ClipboardCheck size={40} /></div>
              <h2 className="text-2xl font-black mb-4">企业空间创建成功！</h2>
              <div className="bg-slate-50 rounded-2xl p-6 text-left space-y-4 mb-8">
                <div><span className="text-[10px] font-black text-slate-400 uppercase block">空间标识</span><span className="text-lg font-black text-brand-600">{showRegSuccess.name}</span></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-[10px] font-black text-slate-400 uppercase block">管理员账号</span><span className="font-black text-slate-800">admin</span></div>
                  <div><span className="text-[10px] font-black text-slate-400 uppercase block">初始密码</span><span className="font-black text-slate-800">888888</span></div>
                </div>
              </div>
              <button onClick={proceedToAppAfterReg} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs">我知道了，立即进入</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800"><h1 className="text-white font-black text-xl tracking-tighter flex gap-2"><ShieldCheck className="text-brand-500" /> StratFlow</h1></div>
        <nav className="flex-1 p-4 space-y-1">
          <SidebarItem active={activeTab === 'process'} onClick={() => { setActiveTab('process'); setCurrentProcessId(null); }} icon={<GitGraph />} label="流程资产" />
          <SidebarItem active={activeTab === 'okr'} onClick={() => setActiveTab('okr')} icon={<Target />} label="OKR 战略" />
          <SidebarItem active={activeTab === 'weekly'} onClick={() => setActiveTab('weekly')} icon={<Calendar />} label="周度 PAD" />
          <SidebarItem active={activeTab === 'org'} onClick={() => setActiveTab('org')} icon={<Building2 />} label="组织架构" />
          <SidebarItem active={activeTab === 'user'} onClick={() => setActiveTab('user')} icon={<UserCog />} label="用户管理" />
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-black text-xs">{currentUser.name.charAt(0)}</div>
            <div className="flex-1 overflow-hidden"><p className="text-xs font-black text-white truncate">{currentUser.name}</p><p className="text-[10px] text-slate-500 font-bold uppercase">{currentUser.role}</p></div>
          </div>
          <button onClick={() => { setAuthenticatedEnt(null); setCurrentUser(null); }} className="w-full flex items-center gap-2 p-2 text-xs text-slate-500 hover:text-white transition-colors"><LogOut className="h-4 w-4" /> 退出空间</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 shadow-sm">
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter">
            {activeTab === 'process' && '流程大厅'}{activeTab === 'okr' && '战略 OKR 治理'}
            {activeTab === 'weekly' && '周度效能治理'}{activeTab === 'org' && '组织资产架构'}{activeTab === 'user' && '治理权限控制'}
          </h2>
          <button onClick={handleSave} disabled={isSaving} className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all ${showSaveSuccess ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-600 text-white shadow-lg'}`}>
            {showSaveSuccess ? <CheckCircle size={14}/> : <Save size={14} />} {showSaveSuccess ? '存档成功' : '持久化存档'}
          </button>
        </header>
        <div className="flex-1 overflow-hidden p-6">
          {activeTab === 'process' && (
            <ProcessView 
              processes={state.processes} 
              departments={state.departments} 
              currentProcessId={currentProcessId} 
              setCurrentProcessId={setCurrentProcessId} 
              setProcessData={setProcessData} 
              updateProcessProps={updateProcessProps} 
              addProcess={addProcess} 
              deleteProcess={deleteProcess} 
              publishProcess={publishProcess} 
              rollbackProcess={rollbackProcess} 
            />
          )}
          {activeTab === 'org' && <OrgView processes={state.processes} departments={state.departments} setDepartments={setDepartments} navigateToProcess={navigateToProcess} />}
          {activeTab === 'okr' && <StrategyView state={state} setStrategy={setStrategy} setDepartments={setDepartments} />}
          {activeTab === 'weekly' && (
            <WeeklyView 
              state={state} 
              setWeeklyPADs={setWeeklyPADs} 
              onSave={handleSave} 
              isSaving={isSaving} 
              saveSuccess={showSaveSuccess} 
              currentUser={currentUser!}
            />
          )}
          {activeTab === 'user' && <UserView state={state} setUsers={setUsers} currentUser={currentUser!} setCurrentUser={setCurrentUser} />}
        </div>
      </main>
    </div>
  );
};

const SidebarItem = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-brand-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}>
    {React.cloneElement(icon, { className: "h-5 w-5" })} <span className="font-bold text-sm">{label}</span>
  </button>
);

export default App;
