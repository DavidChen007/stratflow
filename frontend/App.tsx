
import React, { useState, useEffect } from 'react';
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
  
  const [entId, setEntId] = useState('');
  const [entDisplayName, setEntDisplayName] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  const [state, setState] = useState<AppState>({
    processes: [],
    departments: [],
    strategy: { mission: '', vision: '', companyOKRs: {} },
    users: [],
    weeklyPADs: []
  });

  useEffect(() => {
    getEnterprises().catch(console.error);
  }, []);

  const handleLogin = async () => {
    try {
      const user = await login(entId, loginUsername, loginPassword);
      setAuthenticatedEnt(entId);
      setCurrentUser(user);
      const data = await getWorkspace(entId);
      setState(data);
    } catch (e) {
      alert('验证失败，请检查企业 ID 或登录凭据。');
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
      setIsSaving(false);
      alert('保存失败，请检查网络或后端配置。');
    }
  };

  if (!authenticatedEnt || !currentUser) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 p-6">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95 duration-300">
          <div className="text-center mb-8">
            <ShieldCheck className="h-12 w-12 text-brand-600 mx-auto mb-2" />
            <h1 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">StratFlow AI</h1>
            <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mt-1">Strategic Asset Governance</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
            <button onClick={() => setIsRegistering(false)} className={`flex-1 py-2 text-xs font-black uppercase rounded-xl transition-all ${!isRegistering ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400'}`}>验证登录</button>
            <button onClick={() => setIsRegistering(true)} className={`flex-1 py-2 text-xs font-black uppercase rounded-xl transition-all ${isRegistering ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400'}`}>新开空间</button>
          </div>
          <div className="space-y-4">
            <input className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-bold outline-none focus:border-brand-500" placeholder="企业 ID" value={entId} onChange={e => setEntId(e.target.value)} />
            {isRegistering ? (
              <input className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-bold outline-none focus:border-brand-500" placeholder="企业全称" value={entDisplayName} onChange={e => setEntDisplayName(e.target.value)} />
            ) : (
              <>
                <input className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-bold outline-none focus:border-brand-500" placeholder="治理账号" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} />
                <input type="password"  className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-bold outline-none focus:border-brand-500" placeholder="登录密码" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
              </>
            )}
            <button onClick={isRegistering ? async () => { await saveEnterprise({ name: entId, displayName: entDisplayName }); setIsRegistering(false); alert("空间初始化成功，默认管理员账号: admin / 密码: 888888"); } : handleLogin} className="w-full bg-brand-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-brand-700 transition-all">
              {isRegistering ? '初始化治理底座' : '建立安全连接'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 p-4">
        <div className="p-4 mb-8 font-black text-xl text-white tracking-tighter flex items-center gap-2"><ShieldCheck className="text-brand-500" /> StratFlow</div>
        <nav className="flex-1 space-y-1">
          <SidebarBtn active={activeTab === 'process'} onClick={() => { setActiveTab('process'); setCurrentProcessId(null); }} icon={<GitGraph />} label="流程资产库" />
          <SidebarBtn active={activeTab === 'okr'} onClick={() => setActiveTab('okr')} icon={<Target />} label="战略评估" />
          <SidebarBtn active={activeTab === 'weekly'} onClick={() => setActiveTab('weekly')} icon={<Calendar />} label="PAD 治理" />
          <SidebarBtn active={activeTab === 'org'} onClick={() => setActiveTab('org')} icon={<Building2 />} label="组织架构" />
          <SidebarBtn active={activeTab === 'user'} onClick={() => setActiveTab('user')} icon={<UserCog />} label="权限中心" />
        </nav>
        <button onClick={() => { setAuthenticatedEnt(null); setCurrentUser(null); }} className="p-4 text-xs text-red-400 font-bold flex items-center gap-2 hover:bg-slate-800 rounded-xl transition-all"><LogOut size={16}/>注销</button>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 shrink-0 shadow-sm z-10">
          <h2 className="text-lg font-black uppercase tracking-tighter text-slate-800">{activeTab}</h2>
          <div className="flex items-center gap-4">
            <button onClick={handleSave} disabled={isSaving} className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all shadow-lg flex items-center gap-2 ${showSaveSuccess ? 'bg-emerald-500 text-white scale-105' : 'bg-brand-600 text-white hover:bg-brand-700'}`}>
              {showSaveSuccess ? <CheckCircle size={14}/> : (isSaving ? <Loader2 className="animate-spin" size={14}/> : <CloudUpload size={14}/>)}
              {showSaveSuccess ? '同步成功' : (isSaving ? '正在同步' : '云端同步')}
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-hidden p-6">
          {activeTab === 'process' && <ProcessView processes={state.processes} departments={state.departments} currentProcessId={currentProcessId} setCurrentProcessId={setCurrentProcessId} setProcessData={(id, n, l) => setState(p => ({...p, processes: p.processes.map(pr => pr.id === id ? {...pr, nodes: n, links: l} : pr)}))} updateProcessProps={(id, props) => setState(p => ({...p, processes: p.processes.map(pr => pr.id === id ? {...pr, ...props} : pr)}))} addProcess={(cat, lvl, name) => { const n: ProcessDefinition = { id: `p-${Date.now()}`, name, category: cat, level: lvl, version: 'V1.0', isActive: true, nodes: [], links: [], owner: '', coOwner: '', objective: '', history: [], updatedAt: Date.now(), type: 'main' }; setState(p => ({...p, processes: [...p.processes, n]})); setCurrentProcessId(n.id); }} deleteProcess={id => deleteProcessFromDb(authenticatedEnt!, id).then(() => setState(p => ({...p, processes: p.processes.filter(pr => pr.id !== id)})))} publishProcess={()=>{}} rollbackProcess={()=>{}} />}
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
