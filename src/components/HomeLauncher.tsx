import React, { useState } from 'react';
import { Material, Grn, Outward, User } from '../types';
import { 
  Database, 
  Layers, 
  FileSpreadsheet, 
  Hourglass, 
  Boxes, 
  ArrowUpRight, 
  Users, 
  Lock, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Workflow,
  Zap,
  Activity,
  PlusCircle,
  FileText
} from 'lucide-react';

interface HomeLauncherProps {
  currentUser: User;
  materials: Material[];
  grns: Grn[];
  outwards: Outward[];
  onSelectTab: (tabId: string) => void;
  onSelectInwardType?: (source: 'Supplier' | 'Production Return' | 'Jobwork Return') => void;
  onSelectOutwardType?: (type: 'Trial' | 'Sample' | 'Commercial Use') => void;
  theme?: 'light' | 'dark';
}

export default function HomeLauncher({ 
  currentUser, 
  materials, 
  grns, 
  outwards, 
  onSelectTab,
  onSelectInwardType,
  onSelectOutwardType,
  theme = 'dark'
}: HomeLauncherProps) {
  
  const [inwardExpanded, setInwardExpanded] = useState(false);
  const [outwardExpanded, setOutwardExpanded] = useState(false);

  // Real-time badge indicators
  const qcPendingCount = grns.filter(g => g.qcStatus === 'Pending').length;
  const approvedInventory = grns.filter(g => g.qcStatus === 'Approved');

  // Low stock calculation
  const lowStockCount = materials.filter(m => {
    const totalInwardApproved = approvedInventory
      .filter(g => g.materialId === m.id)
      .reduce((sum, curr) => sum + curr.qty, 0);

    const totalIssued = outwards
      .filter(o => o.materialId === m.id)
      .reduce((sum, curr) => sum + curr.qty, 0);

    const activeQty = Math.max(0, totalInwardApproved - totalIssued);
    return activeQty < m.minStock;
  }).length;

  // Near expiry batches count
  const expiringSoonCount = approvedInventory.filter(g => {
    const issued = outwards
      .filter(o => o.materialId === g.materialId && o.batchNo === g.batchNo)
      .reduce((s, curr) => s + curr.qty, 0);
    const balance = g.qty - issued;

    if (balance <= 0) return false;

    const today = new Date();
    today.setHours(0,0,0,0);
    const exp = new Date(g.expDate);
    exp.setHours(0,0,0,0);
    const daysLeft = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysLeft >= 0 && daysLeft <= 90;
  }).length;

  // Next sequential indexes calculation helpers
  const getNextGrnNo = (sType: 'Supplier' | 'Production Return' | 'Jobwork Return') => {
    let prefix = 'GRN-SUP-26-';
    let startValStr = '101';
    if (sType === 'Production Return') {
      prefix = localStorage.getItem('cfg_grn_prod_prefix') || 'GRN-PRD-26-';
      startValStr = localStorage.getItem('cfg_grn_prod_start') || '201';
    } else if (sType === 'Jobwork Return') {
      prefix = localStorage.getItem('cfg_grn_jobwork_prefix') || 'GRN-JBW-26-';
      startValStr = localStorage.getItem('cfg_grn_jobwork_start') || '301';
    } else {
      prefix = localStorage.getItem('cfg_grn_supplier_prefix') || localStorage.getItem('cfg_grn_prefix') || 'GRN-SUP-26-';
      startValStr = localStorage.getItem('cfg_grn_supplier_start') || localStorage.getItem('cfg_grn_start') || '101';
    }
    const count = grns.filter(g => (g.sourceType || 'Supplier') === sType).length;
    const nextIdx = count + Number(startValStr);
    return `${prefix}${nextIdx}`;
  };

  const getNextOutwardNo = (oType: 'Trial' | 'Sample' | 'Commercial Use') => {
    let prefix = 'OUT-COM-26-';
    let startValStr = '601';
    if (oType === 'Trial') {
      prefix = localStorage.getItem('cfg_outward_trial_prefix') || 'OUT-TRL-26-';
      startValStr = localStorage.getItem('cfg_outward_trial_start') || '401';
    } else if (oType === 'Sample') {
      prefix = localStorage.getItem('cfg_outward_sample_prefix') || 'OUT-SMP-26-';
      startValStr = localStorage.getItem('cfg_outward_sample_start') || '501';
    } else {
      prefix = localStorage.getItem('cfg_outward_comm_prefix') || localStorage.getItem('cfg_issue_prefix') || 'OUT-COM-26-';
      startValStr = localStorage.getItem('cfg_outward_comm_start') || localStorage.getItem('cfg_issue_start') || '601';
    }
    const count = outwards.filter(o => (o.outwardType || 'Commercial Use') === oType).length;
    const nextIdx = count + Number(startValStr);
    return `${prefix}${nextIdx}`;
  };

  // Role permissions check
  const isInwardRestricted = ['QC Operator'].includes(currentUser.role);
  const isOutwardRestricted = ['QC Operator'].includes(currentUser.role);

  // Non-Inward/Outward tiles inside bento configuration
  const menuTiles = [
    {
      id: 'dashboard',
      title: 'Dashboard Stats',
      icon: Layers,
      badge: lowStockCount > 0 ? `${lowStockCount} ALERT` : null,
      badgeColor: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
      themeClass: 'text-[#8ed5ff] bg-[#8ed5ff]/10 border-[#8ed5ff]/20 focus-within:ring-[#8ed5ff]',
      meta: `${materials.length} master items`
    },
    {
      id: 'materials',
      title: 'Material Master',
      icon: Database,
      themeClass: 'text-[#ffb9d8] bg-[#ffb9d8]/10 border-[#ffb9d8]/20 focus-within:ring-[#ffb9d8]',
      meta: 'Core definitions'
    },
    {
      id: 'qc',
      title: 'Quality Inspection',
      icon: Hourglass,
      badge: qcPendingCount > 0 ? `${qcPendingCount} PENDING` : null,
      badgeColor: 'bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse',
      themeClass: 'text-[#8ed5ff] bg-[#8ed5ff]/10 border-[#8ed5ff]/20 focus-within:ring-[#8ed5ff]',
      meta: 'QC clearance unit'
    },
    {
      id: 'inventory',
      title: 'Inventory Master',
      icon: Boxes,
      badge: expiringSoonCount > 0 ? `${expiringSoonCount} EXPIRED` : null,
      badgeColor: 'bg-[#ffb9d8]/20 border-[#ffb9d8]/40 text-[#ffb9d8]',
      themeClass: 'text-[#bdc2ff] bg-[#bdc2ff]/10 border-[#bdc2ff]/20 focus-within:ring-[#bdc2ff]',
      meta: 'Unified stock logs'
    },
    {
      id: 'users',
      title: 'Credentials & Users',
      icon: Users,
      restrictedRoles: ['GRN Operator', 'QC Operator', 'Viewer'],
      themeClass: 'text-[#bdc2ff] bg-[#bdc2ff]/10 border-[#bdc2ff]/20 focus-within:ring-[#bdc2ff]',
      meta: 'Access controls'
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in py-1 max-w-6xl mx-auto px-4">

      {/* Featured Side-By-Side ("aju baju") Expandable Action Hub */}
      <div className="space-y-3.5">
        <div className={`flex items-center gap-2 border-b pb-2 ${
          theme === 'light' ? 'border-[#e1e2ec]' : 'border-white/10'
        }`}>
          <Workflow className={`w-4 h-4 ${theme === 'light' ? 'text-[#2563eb]' : 'text-[#8ed5ff]'}`} />
          <span className={`text-[10px] uppercase font-bold tracking-widest font-mono ${
            theme === 'light' ? 'text-[#475569]' : 'text-[#87929a]'
          }`}>
            Transaction Action Center
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* 1. INWARD REGISTER TILE */}
          <div 
            className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
              theme === 'light' 
                ? (isInwardRestricted ? 'opacity-40 border-[#e1e2ec] bg-white' : 'border-[#cbd5e1] hover:border-[#2563eb] bg-white shadow-sm hover:shadow-md') 
                : (isInwardRestricted ? 'opacity-40 border-white/5 bg-[#0f1a30]' : 'border-white/10 hover:border-[#8ed5ff]/35 bg-[#0f1a30] shadow-lg')
            }`}
          >
            <div 
              onClick={() => {
                if (isInwardRestricted) {
                  alert(`Access Denied: Your assigned role [${currentUser.role}] does not have authorization permissions to use the Inward Register.`);
                  return;
                }
                setInwardExpanded(!inwardExpanded);
              }}
              className="p-5 flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl border ${
                  theme === 'light' 
                    ? 'bg-[#2563eb]/10 border-[#2563eb]/20 text-[#2563eb]' 
                    : 'bg-[#8ed5ff]/10 border border-[#8ed5ff]/20 text-[#8ed5ff]'
                }`}>
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className={`font-sans font-bold text-base tracking-tight ${
                    theme === 'light' ? 'text-[#1a1c1e]' : 'text-white'
                  }`}>
                    Inward Register
                  </h3>
                  <p className={`text-[10px] font-mono mt-0.5 uppercase tracking-wider ${
                    theme === 'light' ? 'text-[#475569]' : 'text-[#87929a]'
                  }`}>
                    Total: {grns.length} records filed • Click to Expand Options
                  </p>
                </div>
              </div>

              {!isInwardRestricted && (
                <div className={`transition p-1.5 rounded-lg border ${
                  theme === 'light' 
                    ? 'text-[#2563eb] bg-slate-50 border-[#cbd5e1] hover:border-[#2563eb]' 
                    : 'text-[#8ed5ff] bg-white/5 border border-white/10 hover:border-[#8ed5ff]/35'
                }`}>
                  {inwardExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              )}
            </div>

            {/* EXPANDABLE INWARD OPTIONS SLIDEDOWN PANEL */}
            {inwardExpanded && !isInwardRestricted && (
              <div className={`px-5 pb-5 pt-2 border-t split-expansion space-y-3 ${
                theme === 'light' ? 'border-[#e1e2ec] bg-slate-50/50' : 'border-white/5 bg-[#12203a]/40'
              }`}>
                <p className={`text-[10.5px] font-sans leading-relaxed ${
                  theme === 'light' ? 'text-[#475569]' : 'text-[#bdc8d1]'
                }`}>
                  Select the Inward source type to auto-configure custom sequential numbers:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => onSelectInwardType?.('Supplier')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl transition text-center group ${
                      theme === 'light' 
                        ? 'bg-[#2563eb]/5 hover:bg-[#2563eb]/15 border border-[#2563eb]/15 hover:border-[#2563eb]' 
                        : 'bg-[#8ed5ff]/5 hover:bg-[#8ed5ff]/15 border border-[#8ed5ff]/15 hover:border-[#8ed5ff]/40 text-white'
                    }`}
                  >
                    <span className={`text-[11.5px] font-bold ${theme === 'light' ? 'text-[#2563eb]' : 'text-[#8ed5ff]'}`}>Supplier</span>
                    <span className={`text-[9px] font-mono opacity-80 mt-1 uppercase transition ${
                      theme === 'light' ? 'text-[#475569] group-hover:text-[#2563eb]' : 'text-[#87929a] group-hover:text-white'
                    }`}>
                      Next ID: {getNextGrnNo('Supplier')}
                    </span>
                  </button>

                  <button
                    onClick={() => onSelectInwardType?.('Production Return')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl transition text-center group ${
                      theme === 'light' 
                        ? 'bg-emerald-500/5 hover:bg-emerald-500/15 border border-emerald-500/15 hover:border-emerald-500' 
                        : 'bg-emerald-500/5 hover:bg-emerald-500/15 border border-emerald-500/15 hover:border-emerald-400 text-white'
                    }`}
                  >
                    <span className={`text-[11.5px] font-bold ${theme === 'light' ? 'text-emerald-700' : 'text-emerald-350'}`}>Prod Return</span>
                    <span className={`text-[9px] font-mono opacity-80 mt-1 uppercase transition ${
                      theme === 'light' ? 'text-[#475569] group-hover:text-emerald-700' : 'text-[#87929a] group-hover:text-white'
                    }`}>
                      Next ID: {getNextGrnNo('Production Return')}
                    </span>
                  </button>

                  <button
                    onClick={() => onSelectInwardType?.('Jobwork Return')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl transition text-center group ${
                      theme === 'light' 
                        ? 'bg-amber-500/5 hover:bg-amber-500/15 border border-amber-500/15 hover:border-amber-500' 
                        : 'bg-amber-500/5 hover:bg-amber-500/15 border border-amber-500/15 hover:border-amber-400 text-white'
                    }`}
                  >
                    <span className={`text-[11.5px] font-bold ${theme === 'light' ? 'text-amber-800' : 'text-amber-300'}`}>Jobwork Return</span>
                    <span className={`text-[9px] font-mono opacity-80 mt-1 uppercase transition ${
                      theme === 'light' ? 'text-[#475569] group-hover:text-amber-800' : 'text-[#87929a] group-hover:text-white'
                    }`}>
                      Next ID: {getNextGrnNo('Jobwork Return')}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. OUTWARD REGISTER TILE */}
          <div 
            className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
              theme === 'light' 
                ? (isOutwardRestricted ? 'opacity-40 border-[#e1e2ec] bg-white' : 'border-[#cbd5e1] hover:border-[#2563eb] bg-white shadow-sm hover:shadow-md') 
                : (isOutwardRestricted ? 'opacity-40 border-white/5 bg-[#0f1a30]' : 'border-white/10 hover:border-[#ffb9d8]/35 bg-[#0f1a30] shadow-lg')
            }`}
          >
            <div 
              onClick={() => {
                if (isOutwardRestricted) {
                  alert(`Access Denied: Your assigned role [${currentUser.role}] does not have authorization permissions to use the Outward Register.`);
                  return;
                }
                setOutwardExpanded(!outwardExpanded);
              }}
              className="p-5 flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl border ${
                  theme === 'light' 
                    ? 'bg-[#2563eb]/10 border-[#2563eb]/20 text-[#2563eb]' 
                    : 'bg-[#ffb9d8]/10 border border-[#ffb9d8]/20 text-[#ffb9d8]'
                }`}>
                  <ArrowUpRight className="w-6 h-6" />
                </div>
                <div>
                  <h3 className={`font-sans font-bold text-base tracking-tight ${
                    theme === 'light' ? 'text-[#1a1c1e]' : 'text-white'
                  }`}>
                    Outward Register
                  </h3>
                  <p className={`text-[10px] font-mono mt-0.5 uppercase tracking-wider ${
                    theme === 'light' ? 'text-[#475569]' : 'text-[#87929a]'
                  }`}>
                    Total: {outwards.length} issued tasks • Click to Expand Options
                  </p>
                </div>
              </div>

              {!isOutwardRestricted && (
                <div className={`transition p-1.5 rounded-lg border ${
                  theme === 'light' 
                    ? 'text-[#2563eb] bg-slate-50 border-[#cbd5e1] hover:border-[#2563eb]' 
                    : 'text-[#ffb9d8] bg-white/5 border border-white/10 hover:border-[#ffb9d8]/35'
                }`}>
                  {outwardExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              )}
            </div>

            {/* EXPANDABLE OUTWARD OPTIONS SLIDEDOWN PANEL */}
            {outwardExpanded && !isOutwardRestricted && (
              <div className={`px-5 pb-5 pt-2 border-t split-expansion space-y-3 ${
                theme === 'light' ? 'border-[#e1e2ec] bg-slate-50/50' : 'border-white/5 bg-[#12203a]/40'
              }`}>
                <p className={`text-[10.5px] font-sans leading-relaxed ${
                  theme === 'light' ? 'text-[#475569]' : 'text-[#bdc8d1]'
                }`}>
                  Select the Outward purpose category to auto-configure custom sequential numbers:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => onSelectOutwardType?.('Trial')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl transition text-center group ${
                      theme === 'light' 
                        ? 'bg-sky-500/5 hover:bg-sky-500/15 border border-sky-400/20 hover:border-sky-500' 
                        : 'bg-sky-500/5 hover:bg-sky-500/15 border border-sky-500/15 hover:border-sky-400 text-white'
                    }`}
                  >
                    <span className={`text-[11.5px] font-bold ${theme === 'light' ? 'text-sky-700' : 'text-sky-350'}`}>Trial Type</span>
                    <span className={`text-[9px] font-mono opacity-80 mt-1 uppercase transition ${
                      theme === 'light' ? 'text-[#475569] group-hover:text-sky-700' : 'text-[#87929a] group-hover:text-white'
                    }`}>
                      Next ID: {getNextOutwardNo('Trial')}
                    </span>
                  </button>

                  <button
                    onClick={() => onSelectOutwardType?.('Sample')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl transition text-center group ${
                      theme === 'light' 
                        ? 'bg-fuchsia-500/5 hover:bg-fuchsia-500/15 border border-fuchsia-400/20 hover:border-fuchsia-500' 
                        : 'bg-fuchsia-500/5 hover:bg-fuchsia-500/15 border border-fuchsia-500/15 hover:border-fuchsia-300 text-white'
                    }`}
                  >
                    <span className={`text-[11.5px] font-bold ${theme === 'light' ? 'text-fuchsia-700' : 'text-fuchsia-350'}`}>Sample Type</span>
                    <span className={`text-[9px] font-mono opacity-80 mt-1 uppercase transition ${
                      theme === 'light' ? 'text-[#475569] group-hover:text-fuchsia-700' : 'text-[#87929a] group-hover:text-white'
                    }`}>
                      Next ID: {getNextOutwardNo('Sample')}
                    </span>
                  </button>

                  <button
                    onClick={() => onSelectOutwardType?.('Commercial Use')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl transition text-center group ${
                      theme === 'light' 
                        ? 'bg-[#2563eb]/5 hover:bg-[#2563eb]/15 border border-[#2563eb]/15 hover:border-[#2563eb]' 
                        : 'bg-[#ffb9d8]/5 hover:bg-[#ffb9d8]/15 border border-[#ffb9d8]/15 hover:border-[#ffb9d8]/40 text-white'
                    }`}
                  >
                    <span className={`text-[11.5px] font-bold ${theme === 'light' ? 'text-[#2563eb]' : 'text-[#ffb9d8]'}`}>Commercial Issue</span>
                    <span className={`text-[9px] font-mono opacity-80 mt-1 uppercase transition ${
                      theme === 'light' ? 'text-[#475569] group-hover:text-[#2563eb]' : 'text-[#87929a] group-hover:text-white'
                    }`}>
                      Next ID: {getNextOutwardNo('Commercial Use')}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Primary Bento Tiles Grid */}
      <div className="space-y-3.5 pt-2">
        <div className={`flex items-center gap-2 border-b pb-2 ${
          theme === 'light' ? 'border-[#e1e2ec]' : 'border-white/10'
        }`}>
          <Layers className={`w-4 h-4 ${theme === 'light' ? 'text-[#2563eb]' : 'text-[#8ed5ff]'}`} />
          <span className={`text-[10px] uppercase font-bold tracking-widest font-mono ${
            theme === 'light' ? 'text-[#475569]' : 'text-[#87929a]'
          }`}>
            Secondary Warehouse Modules
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {menuTiles.map((tile) => {
            const IconComponent = tile.icon;
            const isRestricted = tile.restrictedRoles?.includes(currentUser.role);
            
            // Customize tile background and border based on theme
            const tileBgBorder = theme === 'light'
              ? (isRestricted 
                  ? 'opacity-40 hover:opacity-50 cursor-not-allowed border-[#cbd5e1] bg-white' 
                  : 'border-[#cbd5e1] hover:border-[#2563eb] bg-white shadow-sm hover:shadow')
              : (isRestricted 
                  ? 'opacity-40 hover:opacity-50 cursor-not-allowed border-white/5 bg-white/1' 
                  : 'border-white/10 hover:border-[#8ed5ff]/40 bg-[#0f1a30]');

            return (
              <div
                key={tile.id}
                onClick={() => {
                  if (isRestricted) {
                    alert(`Access Denied: Your assigned role [${currentUser.role}] does not have authorization permissions to open the [${tile.title}] module.`);
                    return;
                  }
                  onSelectTab(tile.id);
                }}
                className={`group rounded-xl p-5 flex flex-col justify-between h-[135px] cursor-pointer relative transition-all duration-300 ${tileBgBorder}`}
                id={`tile-${tile.id}`}
              >
                {/* Header row inside card - Icon with customized theme container */}
                <div className="flex justify-between items-start">
                  <div className={`p-2 rounded-lg border transition-all duration-300 ${
                    isRestricted 
                      ? 'bg-white/5 border-white/5 text-[#87929a]' 
                      : `${tile.themeClass} group-hover:bg-white/10`
                  }`}>
                    <IconComponent className="w-5 h-5" />
                  </div>

                  {isRestricted ? (
                    <div className="flex items-center gap-0.5 text-[#87929a] text-[8px] uppercase font-bold tracking-widest bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                      <Lock className="w-2.5 h-2.5 shrink-0" />
                      <span>Lock</span>
                    </div>
                  ) : tile.badge ? (
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest font-mono border ${tile.badgeColor}`}>
                      {tile.badge}
                    </span>
                  ) : null}
                </div>

                {/* Info Block - Title only */}
                <div className="mt-2.5">
                  <h4 className={`font-sans font-bold text-[13px] tracking-tight leading-snug transition-colors ${
                    theme === 'light' 
                      ? 'text-[#1a1c1e] group-hover:text-[#2563eb]' 
                      : 'text-white group-hover:text-[#8ed5ff]'
                  }`}>
                    {tile.title}
                  </h4>
                </div>

                {/* Footer status row */}
                <div className={`flex items-center justify-between border-t pt-2 text-[9px] font-medium tracking-wide uppercase font-mono ${
                  theme === 'light' 
                    ? 'border-slate-100 text-[#475569]' 
                    : 'border-white/5 text-[#87929a]'
                }`}>
                  <span>{tile.meta}</span>
                  {!isRestricted && (
                    <span className={`inline-flex items-center gap-0.5 transition-colors duration-200 ${
                      theme === 'light' ? 'text-[#2563eb]' : 'text-[#87929a] group-hover:text-[#8ed5ff]'
                    }`}>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
