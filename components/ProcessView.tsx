
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ProcessNode, ProcessLink, SIPOC, ProcessDefinition, Department, ProcessCategory, ProcessHistory } from '../types';
import { analyzeProcessSketch } from '../services/gemini';
import { 
  X, Plus, Trash2, Layers, ChevronLeft, ChevronRight, 
  Edit3, ArrowUpRight, Grid, CheckCircle2, Circle, Settings, History, Send, Info, User, Users, Target, RotateCcw, Layout,
  Bold, Italic, List, Image as ImageIcon, Link as LinkIcon, GitMerge, PlayCircle, StopCircle, Wand2, Loader2
} from 'lucide-react';

interface ProcessViewProps {
  processes: ProcessDefinition[];
  departments: Department[];
  currentProcessId: string | null;
  setCurrentProcessId: (id: string | null) => void;
  setProcessData: (id: string, nodes: ProcessNode[], links: ProcessLink[]) => void;
  updateProcessProps: (id: string, props: Partial<ProcessDefinition>) => void;
  addProcess: (category: ProcessCategory, level: 1 | 2, name: string) => void;
  deleteProcess: (id: string) => void;
  publishProcess: (id: string, version: string) => void;
  rollbackProcess: (procId: string, historyId: string) => void;
}

const CATEGORIES: ProcessCategory[] = ['供应链', '需求链', '产品研发', '辅助体系'];
const NODE_W = 170;
const NODE_H = 60;
const CIRCLE_SIZE = 80;

const isArrayField = (field: string): boolean => 
  ['source', 'target', 'inputs', 'outputs', 'customers'].includes(field);

// SIPOC Guidelines
const SIPOC_GUIDES: Record<string, { label: string, hint: string, example: string }> = {
  source: { label: 'S - 来源 (Supplier)', hint: '该环节作业所需的输入是由谁提供的？', example: '例：外部供应商、前置流程节点、ERP系统、采购部' },
  inputs: { label: 'I - 输入 (Input)', hint: '开始该环节作业必须具备的信息、物料或指令是什么？', example: '例：到货通知单、原材料、设计图纸、质量标准' },
  outputs: { label: 'O - 输出 (Output)', hint: '该环节作业完成后，交付给下游的价值产出是什么？', example: '例：入库单、质量检验记录、加工半成品' },
  target: { label: 'C - 客户 (Customer)', hint: '谁是该产出的接收者？', example: '例：仓储部、生产线A、最终消费者、质量部' },
  standard: { label: 'P - 标准 (Procedure)', hint: '具体的操作规范、制度指引或标准作业说明。', example: '例：按照 SOP-LOG-001 执行；检验合格率需 > 99.8%' },
  label: { label: '环节名称', hint: '简洁描述该环节执行的核心动作（动词+名词）。', example: '例：核对订单、入库检验、系统过账' }
};

interface LobbyProcessEntry {
  id: string;
  name: string;
  category: ProcessCategory;
  level: number;
  version: string;
  isActive: boolean;
  isVirtualSub?: boolean;
  parentName?: string;
  nodesCount: number;
  rootId: string;
  path: ProcessNode[];
}

