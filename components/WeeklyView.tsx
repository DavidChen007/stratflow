
import React, { useState, useMemo, useEffect } from 'react';
import { AppState, WeeklyPAD, PADEntry, Department, User } from '../types';
import { Calendar as CalendarIcon, Plus, Trash2, ShieldCheck, CheckCircle, Wand2, Loader2, UserCircle, Building2, ChevronDown, Link2, User as UserIcon } from 'lucide-react';
import { checkPADQuality } from '../services/gemini';

interface WeeklyViewProps {
  state: AppState;
  setWeeklyPADs: (pads: WeeklyPAD[]) => void;
  onSave: () => void;
  isSaving: boolean;
  saveSuccess: boolean;
  currentUser: User;
}

const WeeklyView: React.FC<WeeklyViewProps> = ({ state, setWeeklyPADs, onSave, isSaving, saveSuccess, currentUser }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dept' | 'user'>('dept');
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>(''); // Selected Department or User ID
  const [checkingIdx, setCheckingIdx] = useState<number | null>(null);

  const years = [2023, 2024, 2025, 2026];

  // Flatten departments for selection
  const flatDepts = useMemo(() => {
    const list: Department[] = [];
    const collect = (depts: Department[]) => {
      depts.forEach(d => {
        list.push(d);
        if (d.subDepartments) collect(d.subDepartments);
      });
    };
    collect(state.departments);
    return list;
  }, [state.departments]);

  // Set default owner on load or tab change
  useEffect(() => {
    if (activeTab === 'dept') {
      setSelectedOwnerId(currentUser.departmentId || flatDepts[0]?.id || '');
    } else {
      setSelectedOwnerId(currentUser.id);
    }
  }, [activeTab, currentUser, flatDepts]);

  const getWeekRange = (year: number, week: number) => {
    const d = new Date(year, 0, 1 + (week - 1) * 7);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d.setDate(diff));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const fmt = (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`;
    return `${fmt(start)} - ${fmt(end)}`;
  };

  const weeks = useMemo(() => Array.from({ length: 52 }, (_, i) => ({ id: `${selectedYear}-W${i + 1}`, label: `第 ${i + 1} 周`, range: getWeekRange(selectedYear, i + 1) })), [selectedYear]);

  // Current selected PAD
  const currentPAD = useMemo(() => 
    state.weeklyPADs.find(p => p.weekId === selectedWeek && p.type === activeTab && p.ownerId === selectedOwnerId),
  [state.weeklyPADs, selectedWeek, activeTab, selectedOwnerId]);

  const availableOkrs = useMemo(() => {
    if (!selectedWeek) return [];
    const weekNum = parseInt(selectedWeek.split('-W')[1]);
    const q = weekNum <= 13 ? 'Q1' : weekNum <= 26 ? 'Q2' : weekNum <= 39 ? 'Q3' : 'Q4';
    const list: any[] = [];
    
    // Filter OKRs relevant to the selected department or user's department
    const targetDeptId = activeTab === 'dept' ? selectedOwnerId : currentUser.departmentId;

    state.departments.forEach(d => {
      // Find the specific department goals
      if (d.id === targetDeptId) {
        (d.okrs?.[selectedYear]?.[q] || []).forEach(o => list.push({ id: o.id, name: o.objective, dept: d.name }));
      }
    });

    // If no specific department goals, fallback to company goals if linked
    if (list.length === 0) {
      state.departments.forEach(d => {
        (d.okrs?.[selectedYear]?.[q] || []).forEach(o => list.push({ id: o.id, name: o.objective, dept: d.name }));
      });
    }

    return list;
  }, [selectedWeek, selectedYear, state.departments, selectedOwnerId, activeTab, currentUser]);

  const updatePAD = (updates: Partial<WeeklyPAD>) => {
    if (!selectedWeek || !selectedOwnerId) return;
    const existingIndex = state.weeklyPADs.findIndex(p => p.weekId === selectedWeek && p.type === activeTab && p.ownerId === selectedOwnerId);
    const newPads = [...state.weeklyPADs];
    
    if (existingIndex > -1) {
      newPads[existingIndex] = { ...newPads[existingIndex], ...updates };
    } else {
      newPads.push({ id: `pad-${Date.now()}`, weekId: selectedWeek, ownerId: selectedOwnerId, type: activeTab, entries: [], ...updates });
    }
    setWeeklyPADs(newPads);
  };

  const addEntry = () => updatePAD({ entries: [...(currentPAD?.entries || []), { plan: '', action: '', deliverable: '', alignedOkrId: '' }] });

  const updateEntry = (idx: number, field: keyof PADEntry, val: string) => {
    const entries = [...(currentPAD?.entries || [])];
    entries[idx] = { ...entries[idx], [field]: val };
    updatePAD({ entries });
  };

  const runAiCheck = async (idx: number) => {
    const entry = currentPAD?.entries[idx];
    if (!entry) return;
    setCheckingIdx(idx);
    const res = await checkPADQuality(entry.plan, entry.action, entry.deliverable);
    alert(res);
    setCheckingIdx(null);
  };

  const ownerName = useMemo(() => {
    if (activeTab === 'dept') {
      return flatDepts.find(d => d.id === selectedOwnerId)?.name || '未选定部门';
    } else {
      return state.users.find(u => u.id === selectedOwnerId)?.name || '个人用户';
    }
  }, [activeTab, selectedOwnerId, flatDepts, state.users]);

  return (
    <div className="h-full flex flex-col gap-6 overflow-hidden">
      <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex flex-col md:flex-row justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600"><CalendarIcon/></div>
          <div><h2 className="text-xl font-black text-slate-800">周度效能治理 (PAD)</h2><div className="flex items-center bg-slate-100 border rounded-lg px-2 py-0.5 gap-1"><select value={selectedYear} onChange={e => { setSelectedYear(Number(e.target.value)); setSelectedWeek(null); }} className="bg-transparent text-[10px] font-black outline-none">{years.map(y => <option key={y} value={y}>{y} 年度</option>)}</select></div></div>
        </div>
      </div>
      <div className="flex-1 flex gap-6 overflow-hidden">
        <div className="w-80 bg-white border rounded-[2rem] p-6 overflow-y-auto custom-scrollbar shrink-0 shadow-inner">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">选择治理周期</h3>
           <div className="space-y-2">{weeks.map(w => <button key={w.id} onClick={() => setSelectedWeek(w.id)} className={`w-full p-3 rounded-xl transition-all flex justify-between items-center ${selectedWeek === w.id ? 'bg-slate-900 text-white shadow-lg' : 'hover:bg-slate-50 text-slate-500'}`}><span className="text-xs font-black">{w.label}</span><span className={`text-[9px] font-bold ${selectedWeek === w.id ? 'text-slate-400' : 'text-slate-300'}`}>{w.range}</span></button>)}</div>
        </div>
        <div className="flex-1 bg-white border rounded-[2rem] flex flex-col overflow-hidden shadow-sm">
          {!selectedWeek ? <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-20 text-center"><CalendarIcon size={64} strokeWidth={1}/><p className="mt-4 font-black uppercase text-sm tracking-widest">请从左侧列表选择一个业务周</p></div> : (
            <>
              <div className="p-8 border-b bg-slate-50/50 flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div><h3 className="text-2xl font-black tracking-tighter">{selectedWeek} PAD</h3><p className="text-[10px] font-bold text-slate-400 uppercase">{weeks.find(w => w.id === selectedWeek)?.range}</p></div>
                    <div className="flex bg-slate-200 p-1 rounded-xl">
                      <button onClick={() => setActiveTab('dept')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'dept' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'}`}><Building2 className="inline mr-1 h-3 w-3"/> 部门级</button>
                      <button onClick={() => setActiveTab('user')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'user' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'}`}><UserCircle className="inline mr-1 h-3 w-3"/> 个人级</button>
                    </div>
                  </div>
                  <button onClick={addEntry} className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase shadow-xl transition-all active:scale-95"><Plus className="inline mr-1 h-4 w-4"/> 新增治理项</button>
                </div>
                
                <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                   <div className="flex-1 flex items-center gap-3">
                     {activeTab === 'dept' ? (
                       <>
                         <Building2 className="text-brand-500" size={18}/>
                         <label className="text-[10px] font-black text-slate-400 uppercase">管理部门：</label>
                         <select value={selectedOwnerId} onChange={e => setSelectedOwnerId(e.target.value)} className="bg-slate-50 px-3 py-1.5 rounded-lg text-xs font-bold outline-none border focus:border-brand-500">
                           {flatDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                         </select>
                       </>
                     ) : (
                       <>
                         <UserIcon className="text-brand-500" size={18}/>
                         <label className="text-[10px] font-black text-slate-400 uppercase">当前人员：</label>
                         {currentUser.role === 'Admin' ? (
                           <select value={selectedOwnerId} onChange={e => setSelectedOwnerId(e.target.value)} className="bg-slate-50 px-3 py-1.5 rounded-lg text-xs font-bold outline-none border focus:border-brand-500">
                             {state.users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.username})</option>)}
                           </select>
                         ) : (
                           <span className="text-xs font-black text-slate-800">{currentUser.name} (本人)</span>
                         )}
                       </>
                     )}
                   </div>
                   <div className="text-[10px] font-black text-brand-600 uppercase tracking-widest px-3 py-1 bg-brand-50 rounded-lg">正在编辑: {ownerName}</div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-slate-50/20">
                {(currentPAD?.entries || []).length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20 italic">
                    <CheckCircle size={40} className="mb-2 opacity-10"/>
                    <p className="text-sm">暂无治理记录，请点击上方按钮新增</p>
                  </div>
                ) : (currentPAD?.entries || []).map((entry, idx) => (
                  <div key={idx} className="bg-white p-8 rounded-[2.5rem] border-2 shadow-sm relative group animate-in slide-in-from-bottom-4 border-slate-100">
                    <div className="mb-6 flex items-center justify-between">
                      <div className="flex items-center gap-2 bg-slate-50 border px-3 py-1.5 rounded-xl">
                        <Link2 size={12} className="text-slate-400"/>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">对齐战略 OKR:</label>
                        <select className="bg-transparent text-[10px] font-black outline-none appearance-none cursor-pointer max-w-[300px]" value={entry.alignedOkrId} onChange={e => updateEntry(idx, 'alignedOkrId', e.target.value)}>
                          <option value="">未关联季度目标</option>
                          {availableOkrs.map(o => <option key={o.id} value={o.id}>[{o.dept}] {o.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="space-y-3"><label className="text-[10px] font-black text-brand-500 uppercase tracking-widest block">Plan (本周目标)</label><textarea className="w-full h-40 p-5 bg-slate-50 border rounded-3xl text-sm font-bold outline-none focus:border-brand-500 focus:bg-white resize-none shadow-inner transition-all" value={entry.plan} onChange={e => updateEntry(idx, 'plan', e.target.value)} /></div>
                      <div className="space-y-3"><label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block">Action (具体行动)</label><textarea className="w-full h-40 p-5 bg-slate-50 border rounded-3xl text-sm font-bold outline-none focus:border-emerald-500 focus:bg-white resize-none shadow-inner transition-all" value={entry.action} onChange={e => updateEntry(idx, 'action', e.target.value)} /></div>
                      <div className="space-y-3"><label className="text-[10px] font-black text-amber-500 uppercase tracking-widest block">Deliverable (交付物)</label><textarea className="w-full h-40 p-5 bg-slate-50 border rounded-3xl text-sm font-bold outline-none focus:border-amber-500 focus:bg-white resize-none shadow-inner transition-all" value={entry.deliverable} onChange={e => updateEntry(idx, 'deliverable', e.target.value)} /></div>
                    </div>
                    <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => runAiCheck(idx)} disabled={checkingIdx === idx} className="p-2.5 bg-brand-50 text-brand-600 rounded-xl hover:bg-brand-100 transition-colors">{checkingIdx === idx ? <Loader2 className="animate-spin h-5 w-5"/> : <Wand2 size={20}/>}</button>
                      <button onClick={() => updatePAD({ entries: (currentPAD?.entries || []).filter((_, i) => i !== idx) })} className="p-2.5 text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeeklyView;
