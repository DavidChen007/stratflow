
import React, { useMemo, useState } from 'react';
import { Department, ProcessNode, ProcessDefinition } from '../types';
import { Plus, Trash2, Building2, ChevronRight, X, Briefcase, ChevronDown, ExternalLink, Search } from 'lucide-react';

interface OrgViewProps {
  processes: ProcessDefinition[];
  departments: Department[];
  setDepartments: (depts: Department[]) => void;
  navigateToProcess: (procId: string) => void;
}

const OrgView: React.FC<OrgViewProps> = ({ processes = [], departments = [], setDepartments, navigateToProcess }) => {
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<{ role: string, associated: any[] } | null>(null);
  const [newDeptName, setNewDeptName] = useState('');
  const [newRoleName, setNewRoleName] = useState('');

  const roleInventory = useMemo(() => {
    const roleMap = new Map<string, any[]>();
    const extract = (nodes: ProcessNode[], pId: string, pName: string) => {
      nodes.forEach(n => {
        const r = n.sipoc?.ownerRole;
        if (r && r !== '岗位' && n.type !== 'start' && n.type !== 'decision' && n.type !== 'end') {
          if (!roleMap.has(r)) roleMap.set(r, []);
          roleMap.get(r)!.push({ procId: pId, procName: pName, nodeLabel: n.label });
        }
        if (n.subProcessNodes) extract(n.subProcessNodes, pId, pName);
      });
    };
    processes.forEach(p => extract(p.nodes, p.id, p.name));
    return roleMap;
  }, [processes]);

  const updateDeptRecursive = (depts: Department[], id: string, updater: (d: Department) => Department): Department[] => {
    return depts.map(d => {
      if (d.id === id) return updater(d);
      if (d.subDepartments) return { ...d, subDepartments: updateDeptRecursive(d.subDepartments, id, updater) };
      return d;
    });
  };

  const addDepartment = (parentId?: string) => {
    if (!newDeptName.trim()) return;
    const newDept: Department = { id: `dept-${Date.now()}`, name: newDeptName, roles: [], subDepartments: [] };
    if (!parentId) {
      setDepartments([...departments, newDept]);
    } else {
      setDepartments(updateDeptRecursive(departments, parentId, d => ({ ...d, subDepartments: [...(d.subDepartments || []), newDept] })));
    }
    setNewDeptName('');
  };

  const addRoleToDept = (deptId: string, roleName: string) => {
    if (!roleName.trim()) return;
    setDepartments(updateDeptRecursive(departments, deptId, d => ({ ...d, roles: Array.from(new Set([...d.roles, roleName])) })));
    setNewRoleName('');
  };

  const renderDeptCard = (d: Department, depth = 0) => (
    <div key={d.id} className="space-y-4">
      <div className={`bg-white p-6 rounded-[2rem] border-2 shadow-sm hover:shadow-lg transition-all relative ${depth > 0 ? 'ml-8 border-slate-100' : 'border-brand-100'}`}>
        <div className="flex justify-between items-start mb-4">
          <div><h4 className="font-black text-xl tracking-tight text-slate-800">{d.name}</h4><div className="flex items-center gap-2 mt-1"><span className="text-[9px] font-bold text-slate-400 uppercase">岗位数: {d.roles.length}</span><button onClick={() => setSelectedDeptId(selectedDeptId === d.id ? null : d.id)} className="text-[9px] font-black text-brand-600 uppercase hover:underline">管理岗位</button></div></div>
          <div className="flex gap-2">
            <button onClick={() => { const name = prompt("子部门名称:"); if(name) { const n: Department = { id: `dept-${Date.now()}`, name, roles: [], subDepartments: [] }; setDepartments(updateDeptRecursive(departments, d.id, d => ({ ...d, subDepartments: [...(d.subDepartments || []), n] }))); } }} className="p-2 text-slate-300 hover:text-brand-600"><Plus size={16}/></button>
            <button onClick={() => setDepartments(departments.filter(it => it.id !== d.id))} className="p-2 text-slate-200 hover:text-red-500"><Trash2 size={16}/></button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">{d.roles.map(r => (<div key={r} onClick={() => setSelectedRole({ role: r, associated: roleInventory.get(r) || [] })} className="px-3 py-1.5 rounded-xl border text-[10px] font-black flex items-center gap-2 cursor-pointer bg-slate-50 hover:border-brand-300"><Briefcase size={10} className="text-brand-500"/>{r}</div>))}</div>
        {selectedDeptId === d.id && (
          <div className="mt-4 p-4 bg-slate-50 rounded-2xl animate-in fade-in"><div className="flex gap-2"><input className="flex-1 p-2 bg-white border rounded-xl text-xs font-bold outline-none" placeholder="新岗位..." value={newRoleName} onChange={e=>setNewRoleName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addRoleToDept(d.id, newRoleName)}/><button onClick={() => addRoleToDept(d.id, newRoleName)} className="p-2 bg-slate-900 text-white rounded-xl"><Plus size={16}/></button></div></div>
        )}
      </div>
      {d.subDepartments?.map(sub => renderDeptCard(sub, depth + 1))}
    </div>
  );

  return (
    <div className="h-full flex flex-col gap-6 overflow-hidden">
      <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex justify-between items-center shrink-0">
        <div><h2 className="text-xl font-black text-slate-800">组织资产架构</h2></div>
        <div className="flex gap-4">
           <input className="px-4 py-2 bg-slate-50 border rounded-xl text-xs font-bold outline-none" placeholder="新部门名称..." value={newDeptName} onChange={e=>setNewDeptName(e.target.value)}/>
           <button onClick={() => addDepartment()} className="bg-brand-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase hover:bg-brand-700 transition-all flex items-center gap-2"><Plus size={16}/> 创建根部门</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-8 pb-24">{departments.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-300 uppercase font-black text-xs">暂无部门数据</div> : <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">{departments.map(d => renderDeptCard(d))}</div>}</div>
    </div>
  );
};

export default OrgView;
