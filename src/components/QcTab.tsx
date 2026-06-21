import { Grn, User } from '../types';
import { ShieldCheck, ShieldAlert, CheckCircle, XCircle, CalendarClock, ShieldAlert as LockIcon } from 'lucide-react';

interface QcTabProps {
  grns: Grn[];
  onApproveQc: (id: string) => void;
  onRejectQc: (id: string) => void;
  currentUser: User;
}

export default function QcTab({ grns, onApproveQc, onRejectQc, currentUser }: QcTabProps) {
  const isAuthorized = currentUser.role === 'Admin' || currentUser.role === 'QC Operator';

  // Helper for expiry countdown
  const getDaysLeft = (expString: string) => {
    if (!expString) return { display: 'No Date', isExpired: false, days: 0 };
    const today = new Date();
    // Neutralize time component
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expString);
    exp.setHours(0, 0, 0, 0);

    const diffMs = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { display: 'EXPIRED', isExpired: true, days: diffDays };
    } else if (diffDays === 0) {
      return { display: 'Expires Today!', isExpired: false, days: 0 };
    } else {
      return { display: `${diffDays} Days Left`, isExpired: false, days: diffDays };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold font-sans text-slate-800">Quality Control (QC) Approvals Bench</h2>
        <p className="text-xs text-slate-500 mt-1">
          Approve or reject arriving component batches. Handover passes release active inventory batches for production operations.
        </p>
      </div>

      {!isAuthorized && (
        <div className="flex bg-amber-50 rounded-2xl p-4 border border-amber-200/50 gap-3 items-start">
          <LockIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 leading-relaxed">
            <p className="font-bold text-amber-800">Sign-Off Authority Restricted (Security Policy)</p>
            <p className="mt-0.5">
              Your logged-in profile: <b>{currentUser.name} ({currentUser.role})</b> does not have approval clearances. 
              Only users assigned as <b>Admin</b> or <b>QC Operator</b> can release inventory.
            </p>
          </div>
        </div>
      )}

      {/* QC Main Desk */}
      <div className="bg-white border border-stone-200/55 rounded-2xl shadow-xs p-5 space-y-4">
        <h3 className="font-sans font-bold text-slate-800 text-sm">Arrived Inward Batches Waitlist</h3>
        
        <div className="overflow-x-auto border border-stone-150 rounded-xl">
          <table className="min-w-full divide-y divide-stone-100 text-xs">
            <thead className="bg-[#FAF9F5] text-stone-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">GRN Code</th>
                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Material</th>
                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Batch Code</th>
                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Supplier</th>
                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Quantity</th>
                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Dates (MFG / EXP)</th>
                <th className="px-4 py-3 text-center font-bold uppercase tracking-wider">Life Span</th>
                <th className="px-4 py-3 text-center font-bold uppercase tracking-wider">quality Decision</th>
                <th className="px-4 py-3 text-center font-bold uppercase tracking-wider">Action Bench</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-stone-100 text-slate-705">
              {grns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    No inbound shipments have been registered under GRNs. Click <b>GRN Entry</b> to receive items.
                  </td>
                </tr>
              ) : (
                grns.map((q) => {
                  const countdown = getDaysLeft(q.expDate);
                  
                  return (
                    <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* GRN No */}
                      <td className="px-4 py-3.5 font-bold font-mono text-slate-850">{q.grnNo}</td>
                      
                      {/* Material Name */}
                      <td className="px-4 py-3.5 text-slate-900 font-semibold">{q.materialName}</td>
                      
                      {/* Batch */}
                      <td className="px-4 py-3.5 font-mono text-[11px]">
                        <span className="bg-slate-100/80 px-2 py-0.5 rounded-md text-slate-755 font-bold">
                          {q.batchNo}
                        </span>
                      </td>
                      
                      {/* Supplier */}
                      <td className="px-4 py-3.5 text-slate-500 font-medium truncate max-w-[130px]" title={q.supplierName}>
                        {q.supplierName}
                      </td>
                      
                      {/* Qty */}
                      <td className="px-4 py-3.5 font-bold text-slate-800">{q.qty}</td>
                      
                      {/* Dates */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="text-slate-500">M: {q.mfgDate}</div>
                        <div className="text-slate-800 font-bold">E: {q.expDate}</div>
                      </td>
                      
                      {/* Expiry Days Left */}
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                          countdown.isExpired 
                            ? 'bg-red-50 text-red-700 border border-red-100' 
                            : countdown.days <= 60 
                              ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                              : 'bg-slate-50 text-slate-600'
                        }`}>
                          <CalendarClock className="w-3 h-3 shrink-0" />
                          {countdown.display}
                        </span>
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                          q.qcStatus === 'Approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : q.qcStatus === 'Rejected'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                        }`}>
                          {q.qcStatus}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        {q.qcStatus === 'Pending' ? (
                          <div className="flex gap-1.5 justify-center">
                            <button
                              disabled={!isAuthorized}
                              onClick={() => onApproveQc(q.id)}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-xs rounded-xl shadow-sm transition ${
                                !isAuthorized ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                              }`}
                              title="Approve / Release Stock Batch"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" /> Pass
                            </button>
                            <button
                              disabled={!isAuthorized}
                              onClick={() => onRejectQc(q.id)}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 text-xs rounded-xl shadow-sm transition ${
                                !isAuthorized ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                              }`}
                              title="Reject / Quarantine Batch"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" /> Fail
                            </button>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 font-medium italic">
                            Decided {q.qcReleaseDate ? `on ${q.qcReleaseDate}` : ''}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