const ProcessView: React.FC<ProcessViewProps> = ({ 
  processes, departments, currentProcessId, setCurrentProcessId, 
  setProcessData, updateProcessProps, addProcess, deleteProcess, publishProcess, rollbackProcess 
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [subProcessPath, setSubProcessPath] = useState<ProcessNode[]>([]);
  const [showNewModal, setShowNewModal] = useState<{ category: ProcessCategory, level: 1 | 2 } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [newProcName, setNewProcName] = useState('');
  const [publishVersion, setPublishVersion] = useState('');
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [editModal, setEditModal] = useState<{ nodeId: string, field: keyof SIPOC | 'label', title: string } | null>(null);
  const [dragInfo, setDragInfo] = useState<{ nodeId: string, startX: number, startY: number, nodeX: number, nodeY: number } | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentProcess = processes.find(p => p.id === currentProcessId);

  // Get flat list of roles from org structure
  const availableRoles = useMemo(() => {
    const roles: string[] = [];
    const collect = (depts: Department[]) => {
      depts.forEach(d => {
        roles.push(...d.roles);
        if (d.subDepartments) collect(d.subDepartments);
      });
    };
    collect(departments);
    return Array.from(new Set(roles)).sort();
  }, [departments]);

  const allLobbyEntries = useMemo(() => {
    const entries: LobbyProcessEntry[] = [];
    const scanNodes = (nodes: ProcessNode[], root: ProcessDefinition, currentPath: ProcessNode[], parentName: string) => {
      nodes.forEach(node => {
        if (node.isSubProcess) {
          entries.push({ id: node.id, name: node.label, category: root.category, level: currentPath.length + 2, version: root.version, isActive: root.isActive, isVirtualSub: true, parentName: parentName, nodesCount: (node.subProcessNodes || []).length, rootId: root.id, path: [...currentPath, node] });
          if (node.subProcessNodes) scanNodes(node.subProcessNodes, root, [...currentPath, node], node.label);
        }
      });
    };
    processes.forEach(p => {
      entries.push({ id: p.id, name: p.name, category: p.category, level: p.level, version: p.version, isActive: p.isActive, isVirtualSub: false, nodesCount: p.nodes.length, rootId: p.id, path: [] });
      scanNodes(p.nodes, p, [], p.name);
    });
    return entries;
  }, [processes]);

  const currentContext = useMemo(() => {
    if (!currentProcess) return { nodes: [], links: [] };
    let nodes = currentProcess.nodes;
    let links = currentProcess.links;
    for (const pathNode of subProcessPath) {
      const parent = nodes.find(n => n.id === pathNode.id);
      if (parent) { nodes = parent.subProcessNodes || []; links = parent.subProcessLinks || []; }
    }
    return { nodes, links };
  }, [currentProcess, subProcessPath]);

  const selectedNode = currentContext.nodes.find(n => n.id === selectedNodeId);

  const updateCurrentData = useCallback((newNodes: ProcessNode[], newLinks: ProcessLink[]) => {
    if (!currentProcessId) return;
    if (subProcessPath.length === 0) {
      setProcessData(currentProcessId, newNodes, newLinks);
    } else {
      const recursiveUpdate = (list: ProcessNode[], depth: number): ProcessNode[] => {
        return list.map(n => {
          if (n.id === subProcessPath[depth].id) {
            if (depth === subProcessPath.length - 1) return { ...n, subProcessNodes: newNodes, subProcessLinks: newLinks, isSubProcess: true };
            return { ...n, subProcessNodes: recursiveUpdate(n.subProcessNodes || [], depth + 1) };
          }
          return n;
        });
      };
      setProcessData(currentProcessId, recursiveUpdate(currentProcess!.nodes, 0), currentProcess!.links);
    }
  }, [currentProcessId, subProcessPath, currentProcess, setProcessData]);

  const handleAiSketchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAiProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const { nodes, links } = await analyzeProcessSketch(base64);
        updateCurrentData(nodes, links);
        setIsAiProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert("AI 识别失败，请检查网络或更换图片。");
      setIsAiProcessing(false);
    }
  };

  const updateNode = useCallback((id: string, updates: Partial<ProcessNode>) => {
    const newNodes = currentContext.nodes.map(n => n.id === id ? { ...n, ...updates } : n);
    updateCurrentData(newNodes, currentContext.links);
  }, [currentContext, updateCurrentData]);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!dragInfo) return;
      const dx = e.clientX - dragInfo.startX;
      const dy = e.clientY - dragInfo.startY;
      updateNode(dragInfo.nodeId, { x: Math.max(0, dragInfo.nodeX + dx), y: Math.max(0, dragInfo.nodeY + dy) });
    };
    const handleGlobalMouseUp = () => setDragInfo(null);
    if (dragInfo) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [dragInfo, updateNode]);

  if (!currentProcessId) {
    return (
      <div className="h-full overflow-y-auto p-10 custom-scrollbar max-w-7xl mx-auto space-y-12 pb-24">
        <header className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter">流程资产大厅</h1>
            <p className="text-slate-400 mt-2 font-bold uppercase tracking-widest text-[10px]">Value Streams & Enterprise Assets</p>
          </div>
        </header>

        {CATEGORIES.map(cat => (
          <section key={cat} className="space-y-6">
            <div className="flex items-center gap-4">
              <h2 className="text-sm font-black text-brand-600 uppercase tracking-widest border-l-4 border-brand-600 pl-4 py-1">{cat}</h2>
              <button onClick={() => setShowNewModal({ category: cat, level: 1 })} className="p-1 text-slate-300 hover:text-brand-500 transition-all"><Plus size={16}/></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allLobbyEntries.filter(e => e.category === cat).map(entry => (
                <div key={entry.id} onClick={() => { setCurrentProcessId(entry.rootId); setSubProcessPath(entry.path); }} className={`group bg-white p-6 rounded-[2rem] border-2 shadow-sm hover:shadow-xl transition-all cursor-pointer relative overflow-hidden ${entry.isActive ? 'border-brand-100' : 'border-slate-100 opacity-70'}`}>
                  <div className="flex justify-between mb-4">
                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${entry.isVirtualSub ? 'bg-brand-50 text-brand-600' : 'bg-slate-900 text-white'}`}>{entry.isVirtualSub ? `L${entry.level} - 子流程` : `L${entry.level} - 主流程`}</span>
                    <div className="flex items-center gap-2"><span className="text-[9px] font-bold text-slate-400">{entry.version}</span>{entry.isActive && <CheckCircle2 size={14} className="text-emerald-500"/>}</div>
                  </div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight group-hover:text-brand-600">{entry.name}</h3>
                  {entry.isVirtualSub && <p className="text-[10px] text-slate-400 mt-1 font-bold italic truncate">所属父级: {entry.parentName}</p>}
                  <div className="mt-4 flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-tighter flex items-center gap-1"><Grid size={12}/> {entry.nodesCount} Nodes</span>
                    {!entry.isVirtualSub && <Trash2 onClick={(e) => { e.stopPropagation(); deleteProcess(entry.id); }} className="h-4 w-4 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"/>}
                  </div>
                </div>
              ))}
              <button onClick={() => setShowNewModal({ category: cat, level: 2 })} className="border-2 border-dashed border-slate-200 rounded-[2rem] p-8 text-slate-300 hover:text-brand-500 hover:border-brand-200 transition-all font-black uppercase text-xs tracking-widest flex flex-col items-center gap-2"><Plus size={24}/> 创建二级流程资产</button>
            </div>
          </section>
        ))}

        {showNewModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in-95">
              <h3 className="text-2xl font-black mb-2">创建流程资产</h3>
              <p className="text-xs text-slate-400 font-bold uppercase mb-8">{showNewModal.category} / Level {showNewModal.level}</p>
              <input autoFocus className="w-full p-5 bg-slate-50 border rounded-2xl mb-8 font-bold outline-none focus:border-brand-500" placeholder="资产名称..." value={newProcName} onChange={e => setNewProcName(e.target.value)} />
              <div className="flex gap-4">
                <button onClick={() => setShowNewModal(null)} className="flex-1 py-4 font-bold text-slate-500">取消</button>
                <button onClick={() => { addProcess(showNewModal.category, showNewModal.level, newProcName); setShowNewModal(null); setNewProcName(''); }} className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-black shadow-lg">确认创建</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden relative">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAiSketchUpload} />
      
      {isAiProcessing && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/40 backdrop-blur-md flex flex-col items-center justify-center text-white">
          <Loader2 className="animate-spin h-12 w-12 mb-4 text-brand-400" />
          <p className="font-black uppercase tracking-widest text-sm">AI 正在深度解析您的草图...</p>
          <p className="text-[10px] text-slate-400 mt-2">预计耗时 5-10 秒，请稍候</p>
        </div>
      )}

      <div className="flex justify-between items-center bg-white p-3 rounded-2xl shadow-sm border border-slate-200 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => subProcessPath.length > 0 ? setSubProcessPath(subProcessPath.slice(0, -1)) : setCurrentProcessId(null)} className="p-2 hover:bg-slate-100 rounded-lg text-brand-600 font-bold flex items-center gap-1 text-xs">
            <ChevronLeft size={16}/> {subProcessPath.length > 0 ? '返回上一级' : '返回大厅'}
          </button>
          <div className="flex items-center gap-2 text-xs font-black">
             <span className="text-slate-400">{currentProcess.name}</span>
             {subProcessPath.map(p => <React.Fragment key={p.id}><ChevronRight size={14}/><span className="text-brand-600">{p.label}</span></React.Fragment>)}
             <span className="ml-4 px-2 py-0.5 bg-slate-100 text-slate-400 rounded text-[9px] uppercase font-black">{currentProcess.version}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-brand-50 text-brand-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-brand-100 transition-all shadow-sm border border-brand-200"><Wand2 size={14}/> AI 识别草图</button>
           <div className="w-px h-4 bg-slate-200 mx-2"></div>
           <button onClick={() => setShowHistory(true)} className="p-2.5 text-slate-400 hover:text-brand-600 hover:bg-slate-50 rounded-xl transition-all" title="发布记录"><History size={18}/></button>
           <button onClick={() => setShowSettings(true)} className="p-2.5 text-slate-400 hover:text-brand-600 hover:bg-slate-50 rounded-xl transition-all" title="属性设置"><Settings size={18}/></button>
           <div className="w-px h-4 bg-slate-200 mx-2"></div>
           <button onClick={() => setShowPublishModal(true)} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-brand-600 transition-all"><Send size={14}/> 发布生效</button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        <div className="w-20 bg-white border border-slate-200 rounded-3xl flex flex-col items-center py-6 gap-6 shadow-sm shrink-0">
           {[
             { type: 'start', label: '开始', icon: <PlayCircle size={20} className="text-emerald-500"/> },
             { type: 'process', label: '节点', icon: <Layout size={20} className="text-slate-600"/> },
             { type: 'decision', label: '分支', icon: <GitMerge size={20} className="text-amber-500"/> },
             { type: 'end', label: '结束', icon: <StopCircle size={20} className="text-slate-900"/> }
           ].map(item => (
            <button key={item.type} onClick={() => {
              const newNode: ProcessNode = { id: `node-${Date.now()}`, label: item.type === 'start' ? '开始' : item.type === 'decision' ? '条件判断' : '新环节', type: item.type as any, x: 150, y: 150, description: '', sipoc: { source: [], target: [], inputs: [], outputs: [], customers: [], standard: '', ownerRole: '' }, subProcessNodes: [], subProcessLinks: [] };
              updateCurrentData([...currentContext.nodes, newNode], currentContext.links);
              setSelectedNodeId(newNode.id);
            }} className="flex flex-col items-center gap-1 group">
               <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 border border-transparent group-hover:border-brand-200 group-hover:bg-brand-50 transition-all">{item.icon}</div>
               <span className="text-[10px] font-black text-slate-400 group-hover:text-brand-600 uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 bg-white rounded-3xl border relative overflow-auto bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]">
          <div className="min-w-[3000px] min-h-[3000px] relative p-32">
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {currentContext.links.map(link => {
                const from = currentContext.nodes.find(n => n.id === link.from);
                const to = currentContext.nodes.find(n => n.id === link.to);
                if (!from || !to) return null;
                const fW = (from.type === 'start' || from.type === 'end') ? CIRCLE_SIZE : NODE_W;
                const fH = (from.type === 'start' || from.type === 'end') ? CIRCLE_SIZE : NODE_H;
                const tW = (to.type === 'start' || to.type === 'end') ? CIRCLE_SIZE : NODE_W;
                return <path key={link.id} d={`M ${from.x + fW/2} ${from.y + fH} C ${from.x + fW/2} ${from.y + fH + 60}, ${to.x + tW/2} ${to.y - 60}, ${to.x + tW/2} ${to.y}`} stroke="#cbd5e1" strokeWidth="2" fill="none" />;
              })}
            </svg>
            {currentContext.nodes.map(node => (
              <div key={node.id} onMouseDown={(e) => { e.stopPropagation(); setSelectedNodeId(node.id); setDragInfo({ nodeId: node.id, startX: e.clientX, startY: e.clientY, nodeX: node.x, nodeY: node.y }); }} style={{ left: node.x, top: node.y }}
                className={`absolute flex flex-col items-center justify-center text-center cursor-grab active:cursor-grabbing transition-shadow
                  ${(node.type === 'start' || node.type === 'end') ? 'w-[80px] h-[80px] rounded-full' : 'w-[170px] min-h-[60px] rounded-xl p-3'}
                  ${node.type === 'start' ? 'bg-emerald-500 text-white' : node.type === 'end' ? 'bg-slate-900 text-white' : node.type === 'decision' ? 'bg-amber-50 border-2 border-amber-400' : 'bg-white border-2 border-slate-100'}
                  ${selectedNodeId === node.id ? 'ring-4 ring-brand-500/20 border-brand-500 z-30 scale-105 shadow-xl' : 'z-10 shadow-sm'}
                `}>
                <h4 className="text-[10px] leading-tight font-black select-none">{node.label}</h4>
                {node.sipoc.ownerRole && node.type !== 'start' && node.type !== 'decision' && node.type !== 'end' && (
                  <div className="absolute -bottom-2 right-2 bg-slate-900 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">{node.sipoc.ownerRole}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {selectedNode && (
          <div className="w-[380px] bg-white border border-slate-200 rounded-3xl shadow-xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50/50 rounded-t-3xl">
              <div><span className="text-[9px] font-black text-brand-600 uppercase">环节属性 · {selectedNode.type}</span><h3 className="text-lg font-black truncate">{selectedNode.label}</h3></div>
              <button onClick={() => setSelectedNodeId(null)} className="p-2 hover:bg-slate-200 rounded-full"><X size={18}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar pb-12">
              <div className="space-y-4">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">基础设置</label>
                <div className="flex gap-2">
                  <input className="flex-1 p-3 bg-slate-50 border rounded-xl text-xs font-bold outline-none focus:border-brand-500" value={selectedNode.label} onChange={e => updateNode(selectedNode.id, { label: e.target.value })} />
                  <button onClick={() => { updateCurrentData(currentContext.nodes.filter(n => n.id !== selectedNode.id), currentContext.links.filter(l => l.from !== selectedNode.id && l.to !== selectedNode.id)); setSelectedNodeId(null); }} className="p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-100"><Trash2 size={16}/></button>
                </div>
              </div>

              {selectedNode.type !== 'start' && selectedNode.type !== 'end' && (
                <div className="space-y-4">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">执行角色 (岗位)</label>
                  <select 
                    className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-black outline-none focus:border-brand-500 appearance-none" 
                    value={selectedNode.sipoc.ownerRole} 
                    onChange={e => updateNode(selectedNode.id, { sipoc: { ...selectedNode.sipoc, ownerRole: e.target.value } })}
                  >
                    <option value="">未选择岗位</option>
                    {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}

              {selectedNode.type === 'decision' && (
                <div className="space-y-4">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">判断逻辑描述</label>
                  <textarea className="w-full p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl text-xs font-bold outline-none resize-none h-32 shadow-inner" placeholder="描述判断依据..." value={selectedNode.decisionDescription} onChange={e => updateNode(selectedNode.id, { decisionDescription: e.target.value })} />
                </div>
              )}

              {selectedNode.type === 'process' && (
                <>
                  <div className="p-4 bg-slate-900 rounded-2xl text-white space-y-4">
                     <div className="flex justify-between items-center"><span className="text-[9px] font-black text-brand-400 uppercase">子流程嵌套</span><label className="scale-75 cursor-pointer inline-flex items-center"><input type="checkbox" checked={selectedNode.isSubProcess} onChange={e=>updateNode(selectedNode.id, {isSubProcess: e.target.checked})} className="sr-only peer"/><div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:bg-brand-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div></label></div>
                     {selectedNode.isSubProcess && <button onClick={() => setSubProcessPath([...subProcessPath, selectedNode])} className="w-full py-2 bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1">展开细化流程 <ArrowUpRight size={14}/></button>}
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SIPOC 要素控制</label>
                    <div className="grid grid-cols-2 gap-3">
                        <CompactSipoc title="S - 来源" items={selectedNode.sipoc.source || []} onClick={() => setEditModal({ nodeId: selectedNode.id, field: 'source', title: 'S - 来源对象' })} />
                        <CompactSipoc title="I - 输入" items={selectedNode.sipoc.inputs || []} onClick={() => setEditModal({ nodeId: selectedNode.id, field: 'inputs', title: 'I - 输入要素' })} />
                        <CompactSipoc title="O - 输出" items={selectedNode.sipoc.outputs || []} onClick={() => setEditModal({ nodeId: selectedNode.id, field: 'outputs', title: 'O - 输出产物' })} />
                        <CompactSipoc title="C - 目标" items={selectedNode.sipoc.target || []} onClick={() => setEditModal({ nodeId: selectedNode.id, field: 'target', title: 'C - 接收对象' })} />
                    </div>
                    <div onClick={() => setEditModal({ nodeId: selectedNode.id, field: 'standard', title: 'P - 作业标准' })} className="p-4 bg-slate-50 border rounded-2xl cursor-pointer hover:border-brand-300 transition-all">
                      <span className="text-[9px] font-black text-slate-400 uppercase">P - 作业标准</span>
                      <div className="text-[10px] mt-2 italic text-slate-500 leading-relaxed line-clamp-3" dangerouslySetInnerHTML={{ __html: selectedNode.sipoc.standard || "点击录入标准文档内容..." }} />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-3">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">逻辑流转管理</label>
                 <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
                    {currentContext.nodes.filter(n => n.id !== selectedNode.id).map(n => {
                      const linked = currentContext.links.some(l => l.from === selectedNode.id && l.to === n.id);
                      return (
                        <div key={n.id} onClick={() => {
                          const newLinks = linked ? currentContext.links.filter(l => !(l.from === selectedNode.id && l.to === n.id)) : [...currentContext.links, { id: `link-${Date.now()}`, from: selectedNode.id, to: n.id }];
                          updateCurrentData(currentContext.nodes, newLinks);
                        }} className={`flex justify-between items-center p-2 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${linked ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white hover:border-slate-300 shadow-sm'}`}>
                          {n.label} <Plus size={12} className={linked ? 'rotate-45' : ''}/>
                        </div>
                      );
                    })}
                 </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4"><div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600"><Info/></div><div><h3 className="text-xl font-black">资产属性设置</h3><p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Metadata Configuration</p></div></div>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 rounded-full"><X/></button>
             </div>
             <div className="space-y-5">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><User size={12}/> 主责任人</label>
                   <input className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-bold outline-none focus:border-brand-500" value={currentProcess?.owner} onChange={e=>updateProcessProps(currentProcessId!, { owner: e.target.value })} placeholder="输入主导负责人..."/>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Users size={12}/> 辅助责任人</label>
                   <input className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-bold outline-none focus:border-brand-500" value={currentProcess?.coOwner} onChange={e=>updateProcessProps(currentProcessId!, { coOwner: e.target.value })} placeholder="输入辅助参与人..."/>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Target size={12}/> 流程目标 (Objective)</label>
                   <textarea className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-bold outline-none focus:border-brand-500 h-24 resize-none shadow-inner" value={currentProcess?.objective} onChange={e=>updateProcessProps(currentProcessId!, { objective: e.target.value })} placeholder="定义流程的核心产出目标与业务价值..."/>
                </div>
             </div>
             <button onClick={() => setShowSettings(false)} className="w-full mt-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">保存资产属性</button>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-y-0 right-0 z-[300] w-96 bg-white shadow-2xl flex flex-col animate-in slide-in-from-right">
           <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
              <h3 className="font-black text-xl flex items-center gap-3"><History className="text-brand-600"/> 发布记录</h3>
              <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-200 rounded-full"><X/></button>
           </div>
           <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {currentProcess?.history.length === 0 ? <div className="py-20 text-center text-slate-300">暂无发布版本</div> : currentProcess?.history.map(record => (
                <div key={record.id} className="group p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-brand-200">
                   <div className="flex justify-between items-start mb-2"><span className="px-2 py-0.5 bg-brand-50 text-brand-700 text-[10px] font-black rounded uppercase">{record.version}</span><span className="text-[10px] text-slate-400">{new Date(record.publishedAt).toLocaleString()}</span></div>
                   <div className="flex items-center justify-between"><span className="text-[10px] text-slate-400 font-bold uppercase">发布人: {record.publishedBy}</span><button onClick={() => { rollbackProcess(currentProcessId!, record.id); setShowHistory(false); }} className="px-3 py-1 bg-slate-900 text-white text-[9px] font-black uppercase rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">回滚版本</button></div>
                </div>
              ))}
           </div>
        </div>
      )}

      {showPublishModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in-95 text-center">
              <h3 className="text-2xl font-black mb-2">发布正式版本</h3>
              <p className="text-xs text-slate-400 font-bold uppercase mb-8">当前草稿将入库并同步至资产库</p>
              <input autoFocus className="w-full p-4 bg-slate-50 border rounded-xl text-sm font-black outline-none focus:border-brand-500 mb-8" value={publishVersion} onChange={e=>setPublishVersion(e.target.value)} placeholder="版本号 (如 V1.0.0)..."/>
              <div className="flex gap-4">
                 <button onClick={() => setShowPublishModal(false)} className="flex-1 py-4 font-bold text-slate-500">取消</button>
                 <button onClick={() => { if(!publishVersion.trim()) return alert('请输入版本号'); publishProcess(currentProcessId!, publishVersion); setShowPublishModal(false); setPublishVersion(''); }} className="flex-1 py-4 bg-brand-600 text-white rounded-xl font-black shadow-lg">确认发布</button>
              </div>
           </div>
        </div>
      )}

      {editModal && <EditModal modal={editModal} onClose={() => setEditModal(null)} selectedNode={selectedNode!} updateNode={updateNode} />}
    </div>
  );
};

