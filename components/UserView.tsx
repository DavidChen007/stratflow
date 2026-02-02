
import React, { useState, useMemo } from 'react';
import { AppState, User, Department } from '../types';
import { Plus, Trash2, ShieldCheck, User as UserIcon, Key, Building2, EyeOff } from 'lucide-react';

interface UserViewProps {
  state: AppState;
  setUsers: (users: User[]) => void;
  currentUser: User;
  setCurrentUser: (u: User) => void;
}

const UserView: React.FC<UserViewProps> = ({ state, setUsers, currentUser, setCurrentUser }) => {
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState<'Admin' | 'User'>('User');
  const [newDeptId, setNewDeptId] = useState('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Access control filter
  const visibleUsers = useMemo(() => {
    if (currentUser.role === 'Admin') return state.users;
    return state.users.filter(u => u.id === currentUser.id);
  }, [state.users, currentUser]);

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

  const addUser = () => {
    if (!newUsername.trim() || !newName.trim()) return;
    const newUser: User = { 
      id: `user-${Date.now()}`, 
      username: newUsername, 
      password: '888888', 
      name: newName, 
      role: newRole,
      departmentId: newDeptId || undefined
    };
    setUsers([...state.users, newUser]);
    setNewName(''); setNewUsername(''); setNewDeptId('');
  };

  const handleResetPassword = (userId: string) => {
    if (!confirm('确定要将该用户的密码重置为 888888 吗？')) return;
    setUsers(state.users.map(u => u.id === userId ? { ...u, password: '888888' } : u));
    alert('密码已重置为 888888');
  };

  const handleChangePassword = () => {
    if (!newPassword) return;
    const updatedUsers = state.users.map(u => u.id === currentUser.id ? { ...u, password: newPassword } : u);
    setUsers(updatedUsers);
    const updatedMe = updatedUsers.find(u => u.id === currentUser.id);
    if (updatedMe) setCurrentUser(updatedMe);
    setShowPasswordChange(false);
    setNewPassword('');
    alert("个人登录密码修改成功！");
  };

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex justify-between items-center shrink-0">
        <h2 className="text-xl font-black text-slate-800">治理权限中心</h2>
        <button onClick={() => setShowPasswordChange(true)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-slate-200 transition-colors"><Key size={14}/> 修改我的密码</button>
      </div>

      {currentUser.role === 'Admin' && (
        <div className="bg-brand-50 p-8 rounded-[2.5rem] border border-brand-100 flex flex-wrap gap-4 items-end animate-in fade-in slide-in-from-top-4 shrink-0">
          <div className="flex-1 min-w-[140px] space-y-2"><label className="text-[10px] font-black uppercase text-brand-600 tracking-widest">姓名</label><input className="w-full px-4 py-3 bg-white border border-brand-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500" placeholder="姓名" value={newName} onChange={e => setNewName(e.target.value)}/></div>
          <div className="flex-1 min-w-[140px] space-y-2"><label className="text-[10px] font-black uppercase text-brand-600 tracking-widest">账号</label><input className="w-full px-4 py-3 bg-white border border-brand-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500" placeholder="用户名" value={newUsername} onChange={e => setNewUsername(e.target.value)}/></div>
          <div className="flex-1 min-w-[140px] space-y-2">
            <label className="text-[10px] font-black uppercase text-brand-600 tracking-widest">所属部门</label>
            <select className="w-full px-4 py-3 bg-white border border-brand-200 rounded-2xl text-sm font-bold outline-none" value={newDeptId} onChange={e => setNewDeptId(e.target.value)}>
              <option value="">未分配</option>
              {flatDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="w-40 space-y-2"><label className="text-[10px] font-black uppercase text-brand-600 tracking-widest">角色</label><select className="w-full px-4 py-3 bg-white border border-brand-200 rounded-2xl text-sm font-bold outline-none" value={newRole} onChange={e => setNewRole(e.target.value as any)}><option value="User">普通成员</option><option value="Admin">管理员</option></select></div>
          <button onClick={addUser} className="bg-brand-600 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"><Plus size={18} className="inline mr-1"/> 创建用户</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleUsers.map(u => {
            const dept = flatDepts.find(d => d.id === u.departmentId);
            return (
              <div key={u.id} className="bg-white p-8 rounded-[2.5rem] border-2 shadow-sm flex flex-col gap-4 relative hover:shadow-lg transition-shadow border-slate-100">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${u.role === 'Admin' ? 'bg-brand-50 text-brand-600' : 'bg-slate-50 text-slate-400'}`}>{u.role === 'Admin' ? <ShieldCheck size={28}/> : <UserIcon size={28}/>}</div>
                    <div><h4 className="font-black text-xl text-slate-800">{u.name}</h4><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">账号: {u.username}</p></div>
                  </div>
                  {currentUser.role === 'Admin' && u.id !== currentUser.id && (
                    <button onClick={() => setUsers(state.users.filter(it => it.id !== u.id))} className="text-slate-200 hover:text-red-500"><Trash2 size={16}/></button>
                  )}
                </div>
                <div className="pt-4 border-t flex items-center justify-between">
                  <div className="space-y-1">
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase inline-block ${u.role === 'Admin' ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-slate-500'}`}>{u.role}</span>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold"><Building2 size={10}/> {dept?.name || '未分配部门'}</div>
                  </div>
                  {currentUser.role === 'Admin' && (
                    <button onClick={() => handleResetPassword(u.id)} className="text-[9px] font-black text-brand-600 border border-brand-200 px-2 py-1 rounded-lg hover:bg-brand-50 transition-colors uppercase">重置密码</button>
                  )}
                  {u.id === currentUser.id && (
                    <div className="text-right text-[10px] font-black text-slate-300 uppercase flex items-center gap-1"><EyeOff size={10}/> 密码已加密</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showPasswordChange && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/70 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black mb-8 text-slate-800">修改登录密码</h3>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border rounded-2xl focus-within:border-brand-500 transition-all"><label className="text-[10px] font-black uppercase text-slate-400 block mb-1">新密码</label><input type="password" autoFocus className="w-full bg-transparent text-sm font-bold outline-none" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
              <div className="flex gap-4 pt-4"><button onClick={() => setShowPasswordChange(false)} className="flex-1 py-4 text-xs font-black uppercase text-slate-400">取消</button><button onClick={handleChangePassword} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs">确认修改</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserView;
