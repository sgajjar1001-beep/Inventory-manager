import React, { useState } from 'react';
import { User, UserRole, Grn, Outward } from '../types';
import { UserPlus, ShieldPlus, Eye, EyeOff, ShieldAlert, KeyRound, Clock, CheckCircle2, XCircle, FileInput, ArrowRightLeft } from 'lucide-react';

interface UsersTabProps {
  users: User[];
  onSaveUser: (user: User) => void;
  currentUser: User;
  grns: Grn[];
  outwards: Outward[];
}

export default function UsersTab({ users, onSaveUser, currentUser, grns = [], outwards = [] }: UsersTabProps) {
  const isAdmin = currentUser.role === 'Admin';

  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('GRN Operator');
  
  const [isVisible, setIsVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!username.trim() || !name.trim() || !password.trim()) {
      setErrorMsg('All fields: ID, Name, and Password are required.');
      return;
    }

    if (username.trim().length < 3) {
      setErrorMsg('ID / Username must be at least 3 characters.');
      return;
    }

    // Check duplicate
    const checkDuplicate = users.some(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (checkDuplicate) {
      setErrorMsg(`A user account with Username "${username.trim()}" already exists.`);
      return;
    }

    const newUser: User = {
      id: 'usr_' + Date.now(),
      username: username.trim().toLowerCase(),
      password: password.trim(),
      name: name.trim(),
      role,
      createdAt: new Date().toISOString()
    };

    onSaveUser(newUser);

    // Reset Form fields
    setUsername('');
    setName('');
    setPassword('');
    
    setSuccessMsg('New operator credential registration complete!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold font-sans text-slate-800">Multi-User Accounts &amp; Security</h2>
        <p className="text-xs text-stone-500 mt-1 font-medium font-sans">
          Create, register, and sync customized ID &amp; Password accounts to access this inventory system on other mobile devices or tablets!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Registration Form */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/55 shadow-xs col-span-1 h-fit">
          <h3 className="font-sans font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#6b3e66]" />
            <span>Register Operator Account</span>
          </h3>

          {!isAdmin ? (
            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200/50 text-[11px] text-slate-700 leading-relaxed">
              <span className="font-bold text-amber-800">Permission Restrained:</span> Only users assigned the <b>Admin</b> role are authorized to generate new operator accounts.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="bg-rose-50 text-rose-700 p-3 rounded-lg border border-rose-200 text-xs font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-650 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-50 text-emerald-800 p-3 rounded-lg border border-emerald-200 text-xs font-bold">
                  {successMsg}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                  ID / Login Username *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. gajjar1"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full text-slate-800 bg-stone-50 border border-stone-200 text-xs p-2.5 outline-none rounded-xl focus:border-[#6b3e66] focus:ring-1 focus:ring-[#6b3e66] transition focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Full Staff Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. S. Gajjar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-slate-800 bg-stone-50 border border-stone-200 text-xs p-2.5 outline-none rounded-xl focus:border-[#6b3e66] focus:ring-1 focus:ring-[#6b3e66] transition focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Group / Authorization Role *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full text-slate-800 bg-stone-50 border border-stone-200 text-xs p-2.5 outline-none rounded-xl focus:border-[#6b3e66] focus:ring-1 focus:ring-[#6b3e66] transition"
                >
                  <option value="Admin">Admin (Full write details)</option>
                  <option value="GRN Operator">GRN Operator (Saves GRNs)</option>
                  <option value="QC Operator">QC Operator (Approves quality)</option>
                  <option value="Viewer">Viewer (Read-only lookup)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={isVisible ? 'text' : 'password'}
                    required
                    placeholder="Create security password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-slate-800 bg-stone-50 border border-stone-200 text-xs p-2.5 pr-10 outline-none rounded-xl focus:border-[#6b3e66] focus:ring-1 focus:ring-[#6b3e66] transition focus:bg-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setIsVisible(!isVisible)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex justify-center items-center gap-1.5 py-2.5 px-4 border border-transparent rounded-xl shadow-xs text-xs font-bold text-white bg-[#6b3e66] hover:bg-[#7b4775] active:scale-98 transition cursor-pointer"
              >
                <ShieldPlus className="w-4 h-4 text-[#F0CDA8]" /> Register Credentials
              </button>
            </form>
          )}
        </div>

        {/* Existing Users list */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/55 shadow-xs col-span-2 space-y-4">
          <h3 className="font-sans font-bold text-slate-800 text-sm">Active Authorized Operators List</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {users.map(u => (
              <div 
                key={u.id}
                className="border border-[#F0CDA8]/40 bg-[#FAF9F5]/40 p-4 rounded-xl flex items-start gap-3 shadow-xs hover:border-stone-400 transition"
              >
                <div className="bg-[#FAF9F5] p-2.5 rounded-xl text-[#6b3e66] border border-stone-200/55 shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-sans font-bold text-slate-800 text-xs">
                      {u.name}
                    </span>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase ${
                      u.role === 'Admin'
                        ? 'bg-rose-50 text-rose-700 border border-rose-100'
                        : u.role === 'QC Operator'
                          ? 'bg-amber-50 text-amber-700 border border-amber-100'
                          : u.role === 'GRN Operator'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-stone-100 text-stone-500'
                    }`}>
                      {u.role}
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-500 font-mono">
                    ID Username: <b className="text-[#6b3e66] text-xs font-bold">{u.username}</b>
                  </p>
                  <p className="text-[10px] text-stone-500 font-mono">
                    Security Password: <b className="text-slate-700 text-xs font-bold">{u.password || '••••'}</b>
                  </p>
                  <p className="text-[9px] text-stone-400">
                    Registered: {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-stone-200/50 p-3.5 bg-[#FAF9F5] rounded-xl border border-[#F0CDA8]/40">
            <h4 className="text-xs font-bold text-[#6b3e66]">💡 Dynamic Sync Note:</h4>
            <p className="text-[11px] text-stone-500 leading-relaxed mt-1 font-sans">
              Any username and password created here is stored securely inside the central database. If another machine accesses the Shared Application URL, they can log in instantly using the newly generated keys!
            </p>
          </div>
        </div>
      </div>

      {/* Dynamic Multi-User Action Tracker Logs */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200/55 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h3 className="font-sans font-bold text-slate-800 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#6b3e66]" />
              <span>Operator Activity Logs &amp; Audit Trail</span>
            </h3>
            <p className="text-[11px] text-stone-400 mt-0.5">
              Real-time audit synchronized logs recording which operator logged or modified database stock entries.
            </p>
          </div>
          <span className="text-[10px] bg-[#FAF9F5] border border-stone-200 px-2.5 py-1 rounded-lg font-mono text-slate-600 font-bold shadow-2xs">
            Synced Actions Count: {
              React.useMemo(() => {
                let total = grns.length;
                grns.forEach(g => { if(g.qcStatus !== 'Pending') total++; });
                return total + outwards.length;
              }, [grns, outwards])
            }
          </span>
        </div>

        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {(() => {
            const list: Array<{
              id: string;
              timestamp: string;
              type: 'INWARD' | 'OUTWARD' | 'QC';
              operator: string;
              actionText: string;
              subText: string;
            }> = [];

            grns.forEach(g => {
              list.push({
                id: `act-in-${g.id}`,
                timestamp: g.createdOn || g.grnDate,
                type: 'INWARD',
                operator: g.receivedBy || 'System Operator',
                actionText: `Logged Material Live Inward: ${g.materialName}`,
                subText: `Batch: ${g.batchNo} | Qty: ${g.qty} | GRN No: ${g.grnNo} ${g.palletNo ? `| Pallet: ${g.palletNo}` : ''} ${g.drumNo ? `| Drum: ${g.drumNo}` : ''}`
              });

              if (g.qcStatus !== 'Pending') {
                list.push({
                  id: `act-qc-${g.id}`,
                  timestamp: g.qcReleaseDate || g.createdOn || g.grnDate,
                  type: 'QC',
                  operator: 'QC Department Evaluator',
                  actionText: `Passed Quality Status [${g.qcStatus}] for batch: ${g.materialName}`,
                  subText: `Batch: ${g.batchNo} | Status marked as: [${g.qcStatus}] ${g.qcReleaseDate ? `on ${g.qcReleaseDate}` : ''}`
                });
              }
            });

            outwards.forEach(o => {
              list.push({
                id: `act-out-${o.id}`,
                timestamp: o.createdOn || o.outwardDate,
                type: 'OUTWARD',
                operator: o.issuedBy || 'System Operator',
                actionText: `Dispatched Stock Outward Issue: ${o.materialName}`,
                subText: `Batch: ${o.batchNo} | Qty Issued: ${o.qty} UOM units | Sent to Department: ${o.department}`
              });
            });

            // Sorting by timestamp descending
            const sorted = list.sort((a,b) => {
              return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            });

            if (sorted.length === 0) {
              return (
                <div className="text-center py-10 text-stone-400 text-xs font-mono">
                  No operator transactions performed yet on this central server node. Add a GRN or outbound to trigger logged audits.
                </div>
              );
            }

            return sorted.slice(0, 30).map(act => (
              <div key={act.id} className="flex gap-3 text-xs items-start p-3 bg-stone-50/50 hover:bg-stone-50 rounded-xl border border-stone-100 transition duration-100">
                <div className={`p-2 rounded-lg shrink-0 border ${
                  act.type === 'INWARD'
                    ? 'bg-emerald-55/15 text-emerald-700 border-emerald-200/40'
                    : act.type === 'OUTWARD'
                      ? 'bg-rose-50 text-rose-700 border-rose-100'
                      : 'bg-amber-50 text-amber-700 border-amber-100'
                }`}>
                  {act.type === 'INWARD' && <FileInput className="w-3.5 h-3.5" />}
                  {act.type === 'OUTWARD' && <ArrowRightLeft className="w-3.5 h-3.5" />}
                  {act.type === 'QC' && <ShieldPlus className="w-3.5 h-3.5 text-amber-600" />}
                </div>

                <div className="space-y-1 w-full min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-bold text-slate-800 leading-tight">
                      {act.actionText}
                    </span>
                    <span className="text-[9px] text-[#87929a] font-mono whitespace-nowrap">
                      {new Date(act.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 truncate">
                    {act.subText}
                  </p>
                  <p className="text-[10px] text-[#6b3e66] font-semibold flex items-center gap-1">
                    <span>By user auth:</span>
                    <span className="bg-[#6b3e66]/5 px-1.5 py-0.5 rounded font-mono font-extrabold uppercase text-[9px]">{act.operator}</span>
                  </p>
                </div>
              </div>
            ));
          })()}
        </div>
      </div>

    </div>
  );
}
