
import React, { useState, useMemo } from 'react';
import { AppState, OKR, Department, CompanyStrategy } from '../types';
import { checkOKRQuality } from '../services/gemini';
import { Loader2, ChevronDown, Building2, Plus, Trash2, ShieldCheck, Calendar, Link2 } from 'lucide-react';

interface StrategyViewProps {
  state: AppState;
  setStrategy: (s: Partial<CompanyStrategy>) => void;
  setDepartments: (d: Department[]) => void;
}

const StrategyView: React.FC<StrategyViewProps> = ({ state, setStrategy, setDepartments }) => {
  const [checking, setChecking] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'define' | 'company-okr' | 'dept-okr'>('define');
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [activeQuarter, setActiveQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q1');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [aiResult, setAiResult] = useState<{ id: string, text: string } | null>(null);

  const years = [2023, 2024, 2025, 2026];

  const currentCompanyOKRs = useMemo(() => state.strategy.companyOKRs[selectedYear] || [], [state.strategy.companyOKRs, selectedYear]);

  const runAiCheck = async (id: string, obj: string, krs: string[]) => {
    setChecking(id);
    const result = await checkOKRQuality(obj, krs);
    setAiResult({ id, text: result });
    setChecking(null);
  };

  const updateCompanyObjective = (idx: number, objective: string) => {
    const yearOKRs = [...currentCompanyOKRs];
    yearOKRs[idx] = { ...yearOKRs[idx], objective };
    setStrategy({ companyOKRs: { ...state.strategy.companyOKRs, [selectedYear]: yearOKRs } });
  };

  const updateDeptOkr = (deptId: string, q: string, idx: number, updates: Partial<OKR>) => {
    const depts = state.departments.map(d => {
      if (d.id !== deptId) return d;
      const deptOkrs = { ...(d.okrs || {}) };
      const yearOkrs = { ...(deptOkrs[selectedYear] || {}) };
      const list = [...(yearOkrs[q] || [])];
      list[idx] = { ...list[idx], ...updates };
      yearOkrs[q] = list;
      deptOkrs[selectedYear] = yearOkrs;
      return { ...d, okrs: deptOkrs };
    });
    setDepartments(depts);
  };

  const addDeptOkr = (deptId: string, q: string) => {
    const depts = state.departments.map(d => {
      if (d.id !== deptId) return d;
      const deptOkrs = { ...(d.okrs || {}) };
      const yearOkrs = { ...(deptOkrs[selectedYear] || {}) };
      const list = [...(yearOkrs[q] || []), { id: `okr-${Date.now()}`, objective: '新目标...', keyResults: ['新指标...'] }];
      yearOkrs[q] = list;
      deptOkrs[selectedYear] = yearOkrs;
      return { ...d, okrs: deptOkrs };
    });
    setDepartments(depts);
  };

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="bg-white p-4 rounded-3xl border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-black tracking-tighter">战略治理中心</h2>
          <div className="flex items-center bg-slate-50 border rounded-xl px-3 py-1 gap-2">
            <Calendar size={14} className="text-slate-400"/><select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="bg-transparent text-xs font-black outline-none">{years.map(y => <option key={y} value={y}>{y} 年度</option>)}</select>
          </div>
        </div>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl">
          {['define', 'company-okr', 'dept-okr'].map(t => <button key={t} onClick={() => setActiveTab(t as any)} className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === t ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'}`}>{t === 'define' ? '使命愿景' : t === 'company-okr' ? '公司年度' : '部门季度'}</button>)}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {activeTab === 'define' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl border-4 border-slate-800">
              <label className="text-[10px] font-black text-brand-400 uppercase tracking-widest block mb-4">企业使命 (Mission)</label>
              <textarea className="w-full bg-transparent text-white font-black text-2xl outline-none h-40 resize-none placeholder-slate-700" placeholder="我们存在的意义..." value={state.strategy.mission} onChange={e => setStrategy({ mission: e.target.value })} />
            </div>
            <div className="bg-white p-10 rounded-[3rem] shadow-xl border-4 border-brand-500">
              <label className="text-[10px] font-black text-brand-600 uppercase tracking-widest block mb-4">企业愿景 (Vision)</label>
              <textarea className="w-full bg-transparent text-brand-900 font-black text-2xl outline-none h-40 resize-none placeholder-brand-100" placeholder="我们奋斗的目标..." value={state.strategy.vision} onChange={e => setStrategy({ vision: e.target.value })} />
            </div>
          </div>
        )}

        {activeTab === 'company-okr' && (
          <div className="max-w-3xl mx-auto space-y-6 pb-12">
            <header className="flex justify-between items-center"><h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">{selectedYear} 年度公司 OKR</h3><button onClick={() => setStrategy({ companyOKRs: { ...state.strategy.companyOKRs, [selectedYear]: [...currentCompanyOKRs, { id: `c-okr-${Date.now()}`, objective: '新战略目标...', keyResults: ['具体指标...'] }] } })} className="text-brand-600 font-black text-xs px-4 py-2 hover:bg-brand-50 rounded-xl transition-colors">+ 新增年度目标</button></header>
            {currentCompanyOKRs.map((o, i) => (
              <div key={o.id} className="bg-white p-8 rounded-[2rem] border-2 shadow-sm relative border-l-8 border-l-brand-600">
                <div className="flex gap-4 items-start mb-6">
                  <div className="bg-brand-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase mt-1">Goal {i+1}</div>
                  <input className="flex-1 bg-transparent text-2xl font-black text-slate-800 tracking-tighter outline-none" value={o.objective} onChange={e => updateCompanyObjective(i, e.target.value)} />
                  <button onClick={() => runAiCheck(o.id, o.objective, o.keyResults)} disabled={checking === o.id} className="p-2 text-brand-600 hover:bg-brand-50 rounded-xl">{checking === o.id ? <Loader2 className="animate-spin h-5 w-5"/> : <ShieldCheck size={20}/>}</button>
                </div>
                <div className="space-y-2">{o.keyResults.map((kr, ki) => <div key={ki} className="bg-slate-50 p-3 rounded-xl border text-xs font-bold text-slate-600 flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-brand-400"/>{kr}</div>)}</div>
                {aiResult?.id === o.id && <div className="mt-4 p-6 bg-emerald-50 rounded-2xl border border-emerald-100 text-[10px] font-bold text-emerald-800 animate-in slide-in-from-top-2" dangerouslySetInnerHTML={{ __html: aiResult.text }} />}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'dept-okr' && (
          <div className="max-w-4xl mx-auto space-y-4 pb-12">
            <div className="flex justify-center gap-2 mb-8">{['Q1', 'Q2', 'Q3', 'Q4'].map(q => <button key={q} onClick={() => setActiveQuarter(q as any)} className={`px-8 py-2 rounded-xl text-[10px] font-black transition-all ${activeQuarter === q ? 'bg-slate-900 text-white shadow-xl scale-105' : 'bg-white text-slate-400 border'}`}>{q} 季度</button>)}</div>
            {state.departments.map(d => {
              const quarterOkrs = (d.okrs?.[selectedYear]?.[activeQuarter]) || [];
              return (
                <div key={d.id} className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden mb-4">
                  <div onClick={() => setExpandedDept(expandedDept === d.id ? null : d.id)} className="p-6 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"><div className="flex items-center gap-4"><Building2 className="text-slate-400"/><h4 className="font-black text-lg">{d.name}</h4></div><div className="flex items-center gap-4"><span className="text-[10px] font-black px-2 py-1 bg-brand-50 text-brand-600 rounded">{quarterOkrs.length} 目标</span><ChevronDown className={`transition-transform ${expandedDept === d.id ? 'rotate-180' : ''}`}/></div></div>
                  {expandedDept === d.id && (
                    <div className="p-8 bg-slate-50/50 border-t space-y-4">
                      {quarterOkrs.map((okr, idx) => (
                        <div key={okr.id} className="bg-white p-6 rounded-3xl border shadow-sm">
                          <div className="flex flex-col md:flex-row gap-4 md:items-center mb-4">
                             <input className="flex-1 font-black text-slate-800 outline-none text-base border-b-2 border-slate-50 focus:border-brand-300 transition-colors bg-transparent" value={okr.objective} onChange={e => updateDeptOkr(d.id, activeQuarter, idx, { objective: e.target.value })} />
                             <div className="flex items-center bg-slate-100 px-3 py-1.5 rounded-lg gap-2 border"><Link2 size={12} className="text-slate-400"/><select className="bg-transparent text-[10px] font-black outline-none appearance-none" value={okr.alignedToId} onChange={e => updateDeptOkr(d.id, activeQuarter, idx, { alignedToId: e.target.value })}><option value="">未对齐公司目标</option>{currentCompanyOKRs.map(co => <option key={co.id} value={co.id}>对齐: {co.objective}</option>)}</select></div>
                             <button onClick={() => runAiCheck(okr.id, okr.objective, okr.keyResults)} disabled={checking === okr.id} className="p-2 bg-brand-50 text-brand-600 rounded-lg">{checking === okr.id ? <Loader2 className="animate-spin h-3 w-3"/> : <ShieldCheck size={16}/>}</button>
                          </div>
                          <div className="space-y-2">{okr.keyResults.map((kr, ki) => <div key={ki} className="text-xs font-bold text-slate-500 pl-4 border-l-2 border-brand-200 py-1">{kr}</div>)}</div>
                        </div>
                      ))}
                      <button onClick={() => addDeptOkr(d.id, activeQuarter)} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-black uppercase text-xs hover:border-brand-300 hover:text-brand-600 transition-all">+ 新增季度目标</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StrategyView;
