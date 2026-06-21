import React, { useState } from 'react';
import { Grn, Material, User, Outward } from '../types';
import { 
  Package, 
  CheckCircle2, 
  Hourglass, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  FileSpreadsheet, 
  Share2, 
  ChevronDown, 
  ChevronUp,
  Inbox,
  ArrowUpRight,
  Briefcase,
  FlaskConical,
  Activity,
  Trash2
} from 'lucide-react';

interface DashboardTabProps {
  materials: Material[];
  grns: Grn[];
  outwards: Outward[];
  currentUser: User;
  onNavigateToTab: (tabId: string) => void;
}

export default function DashboardTab({ materials, grns, outwards, currentUser, onNavigateToTab }: DashboardTabProps) {
  const [outwardExpanded, setOutwardExpanded] = useState(false);

  // Expiration boundary setup
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Statistics calculations
  const totalInwardQty = grns.reduce((sum, g) => sum + g.qty, 0);
  const totalOutwardQty = outwards.reduce((sum, o) => sum + o.qty, 0);
  const totalApprovedQty = grns.filter(g => g.qcStatus === 'Approved').reduce((sum, g) => sum + g.qty, 0);
  const totalRejectedQty = grns.filter(g => g.qcStatus === 'Rejected').reduce((sum, g) => sum + g.qty, 0);
  
  // Real Net stock currently in active warehouse
  const netAvailableStock = Math.max(0, totalApprovedQty - totalOutwardQty);

  // Batch Status Counts
  const qcApprovedCount = grns.filter(g => g.qcStatus === 'Approved').length;
  const qcPendingCount = grns.filter(g => g.qcStatus === 'Pending').length;
  const qcRejectedCount = grns.filter(g => g.qcStatus === 'Rejected').length;

  // Near Expiry Counts (< 90 Days and not expired)
  const nearExpiryCount = grns.filter(g => {
    if (!g.expDate || g.qcStatus !== 'Approved') return false;
    const exp = new Date(g.expDate);
    exp.setHours(0, 0, 0, 0);
    const diffMs = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 90;
  }).length;

  // Fully Expired Lots Counts
  const expiredCount = grns.filter(g => {
    if (!g.expDate) return false;
    const exp = new Date(g.expDate);
    exp.setHours(0, 0, 0, 0);
    const diffMs = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays <= 0;
  }).length;

  // Inward Entries vs Outward Entries counts
  const totalGrnEntries = grns.length;
  const totalOutwardEntries = outwards.length;

  // Jobwork & Gamma Tracking Calculations
  const totalJobworkOutward = outwards.filter(o => o.department === 'Jobwork / Gamma').reduce((sum, o) => sum + o.qty, 0);
  const totalJobworkReturned = grns.filter(g => g.sourceType === 'Jobwork Return' && g.qcStatus === 'Approved').reduce((sum, g) => sum + g.qty, 0);
  const outstandingJobworkStock = Math.max(0, totalJobworkOutward - totalJobworkReturned);

  // Detailed Department Breakdown counts and quantities
  const getOutwardDeptDetails = (depts: string[]) => {
    const list = outwards.filter(o => depts.includes(o.department));
    const qty = list.reduce((sum, o) => sum + o.qty, 0);
    const entries = list.length;
    return { qty, entries };
  };

  const productionUse = getOutwardDeptDetails(['Production Use', 'Production Line A', 'Production Line B', 'Packing Hall']);
  const fdDepartment = getOutwardDeptDetails(['F&D Department', 'R&D Lab', 'R&D Lab / Trials']);
  const qcDepartment = getOutwardDeptDetails(['QC Department']);
  const materialLoss = getOutwardDeptDetails(['Material Loss', 'Scrap Disposal', 'Scrap & QC Inspection Disposal']);
  const jobworkGamma = getOutwardDeptDetails(['Jobwork / Gamma']);

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* Dynamic Bento Compact Dashboard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* TILE 1: Kitna Material Pada He */}
        <div 
          onClick={() => onNavigateToTab('inventory')}
          className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs hover:border-[#6b3e66] transition group cursor-pointer flex flex-col justify-between min-h-[120px]"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 group-hover:text-[#6b3e66] transition">
              Current Warehouse Stock
            </span>
            <div className="bg-[#6b3e66]/5 text-[#6b3e66] p-1.5 rounded-lg border border-[#F0CDA8]/30">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-800 tracking-tight">
            {netAvailableStock.toLocaleString()}{' '}
            <span className="text-xs font-semibold text-slate-500">Approved Units</span>
          </div>
          <div className="text-[9px] text-slate-500 font-bold tracking-tight mt-1">
            Net material available in stores &rarr;
          </div>
        </div>

        {/* TILE 2: Approved Lots Count */}
        <div 
          onClick={() => onNavigateToTab('grn')}
          className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs hover:border-emerald-600 transition group cursor-pointer flex flex-col justify-between min-h-[120px]"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 group-hover:text-emerald-700 transition">
              QC Approved Lots
            </span>
            <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg border border-emerald-100">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 tracking-tight">
            {qcApprovedCount}{' '}
            <span className="text-xs font-semibold text-slate-500">Released</span>
          </div>
          <div className="text-[9px] text-slate-500 font-bold tracking-tight mt-1">
            Cleared lots available for production issue
          </div>
        </div>

        {/* TILE 3: Pending Lots Count */}
        <div 
          onClick={() => onNavigateToTab('qc')}
          className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs hover:border-amber-500 transition group cursor-pointer flex flex-col justify-between min-h-[120px]"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 group-hover:text-amber-600 transition">
              QC Pending Batches
            </span>
            <div className={`p-1.5 rounded-lg border ${qcPendingCount > 0 ? 'bg-amber-50 text-amber-500 border-amber-200 animate-pulse' : 'bg-slate-50 text-slate-550 border-slate-100'}`}>
              <Hourglass className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 tracking-tight">
            {qcPendingCount}{' '}
            <span className="text-xs font-semibold text-slate-500">Awaiting Lab</span>
          </div>
          <div className="text-[9px] text-slate-500 font-bold tracking-tight mt-1">
            {qcPendingCount > 0 ? 'Urgent lab release decision pending &rarr;' : 'All inward lots cleared'}
          </div>
        </div>

        {/* TILE 4: Rejected Lots Count */}
        <div 
          onClick={() => onNavigateToTab('inventory')}
          className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs hover:border-red-650 transition group cursor-pointer flex flex-col justify-between min-h-[120px]"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 group-hover:text-red-700 transition">
              QC Rejected Lots
            </span>
            <div className="bg-red-50 text-red-600 p-1.5 rounded-lg border border-red-100">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-red-600 tracking-tight">
            {qcRejectedCount}{' '}
            <span className="text-xs font-semibold text-slate-500">Quarantined</span>
          </div>
          <div className="text-[9px] text-slate-500 font-bold tracking-tight mt-1">
            Total rejected batch units locked in store
          </div>
        </div>

        {/* TILE 5: Near Expiry Counts */}
        <div 
          onClick={() => onNavigateToTab('inventory')}
          className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs hover:border-amber-400 transition group cursor-pointer flex flex-col justify-between min-h-[120px]"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 group-hover:text-amber-600 transition">
              Near Expiry Batches
            </span>
            <div className="bg-amber-50 text-amber-500 p-1.5 rounded-lg border border-amber-200">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 tracking-tight">
            {nearExpiryCount}{' '}
            <span className="text-xs font-semibold text-slate-500">Lots (≤ 90d)</span>
          </div>
          <div className="text-[9px] text-slate-500 font-bold tracking-tight mt-1">
            Active lots approaching expiry thresholds
          </div>
        </div>

        {/* TILE 6: Expired Lots Counts */}
        <div 
          onClick={() => onNavigateToTab('inventory')}
          className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs hover:border-red-700 transition group cursor-pointer flex flex-col justify-between min-h-[120px]"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 group-hover:text-red-700 transition">
              Expired Batches
            </span>
            <div className="bg-red-100 text-red-700 p-1.5 rounded-lg border border-red-200 animate-pulse">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-red-700 tracking-tight">
            {expiredCount}{' '}
            <span className="text-xs font-semibold text-slate-500">Locked</span>
          </div>
          <div className="text-[9px] text-slate-500 font-bold tracking-tight mt-1">
            {expiredCount > 0 ? `${expiredCount} expired batches need attention!` : 'No expired lots in stock'}
          </div>
        </div>

        {/* TILE 7: Total GRN entries */}
        <div 
          onClick={() => onNavigateToTab('grn')}
          className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs hover:border-indigo-600 transition group cursor-pointer flex flex-col justify-between min-h-[120px]"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 group-hover:text-indigo-600 transition">
              Total Inward Register Entries
            </span>
            <div className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg border border-indigo-100">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-indigo-600 tracking-tight">
            {totalGrnEntries}{' '}
            <span className="text-xs font-semibold text-slate-500">Vouchers</span>
          </div>
          <div className="text-[9px] text-slate-500 font-bold tracking-tight mt-1">
            Registered supplier, leftover, &amp; jobwork returns
          </div>
        </div>

        {/* TILE 8: Total Outward Entry + CLINICAL CLICK TO EXPAND DETAILS */}
        <div 
          className={`bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs hover:border-[#6b3e66] transition flex flex-col justify-between min-h-[120px] relative ${outwardExpanded ? 'ring-2 ring-[#6b3e66]/40' : ''}`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500">
              Total Outward Issues
            </span>
            <button
              onClick={() => setOutwardExpanded(!outwardExpanded)}
              className="bg-[#6b3e66]/5 hover:bg-[#6b3e66]/15 hover:scale-105 text-[#6b3e66] p-1.5 rounded-lg border border-[#F0CDA8]/40 transition flex items-center gap-1 cursor-pointer absolute right-4 top-4"
              title="Click to expand department wise outward break-down"
            >
              <span className="text-[8px] font-black uppercase tracking-wider pl-0.5">Breakdown</span>
              {outwardExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
          
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-800 tracking-tight">
              {totalOutwardQty.toLocaleString()}{' '}
              <span className="text-xs font-semibold text-slate-500">Issued</span>
            </div>
            <div className="text-[10px] font-semibold text-slate-500 font-mono mt-0.5">
              Across {totalOutwardEntries} outward records
            </div>
          </div>

          <div
            onClick={() => onNavigateToTab('outward')}
            className="text-[9px] text-slate-600 font-black hover:text-[#6b3e66] transition cursor-pointer mt-2 leading-none"
          >
            Manage outward register tab &rarr;
          </div>
        </div>

        {/* TILE 9: Outstanding Jobwork Stock */}
        <div 
          onClick={() => onNavigateToTab('outward')}
          className="bg-white border border-blue-200 rounded-2xl p-4 shadow-xs hover:border-blue-500 transition group cursor-pointer flex flex-col justify-between min-h-[120px]"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-blue-600 group-hover:text-blue-700 transition">
              Outside Jobwork Stock
            </span>
            <div className="bg-blue-50 text-blue-600 p-1.5 rounded-lg border border-blue-100">
              <Share2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-blue-600 tracking-tight">
            {outstandingJobworkStock.toLocaleString()}{' '}
            <span className="text-xs font-semibold text-slate-500">Units Out</span>
          </div>
          <div className="text-[9px] text-slate-500 font-bold tracking-tight mt-1">
            Owned stock dispatched with Gamma (excludes main warehouse inventory)
          </div>
        </div>

      </div>

      {/* Expanded Outward Breakdown Bento Compartment */}
      {outwardExpanded && (
        <div className="bg-slate-50/50 border border-stone-200/60 rounded-2xl p-5 space-y-4 animate-slide-up">
          <div className="flex justify-between items-center border-b border-stone-200/40 pb-2">
            <div>
              <h3 className="text-xs font-extrabold text-slate-850 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#6b3e66] animate-ping" />
                <span>Compact Outward Ledger Distribution</span>
              </h3>
              <p className="text-[10px] text-slate-600 mt-0.5">
                Exact breakdown of outward quantity and entries across departments
              </p>
            </div>
            <button 
              onClick={() => setOutwardExpanded(false)}
              className="text-[9px] font-bold text-slate-600 hover:text-slate-700 bg-white border border-stone-200 px-2.5 py-1 rounded-lg transition shadow-2xs"
            >
              Hide Breakdown
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            
            {/* Dept Outward: Production Use */}
            <div className="bg-white border border-stone-200/50 p-3.5 rounded-xl space-y-1 hover:shadow-2xs transition">
              <div className="flex items-center gap-1.5 text-stone-600 font-bold uppercase text-[9px] tracking-wider">
                <Briefcase className="w-3.5 h-3.5 text-[#6b3e66]" />
                <span>Production Use</span>
              </div>
              <div className="text-base font-black text-slate-800 font-mono pt-1">
                {productionUse.qty.toLocaleString()}{' '}
                <span className="text-[10px] font-normal text-slate-500">Units</span>
              </div>
              <p className="text-[9px] text-slate-500 font-medium">
                Issued in {productionUse.entries} production batches
              </p>
            </div>

            {/* Dept Outward: F&D Department */}
            <div className="bg-white border border-stone-200/50 p-3.5 rounded-xl space-y-1 hover:shadow-2xs transition">
              <div className="flex items-center gap-1.5 text-stone-600 font-bold uppercase text-[9px] tracking-wider">
                <FlaskConical className="w-3.5 h-3.5 text-[#6b3e66]" />
                <span>F&D Department</span>
              </div>
              <div className="text-base font-black text-slate-800 font-mono pt-1">
                {fdDepartment.qty.toLocaleString()}{' '}
                <span className="text-[10px] font-normal text-slate-500">Units</span>
              </div>
              <p className="text-[9px] text-slate-500 font-medium">
                Research trial runs &amp; sampling ({fdDepartment.entries} logs)
              </p>
            </div>

            {/* Dept Outward: QC Department */}
            <div className="bg-white border border-stone-200/50 p-3.5 rounded-xl space-y-1 hover:shadow-2xs transition">
              <div className="flex items-center gap-1.5 text-stone-600 font-bold uppercase text-[9px] tracking-wider">
                <Activity className="w-3.5 h-3.5 text-[#6b3e66]" />
                <span>QC Department</span>
              </div>
              <div className="text-base font-black text-slate-800 font-mono pt-1">
                {qcDepartment.qty.toLocaleString()}{' '}
                <span className="text-[10px] font-normal text-slate-500">Units</span>
              </div>
              <p className="text-[9px] text-slate-500 font-medium">
                Dispatched for quality checks ({qcDepartment.entries} samples)
              </p>
            </div>

            {/* Dept Outward: Material Loss */}
            <div className="bg-white border border-stone-200/50 p-3.5 rounded-xl space-y-1 hover:shadow-2xs transition">
              <div className="flex items-center gap-1.5 text-stone-600 font-bold uppercase text-[9px] tracking-wider">
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Material Loss (Lose)</span>
              </div>
              <div className="text-base font-black text-red-650 font-mono pt-1">
                {materialLoss.qty.toLocaleString()}{' '}
                <span className="text-[10px] font-normal text-slate-500">Units</span>
              </div>
              <p className="text-[9px] text-slate-500 font-medium">
                Scrap &amp; waste loss reported ({materialLoss.entries} entries)
              </p>
            </div>

            {/* Dept Outward: Jobwork / Gamma */}
            <div className="bg-white border border-[#2563eb]/20 p-3.5 rounded-xl space-y-1 hover:shadow-2s hover:border-[#2563eb] transition">
              <div className="flex items-center gap-1.5 text-stone-600 font-bold uppercase text-[9px] tracking-wider">
                <Share2 className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-blue-600">Jobwork / Gamma</span>
              </div>
              <div className="text-base font-black text-blue-600 font-mono pt-1">
                {jobworkGamma.qty.toLocaleString()}{' '}
                <span className="text-[10px] font-normal text-slate-500">Sent</span>
              </div>
              <p className="text-[9px] text-slate-500 font-medium">
                Sent for external processing ({jobworkGamma.entries} dispatches)
              </p>
            </div>

          </div>
        </div>
      )}

      {/* Critical Stock Alert Sector (Only shown when thresholds breached to prevent clutter) */}
      {materials.length > 0 && (
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-3xs space-y-3">
          <div className="flex justify-between items-center border-b border-stone-100 pb-2">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-[#6b3e66]" />
              <span>Current Reorder Warnings &amp; Low Stock Levels</span>
            </h4>
            <span className="text-[9px] font-black uppercase text-[#6b3e66] bg-[#6b3e66]/5 px-2 py-0.5 rounded border border-[#F0CDA8]/30">
              Auto Monitored
            </span>
          </div>

          {(() => {
            const lowStockItems = materials.map(m => {
              // Current stock = Approved inward qty minus total outward qty of this material
              const approvedIn = grns
                .filter(g => g.materialId === m.id && g.qcStatus === 'Approved')
                .reduce((s, g) => s + g.qty, 0);
              const issuedOut = outwards
                .filter(o => o.materialId === m.id)
                .reduce((s, o) => s + o.qty, 0);
              const totalStock = Math.max(0, approvedIn - issuedOut);
              const isLow = totalStock < m.minStock;

              return { material: m, totalStock, isLow };
            }).filter(i => i.isLow);

            if (lowStockItems.length === 0) {
              return (
                <div className="text-[11px] text-slate-500 italic py-2 text-center">
                  All registered materials are completely locked above minimum threshold rules.
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {lowStockItems.map(({ material, totalStock }) => (
                  <div key={material.id} className="bg-[#FAF9F5]/45 border border-[#F0CDA8]/40 p-2.5 rounded-xl flex justify-between items-center">
                    <div>
                      <span className="font-extrabold text-xs text-slate-800 break-all">{material.materialName}</span>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">Code: {material.materialCode}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-red-650 font-mono">{totalStock} {material.uom}</div>
                      <div className="text-[9px] text-slate-500">Min: {material.minStock} {material.uom}</div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

    </div>
  );
}
