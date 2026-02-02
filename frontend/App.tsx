import React, { useState, useEffect, useCallback } from 'react';
import ProcessView from './components/ProcessView';
import OrgView from './components/OrgView';
import StrategyView from './components/StrategyView';
import WeeklyView from './components/WeeklyView';
import UserView from './components/UserView';
import { AppState, ProcessDefinition, Department, CompanyStrategy, Enterprise, ProcessHistory, User, WeeklyPAD } from './types';
import { getEnterprises, saveEnterprise, getWorkspace, login, saveUser, deleteUser as apiDeleteUser, saveProcess, saveStrategy, saveDepartments, savePADs } from './data';
import { 
  GitGraph, Users, Target, Building2, Lock, Plus, Calendar,
  LogOut, ChevronRight, Save, ShieldCheck, UserCog, Building, UserCircle, ClipboardCheck, CheckCircle
} from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'process' | 'okr' | 'weekly' | 'org' | 'user'>('process');
  const [currentProcessId, setCurrentProcessId] = useState<string | null>(null);
  
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
    strategy: { mission: '', vision: '', companyOKRs: {} },
    users: [],
    weeklyPADs: []
  });

  useEffect(() => {
    getEnterprises().then(setEnterprises);
  }, []);

  const handleLogin = async () => {
    try {
      const user = await login(entId, loginUsername, loginPassword);
      setAuthenticatedEnt(entId);
      setCurrentUser(user);
      const data = await getWorkspace(entId);
      setState(data);
    } catch (e) {
      alert('登录失败：企业ID或账号密码错误');
    }
  };

  const handleSave = async () => {
    if (!authenticatedEnt) return;
    setIsSaving(true);
    try {
      // 分模块持久化
      await Promise.all([
        saveStrategy(authenticatedEnt, state.strategy),
        saveDepartments(authenticatedEnt, state.departments),
        savePADs(authenticatedEnt, state.weeklyPADs),
        ...state.processes.map(p => saveProcess(authenticatedEnt, p))
      ]);
      setIsSaving(false);
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
    } catch (error) {
      console.error(error);
      setIsSaving(false);
    }
  };

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
  };

  const deleteProcessLocal = (id: string) => {
    setState(prev => ({ ...prev, processes: prev.processes.filter(p => p.id !== id) }));
  };

  const setUsers = (newUsers: User[]) => setState(prev => ({ ...prev, users: newUsers }));
  const setDepartments = (newDepts: Department[]) => setState(prev => ({ ...prev, departments: newDepts }));
  const setStrategy = (strategyPartial: Partial<CompanyStrategy>) => setState(prev => ({ ...prev, strategy: { ...prev.strategy, ...strategyPartial } }));
  const setWeeklyPADs = (newWeeklyPADs: WeeklyPAD[]) => setState(prev => ({ ...prev, weeklyPADs: newWeeklyPADs }));

  const handleCreateEnterprise = async () => {
    if (!entId || !entDisplayName) return;
    try {
      await saveEnterprise({ name: entId, displayName: entDisplayName });
      setEnterprises(await getEnterprises());
      setShowRegSuccess({ name: entId, displayName: entDisplayName });
    } catch (e) {
      alert('创建失败：企业ID已存在');
    }
  };

  if (!authenticatedEnt || !currentUser) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 p-6">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-50 rounded-3xl mb-4"><ShieldCheck className="h-10 w-10 text-brand-600" /></div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tighter">StratFlow AI</h1>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
            <button onClick={() => setIsRegistering(false)} className={`flex-1 py-2 text-xs font-black uppercase rounded-xl ${!isRegistering ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400'}`}>登录</button>
            <button onClick={() => setIsRegistering(true)} className={`flex-1 py-2 text-xs font-black uppercase rounded-xl ${isRegistering ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400'}`}>注册</button>
          </div>
          <div className="space-y-4">
            <input className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-bold" placeholder="企业 ID" value={entId} onChange={e => setEntId(e.target.value)} />
            {isRegistering ? (
              <input className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-bold" placeholder="企业全称" value={entDisplayName} onChange={e => setEntDisplayName(e.target.value)} />
            ) : (
              <>
                <input className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-bold" placeholder="账号" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} />
                <input type="password"  className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-bold" placeholder="密码" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
              </>
            )}
            <button onClick={isRegistering ? handleCreateEnterprise : handleLogin} className="w-full bg-brand-600 text-white py-4 rounded-2xl font-black uppercase text-xs">
              {isRegistering ? '立即创建' : '验证并进入'}
            </button>
          </div>
        </div>

        {showRegSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-6">
            <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl text-center">
              <h2 className="text-2xl font-black mb-4">创建成功！</h2>
              <div className="bg-slate-50 rounded-2xl p-6 text-left mb-8">
                <p>管理员账号: <b>admin</b></p>
                <p>初始密码: <b>888888</b></p>
              </div>
              <button onClick={() => { setIsRegistering(false); setShowRegSuccess(null); }} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black">返回登录</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800 font-black text-xl text-white">StratFlow</div>
        <nav className="flex-1 p-4 space-y-1">
          <button onClick={() => setActiveTab('process')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${activeTab === 'process' ? 'bg-brand-600 text-white' : ''}`}>流程资产</button>
          <button onClick={() => setActiveTab('okr')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${activeTab === 'okr' ? 'bg-brand-600 text-white' : ''}`}>OKR 战略</button>
          <button onClick={() => setActiveTab('weekly')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${activeTab === 'weekly' ? 'bg-brand-600 text-white' : ''}`}>周度 PAD</button>
          <button onClick={() => setActiveTab('org')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${activeTab === 'org' ? 'bg-brand-600 text-white' : ''}`}>组织架构</button>
          <button onClick={() => setActiveTab('user')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${activeTab === 'user' ? 'bg-brand-600 text-white' : ''}`}>用户管理</button>
        </nav>
        <div className="p-4 border-t border-slate-800 text-xs flex justify-between">
           <span>{currentUser.name}</span>
           <button onClick={() => { setAuthenticatedEnt(null); setCurrentUser(null); }} className="text-red-400">登出</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 bg-white border-b flex items-center justify-between px-8">
          <h2 className="text-lg font-black">{activeTab}</h2>
          <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-brand-600 text-white rounded-xl text-xs font-black">
            {isSaving ? '正在保存...' : '持久化存档'}
          </button>
        </header>
        <div className="flex-1 overflow-hidden p-6">
          {activeTab === 'process' && <ProcessView processes={state.processes} departments={state.departments} currentProcessId={currentProcessId} setCurrentProcessId={setCurrentProcessId} setProcessData={setProcessData} updateProcessProps={updateProcessProps} addProcess={addProcess} deleteProcess={deleteProcessLocal} publishProcess={()=>{}} rollbackProcess={()=>{}} />}
          {activeTab === 'org' && <OrgView processes={state.processes} departments={state.departments} setDepartments={setDepartments} navigateToProcess={()=>{}} />}
          {activeTab === 'okr' && <StrategyView state={state} setStrategy={setStrategy} setDepartments={setDepartments} />}
          {activeTab === 'weekly' && <WeeklyView state={state} setWeeklyPADs={setWeeklyPADs} onSave={handleSave} isSaving={isSaving} saveSuccess={showSaveSuccess} currentUser={currentUser!} />}
          {activeTab === 'user' && <UserView state={state} setUsers={setUsers} currentUser={currentUser!} setCurrentUser={setCurrentUser} />}
        </div>
      </main>
    </div>
  );
};

export default App;
