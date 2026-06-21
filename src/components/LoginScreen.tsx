import React, { useState } from 'react';
import { User } from '../types';
import { Database, Lock, User as UserIcon, ShieldAlert, KeyRound } from 'lucide-react';

interface LoginScreenProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
}

export default function LoginScreen({ users, onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in both Username and Password.');
      return;
    }

    const foundUser = users.find(
      (u) => 
        u.username.toLowerCase() === username.trim().toLowerCase() && 
        u.password === password
    );

    if (foundUser) {
      onLoginSuccess(foundUser);
      setError(null);
    } else {
      setError('Invalid Username or Password. Please try again.');
    }
  };

  const handleQuickLogin = (testUsername: string) => {
    const foundUser = users.find(u => u.username === testUsername);
    if (foundUser) {
      onLoginSuccess(foundUser);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#1e293b] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      
      {/* Decorative day theme light spots */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-100/40 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-100/30 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-md">
            <Database className="w-8 h-8 text-[#2563eb]" />
          </div>
        </div>
        <h2 className="mt-5 text-center text-3xl font-extrabold tracking-tight text-slate-850 font-sans">
          Inventory Manager
        </h2>
        <p className="mt-1.5 text-center text-xs text-[#475569] font-semibold tracking-wide uppercase font-mono">
          U LIVA NUTRITION • Enterprise Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-white py-8 px-6 border border-slate-200/80 rounded-2xl shadow-xl sm:px-10">
          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="bg-rose-50 text-rose-800 p-3 rounded-lg border border-rose-200/80 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-[11px] font-bold uppercase tracking-widest text-[#475569]">
                Username / Email ID
              </label>
              <div className="mt-1.5 relative rounded-md">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <UserIcon className="h-4 w-4 text-[#64748b]" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. hr@ulivanutrition.com"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 outline-none rounded-xl focus:bg-white focus:border-[#2563eb] text-slate-900 text-xs placeholder-slate-400 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-[11px] font-bold uppercase tracking-widest text-[#475569]">
                Password
              </label>
              <div className="mt-1.5 relative rounded-md">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[#64748b]" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 outline-none rounded-xl focus:bg-white focus:border-[#2563eb] text-slate-900 text-xs placeholder-slate-400 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 rounded-xl shadow-md text-xs font-bold text-white bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-98 transition duration-200 cursor-pointer uppercase tracking-widest font-mono"
              >
                Sign In &rarr;
              </button>
            </div>
          </form>

          {/* Quick Info Box & Sandbox Login helper */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <span className="text-[10px] font-bold text-[#475569] uppercase tracking-widest block mb-3 flex items-center gap-1.5 font-mono">
              <KeyRound className="w-3.5 h-3.5 text-[#2563eb]" /> Quick Access Portals
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleQuickLogin('hr@ulivanutrition.com')}
                type="button"
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200/80 hover:border-[#2563eb]/40 active:scale-95 text-[10px] font-bold py-2.5 px-1 text-slate-800 rounded-lg text-center cursor-pointer transition duration-150"
              >
                <div className="text-[#2563eb]">SUMIT</div>
                <div className="text-[9px] text-[#475569] font-mono">Pass: 123</div>
              </button>
              <button
                onClick={() => handleQuickLogin('operator')}
                type="button"
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200/80 hover:border-[#2563eb]/40 active:scale-95 text-[10px] font-bold py-2.5 px-1 text-slate-800 rounded-lg text-center cursor-pointer transition duration-150"
              >
                <div className="text-[#db2777]">Operator</div>
                <div className="text-[9px] text-[#475569] font-mono">Pass: 123</div>
              </button>
              <button
                onClick={() => handleQuickLogin('qc')}
                type="button"
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200/80 hover:border-[#2563eb]/40 active:scale-95 text-[10px] font-bold py-2.5 px-1 text-slate-800 rounded-lg text-center cursor-pointer transition duration-150"
              >
                <div className="text-[#4f46e5]">QC Manager</div>
                <div className="text-[9px] text-[#475569] font-mono">Pass: 123</div>
              </button>
            </div>
            <p className="text-[9px] text-slate-400 mt-4 text-center leading-relaxed font-mono">
              Demo logins bypass cloud endpoints safely. Compatible on all multi-devices.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
