import React, { useState, useEffect, useCallback } from 'react';
import ProcessView from './components/ProcessView';
import OrgView from './components/OrgView';
import StrategyView from './components/StrategyView';
import WeeklyView from './components/WeeklyView';
import UserView from './components/UserView';
import { AppState, ProcessDefinition, Department, Enterprise, User, WeeklyPAD } from './types';
import { getEnterprises, saveEnterprise, getWorkspace, login, saveProcess, saveStrategy, saveDepartments, savePADs, deleteProcessFromDb } from './data';
import { GitGraph, Target, Building2, Calendar, LogOut, ShieldCheck, UserCog, CheckCircle, CloudUpload, Loader2 } from 'lucide-react';

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
    // Fix: Added missing properties customerIssues and employeeIssues to match CompanyStrategy interface
    strategy: { mission: '', vision: '', customerIssues: '', employeeIssues: '', companyOKRs: {} },
    users: [],
    weeklyPADs: []
  });

  useEffect(() => {
    getEnterprises().then(setEnterprises).catch(() => {});
  }, []);

  const handleLogin = async () => {
    try {
      const user = await login(entId, loginUsername, loginPassword);
      setAuthenticatedEnt(entId);
      setCurrentUser(user);
      const data = await getWorkspace(entId);
      setState(data);
    } catch (e) {
      console.error("Login error:", e);
      alert('登录失败：身份验证无效或数据库连接异常');
    }
  };

  const handleSave = async () => {
    if (!authenticatedEnt) return;
    setIsSaving(true);
    try {
      await Promise.all([
        saveStrategy(authenticatedEnt, state.strategy),
        saveDepartments(authenticatedEnt, state.departments),
        savePADs(authenticatedEnt, state.weeklyPADs),
        ...state.processes.map(p => saveProcess(authenticatedEnt, p))
      ]);
      const freshData = await getWorkspace(authenticatedEnt);
      setState(freshData);
      setIsSaving(false);
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
    } catch (error) {
      console.error("Save failed:", error);
      setIsSaving(false);
      alert('持久化保存失败，请检查数据库服务。');
    }
  };

  const deleteProcess = async (id: string) => {
    if (!authenticatedEnt) return;
    if (confirm('确定要删除该流程资产吗？数据库记录将被移除。')) {
      try {
        await deleteProcessFromDb(authenticatedEnt, id);
        setState(prev => ({ ...prev, processes: prev.processes.filter(p => p.id !== id) }));
        if (currentProcessId === id) setCurrentProcessId(null);
      } catch (e) {
        alert('删除失败');
      }
    }
  };

  if (!authenticatedEnt || !currentUser) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 p-6">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10">
          <div className="text-center mb-8">
            <ShieldCheck className="h-12 w-12 text-brand-600 mx-auto mb-2" />
            <h1 className="text-2xl font-black text-slate-800 tracking-tighter">StratFlow AI</h1>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
            <button onClick={() => setIsRegistering(false)} className={`flex-1 py-2 text-xs font-black uppercase rounded-xl ${!isRegistering ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400'}`}>登录</button>
            <button onClick={() => setIsRegistering(true)} className={`flex-1 py-2 text-xs font-black uppercase rounded-xl ${isRegistering ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400'}`}>注册</button>
          </div>
          <div className="space-y-4">
            <input className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-bold outline-none focus:border-brand-500 transition-colors" placeholder="企业 ID" value={entId} onChange={e => setEntId(e.target.value)} />
            {isRegistering ? (
              <input className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-bold outline-none focus:border-brand-500 transition-colors" placeholder="企业全称" value={entDisplayName} onChange={e => setEntDisplayName(e.target.value)} />
            ) : (
              <>
                <input className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-bold outline-none focus:border-brand-500 transition-colors" placeholder="账号" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} />
                <input type="password"  className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-bold outline-none focus:border-brand-500 transition-colors" placeholder="密码" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
              </>
            )}
            <button onClick={isRegistering ? async () => { await saveEnterprise({ name: entId, displayName: entDisplayName }); setIsRegistering(false); setShowRegSuccess({ name: entId, displayName: entDisplayName }); } : handleLogin} className="w-full bg-brand-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-brand-700 transition-all">
              {isRegistering ? '初始化云空间' : '身份验证并进入'}
            </button>
          </div>
        </div>
        {showRegSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-6">
            <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full text-center shadow-2xl">
              <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-2xl font-black mb-4">空间创建成功</h2>
              <p className="text-sm text-slate-500 mb-6">默认管理员: <b>admin</b> / 密码: <b>888888</b></p>
              <button onClick={() => setShowRegSuccess(null)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black">返回登录</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 p-4">
        <div className="p-4 mb-8 font-black text-xl text-white tracking-tighter">StratFlow</div>
        <nav className="flex-1 space-y-1">
          <SidebarBtn active={activeTab === 'process'} onClick={() => { setActiveTab('process'); setCurrentProcessId(null); }} icon={<GitGraph />} label="流程资产库" />
          <SidebarBtn active={activeTab === 'okr'} onClick={() => setActiveTab('okr')} icon={<Target />} label="OKR 战略治理" />
          <SidebarBtn active={activeTab === 'weekly'} onClick={() => setActiveTab('weekly')} icon={<Calendar />} label="周度 PAD 治理" />
          <SidebarBtn active={activeTab === 'org'} onClick={() => setActiveTab('org')} icon={<Building2 />} label="组织架构管理" />
          <SidebarBtn active={activeTab === 'user'} onClick={() => setActiveTab('user')} icon={<UserCog />} label="系统权限中心" />
        </nav>
        <button onClick={() => { setAuthenticatedEnt(null); setCurrentUser(null); }} className="p-4 text-xs text-red-400 font-bold flex items-center gap-2 hover:bg-slate-800 rounded-xl transition-all"><LogOut size={16}/>安全登出</button>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 shrink-0 shadow-sm">
          <h2 className="text-lg font-black uppercase tracking-tighter text-slate-800">{activeTab}</h2>
          <div className="flex items-center gap-4">
            <button onClick={handleSave} disabled={isSaving} className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all shadow-lg flex items-center gap-2 ${showSaveSuccess ? 'bg-emerald-500 text-white scale-105' : 'bg-brand-600 text-white hover:bg-brand-700'}`}>
              {showSaveSuccess ? <CheckCircle size={14}/> : (isSaving ? <Loader2 className="animate-spin" size={14}/> : <CloudUpload size={14}/>)}
              {showSaveSuccess ? '同步成功' : (isSaving ? '正在提交...' : '持久化存档')}
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-hidden p-6">
          {activeTab === 'process' && <ProcessView processes={state.processes} departments={state.departments} currentProcessId={currentProcessId} setCurrentProcessId={setCurrentProcessId} setProcessData={(id, n, l) => setState(p => ({...p, processes: p.processes.map(pr => pr.id === id ? {...pr, nodes: n, links: l} : pr)}))} updateProcessProps={(id, props) => setState(p => ({...p, processes: p.processes.map(pr => pr.id === id ? {...pr, ...props} : pr)}))} addProcess={(cat, lvl, name) => { const n: ProcessDefinition = { id: `p-${Date.now()}`, name, category: cat, level: lvl, version: 'V1.0', isActive: true, nodes: [], links: [], owner: '', coOwner: '', objective: '', history: [], updatedAt: Date.now(), type: 'main' }; setState(p => ({...p, processes: [...p.processes, n]})); setCurrentProcessId(n.id); }} deleteProcess={deleteProcess} publishProcess={()=>{}} rollbackProcess={()=>{}} />}
          {activeTab === 'okr' && <StrategyView state={state} setStrategy={s => setState(p => ({...p, strategy: {...p.strategy, ...s}}))} setDepartments={d => setState(p => ({...p, departments: d}))} />}
          {activeTab === 'weekly' && <WeeklyView state={state} setWeeklyPADs={pads => setState(p => ({...p, weeklyPADs: pads}))} onSave={handleSave} isSaving={isSaving} saveSuccess={showSaveSuccess} currentUser={currentUser!} />}
          {activeTab === 'org' && <OrgView processes={state.processes} departments={state.departments} setDepartments={d => setState(p => ({...p, departments: d}))} navigateToProcess={id => { setCurrentProcessId(id); setActiveTab('process'); }} />}
          {activeTab === 'user' && <UserView state={state} setUsers={u => setState(p => ({...p, users: u}))} currentUser={currentUser!} setCurrentUser={setCurrentUser} />}
        </div>
      </main>
    </div>
  );
};

const SidebarBtn = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-brand-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}>
    {React.cloneElement(icon, { size: 18 })} <span className="font-bold text-sm">{label}</span>
  </button>
);

export default App;