const CompactSipoc = ({ title, items, onClick }: { title: string, items: string[], onClick: () => void }) => (
  <div onClick={onClick} className="p-3 border-2 border-dashed border-slate-100 rounded-2xl bg-white hover:border-brand-200 cursor-pointer transition-all group min-h-[60px]">
    <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter group-hover:text-brand-500">{title}</span>
    <div className="mt-1 flex flex-wrap gap-1">
      {items.length === 0 ? <span className="text-[9px] text-slate-300 italic">待完善</span> : items.map((it, i) => <span key={i} className="bg-slate-50 px-1 py-0.5 rounded border text-[8px] font-bold text-slate-500 truncate max-w-[70px]">{it}</span>)}
    </div>
  </div>
);

const EditModal: React.FC<{ modal: any, onClose: () => void, selectedNode: ProcessNode, updateNode: any }> = ({ modal, onClose, selectedNode, updateNode }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const guide = SIPOC_GUIDES[modal.field] || { label: modal.title, hint: '请输入详细内容。', example: '' };

  useEffect(() => {
    if (editorRef.current) {
      const field = modal.field;
      let initialValue = '';
      if (field === 'label') initialValue = selectedNode.label;
      else if (isArrayField(field)) initialValue = (selectedNode.sipoc[field as keyof SIPOC] as string[] || []).join('\n');
      else initialValue = (selectedNode.sipoc[field as keyof SIPOC] as string) || '';
      
      if (isArrayField(field)) editorRef.current.innerText = initialValue;
      else editorRef.current.innerHTML = initialValue;
    }
  }, [modal.field, selectedNode]);

  const handleSave = () => {
    const field = modal.field;
    const content = editorRef.current?.innerHTML || '';
    const textContent = editorRef.current?.innerText || '';
    
    if (isArrayField(field)) {
      const newVal = textContent.split('\n').filter(s => s.trim());
      updateNode(selectedNode.id, { sipoc: { ...selectedNode.sipoc, [field]: newVal } });
    } else if (field === 'label') {
      updateNode(selectedNode.id, { label: textContent });
    } else {
      updateNode(selectedNode.id, { sipoc: { ...selectedNode.sipoc, [field]: content } });
    }
    onClose();
  };

  const exec = (cmd: string, val?: string) => { document.execCommand(cmd, false, val); editorRef.current?.focus(); };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl flex flex-col h-[70vh] overflow-hidden">
        <div className="p-8 border-b flex justify-between items-start bg-slate-50/50">
          <div>
            <h3 className="font-black text-slate-800 uppercase text-sm flex items-center gap-2 mb-1"><Edit3 className="text-brand-500 h-4 w-4"/> {guide.label}</h3>
            <p className="text-xs text-slate-500 font-bold mb-2">{guide.hint}</p>
            {guide.example && <p className="text-[10px] text-brand-600 font-black px-2 py-0.5 bg-brand-50 rounded inline-block">{guide.example}</p>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full"><X size={18}/></button>
        </div>
        <div className="flex-1 p-8 flex flex-col gap-4 bg-white overflow-hidden">
          {!isArrayField(modal.field) && modal.field !== 'label' && (
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl self-start shrink-0 shadow-inner">
               <button onClick={() => exec('bold')} className="p-2 hover:bg-white rounded-lg transition-all"><Bold size={14}/></button>
               <button onClick={() => exec('italic')} className="p-2 hover:bg-white rounded-lg transition-all"><Italic size={14}/></button>
               <button onClick={() => exec('insertUnorderedList')} className="p-2 hover:bg-white rounded-lg transition-all"><List size={14}/></button>
            </div>
          )}
          {isArrayField(modal.field) && <p className="text-[10px] font-bold text-slate-300 italic">要素请分行输入 (每行一条)</p>}
          <div ref={editorRef} contentEditable className="flex-1 w-full p-6 bg-slate-50 border border-slate-200 rounded-2xl text-sm leading-relaxed outline-none focus:border-brand-500 overflow-y-auto custom-scrollbar shadow-inner" />
          <div className="flex justify-end pt-4"><button onClick={handleSave} className="px-10 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-xs shadow-lg hover:bg-brand-600 transition-all">保存治理内容</button></div>
        </div>
      </div>
    </div>
  );
};

export default ProcessView;
