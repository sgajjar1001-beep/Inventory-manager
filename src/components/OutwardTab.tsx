import React, { useState, useEffect } from 'react';
import { Grn, Material, User, Outward } from '../types';
import { 
  FileUp, 
  Search, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Boxes, 
  TrendingUp, 
  ArrowUpRight, 
  Clock, 
  UserSquare, 
  Calendar,
  AlertCircle,
  Edit
} from 'lucide-react';

interface OutwardTabProps {
  materials: Material[];
  grns: Grn[];
  outwards: Outward[];
  onSaveOutward: (outward: Outward) => void;
  onDeleteOutward: (id: string) => void;
  currentUser: User;
  defaultOutwardType?: 'Trial' | 'Sample' | 'Commercial Use';
}

export default function OutwardTab({ 
  materials, 
  grns, 
  outwards, 
  onSaveOutward, 
  onDeleteOutward, 
  currentUser,
  defaultOutwardType
}: OutwardTabProps) {
  const isViewer = currentUser.role === 'Viewer';
  const isQcOnly = currentUser.role === 'QC Operator';
  const cannotIssue = isViewer || isQcOnly;

  // Form states
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [selectedBatchNo, setSelectedBatchNo] = useState('');
  const [qtyToIssue, setQtyToIssue] = useState<number | ''>('');
  const [department, setDepartment] = useState('Production Use');
  const [outwardType, setOutwardType] = useState<'Trial' | 'Sample' | 'Commercial Use'>(() => {
    return defaultOutwardType || 'Commercial Use';
  });
  const [outwardDate, setOutwardDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  
  // Jobwork-specific form states
  const [jobworkVendorName, setJobworkVendorName] = useState('');
  const [jobworkDocNo, setJobworkDocNo] = useState('');
  const [jobworkPackingType, setJobworkPackingType] = useState('Box');
  const [jobworkPackingQty, setJobworkPackingQty] = useState<number | ''>('');
  
  // Filtering & search
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');

  // Status/Messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editingOutwardId, setEditingOutwardId] = useState<string | null>(null);

  // Generate automated next Outward Number
  const [outwardNo, setOutwardNo] = useState('');

  useEffect(() => {
    if (defaultOutwardType) {
      setOutwardType(defaultOutwardType);
    }
  }, [defaultOutwardType]);

  useEffect(() => {
    let prefix = 'OUT-COM-26-';
    let startValStr = '601';

    if (outwardType === 'Trial') {
      prefix = localStorage.getItem('cfg_outward_trial_prefix') || 'OUT-TRL-26-';
      startValStr = localStorage.getItem('cfg_outward_trial_start') || '401';
    } else if (outwardType === 'Sample') {
      prefix = localStorage.getItem('cfg_outward_sample_prefix') || 'OUT-SMP-26-';
      startValStr = localStorage.getItem('cfg_outward_sample_start') || '501';
    } else {
      prefix = localStorage.getItem('cfg_outward_comm_prefix') || localStorage.getItem('cfg_issue_prefix') || 'OUT-COM-26-';
      startValStr = localStorage.getItem('cfg_outward_comm_start') || localStorage.getItem('cfg_issue_start') || '601';
    }

    const count = outwards.filter(o => (o.outwardType || 'Commercial Use') === outwardType).length;
    const nextIdx = count + Number(startValStr);
    setOutwardNo(`${prefix}${String(nextIdx)}`);
  }, [outwards, outwardType]);

  // Approved batches
  const approvedGrns = grns.filter(g => g.qcStatus === 'Approved');

  // Compute stock levels for each batch in the system
  // Batch Stock = Approved GRN Qty - Total Outwards of this specific batch
  const getBatchStockDetails = (mId: string) => {
    const materialGrns = approvedGrns.filter(g => g.materialId === mId);
    
    return materialGrns.map(g => {
      // Calculate how much has been issued from this specific batch
      const issuedQty = outwards
        .filter(o => o.materialId === mId && o.batchNo === g.batchNo)
        .reduce((sum, curr) => sum + curr.qty, 0);

      const availableQty = g.qty - issuedQty;

      // Expiry days left calculation
      const today = new Date();
      today.setHours(0,0,0,0);
      const exp = new Date(g.expDate);
      exp.setHours(0,0,0,0);
      const daysLeft = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      return {
        grn: g,
        availableQty: Math.max(0, availableQty),
        daysLeft,
        isExpired: daysLeft < 0
      };
    }).filter(b => b.availableQty > 0); // Only return batches with stock remaining
  };

  // Available batches for selected material
  const activeBatches = selectedMaterialId ? getBatchStockDetails(selectedMaterialId) : [];

  // Sort batches by ExpDate ascending (FEFO - Near Expiry Recommended) before presentation
  const sortedBatchesByExpiry = [...activeBatches].sort((a, b) => {
    return new Date(a.grn.expDate).getTime() - new Date(b.grn.expDate).getTime();
  });

  const selectedBatchDetails = sortedBatchesByExpiry.find(b => b.grn.batchNo === selectedBatchNo);

  const handleMaterialChange = (materialId: string) => {
    setSelectedMaterialId(materialId);
    setSelectedBatchNo('');
    setQtyToIssue('');
    setErrorMsg(null);
  };

  const handleBatchChange = (batchNo: string) => {
    setSelectedBatchNo(batchNo);
    setQtyToIssue('');
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (cannotIssue) {
      setErrorMsg('Unauthorized: Your role does not have authorization to issue stock to production.');
      return;
    }

    if (!selectedMaterialId) {
      setErrorMsg('Please select a material master item.');
      return;
    }

    if (!selectedBatchNo) {
      setErrorMsg('Please select an active material batch.');
      return;
    }

    if (!qtyToIssue || qtyToIssue <= 0) {
      setErrorMsg('Please enter a valid outward quantity greater than zero.');
      return;
    }

    if (!selectedBatchDetails) {
      setErrorMsg('Invalid batch choice or batch has no stock.');
      return;
    }

    const existingOutward = editingOutwardId ? outwards.find(o => o.id === editingOutwardId) : null;
    const prevQty = existingOutward ? existingOutward.qty : 0;

    if (qtyToIssue > (selectedBatchDetails.availableQty + prevQty)) {
      const materialRefObj = materials.find(m => m.id === selectedMaterialId);
      const activeUom = materialRefObj ? materialRefObj.uom : 'units';
      setErrorMsg(`Insufficient stock: Only ${selectedBatchDetails.availableQty + prevQty} ${activeUom} is available in Batch ${selectedBatchNo} (including the ${prevQty} already issued in this entry).`);
      return;
    }

    if (selectedBatchDetails.isExpired) {
      const confirmProceed = window.confirm("WARNING: This material batch is EXPIRED! Are you sure you want to issue expired material to production?");
      if (!confirmProceed) {
        return;
      }
    }

    const materialRef = materials.find(m => m.id === selectedMaterialId);
    if (!materialRef) {
      setErrorMsg('Selected material was not found in the master index.');
      return;
    }

    if (department === 'Jobwork / Gamma') {
      if (!jobworkVendorName.trim()) {
        setErrorMsg('Please specify the Jobwork Vendor Name (e.g. Gamma Radiation Service).');
        return;
      }
      if (!jobworkDocNo.trim()) {
        setErrorMsg('Please specify the Jobwork Dispatch Document / Challan Number.');
        return;
      }
      if (!jobworkPackingQty || Number(jobworkPackingQty) <= 0) {
        setErrorMsg('Please enter a valid packing quantity (e.g. 1 Box).');
        return;
      }
    }

    const newOutward: Outward = {
      id: editingOutwardId || ('out_' + Date.now()),
      outwardNo,
      outwardDate,
      materialId: selectedMaterialId,
      materialName: materialRef.materialName,
      batchNo: selectedBatchNo,
      qty: Number(qtyToIssue),
      department,
      issuedBy: existingOutward ? existingOutward.issuedBy : currentUser.name,
      remarks: remarks.trim(),
      createdOn: existingOutward ? existingOutward.createdOn : new Date().toISOString(),
      outwardType,
      ...(department === 'Jobwork / Gamma' ? {
        jobworkVendorName: jobworkVendorName.trim(),
        jobworkDocNo: jobworkDocNo.trim(),
        jobworkPackingType,
        jobworkPackingQty: Number(jobworkPackingQty)
      } : {})
    };

    onSaveOutward(newOutward);

    // Reset Form
    setSelectedMaterialId('');
    setSelectedBatchNo('');
    setQtyToIssue('');
    setRemarks('');
    setJobworkVendorName('');
    setJobworkDocNo('');
    setJobworkPackingType('Box');
    setJobworkPackingQty('');
    setEditingOutwardId(null);

    setSuccessMsg(editingOutwardId ? `Outward voucher updated successfully!` : `Stock issued successfully! Outward voucher ${outwardNo} recorded.`);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 4500);
  };

  // Filter outwards history presentation
  const filteredOutwards = outwards.filter(o => {
    const matchesSearch = 
      o.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.batchNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.outwardNo.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = deptFilter === 'All' || o.department === deptFilter;

    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold font-sans text-slate-800">Outward Register</h2>
        <p className="text-xs text-slate-500 mt-1">
          Issue approved material batches for production lines or record outbound dispatch for Jobwork/Gamma processing with full packaging tracking.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form panel */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/55 shadow-xs col-span-1 h-fit space-y-4">
          <h3 className="font-sans font-bold text-slate-805 text-sm flex items-center gap-2">
            <FileUp className="w-4 h-4 text-[#6b3e66]" />
            <span>New Outward Issuance Form</span>
          </h3>

          {cannotIssue ? (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/50 text-[11px] text-slate-700 space-y-1">
              <p className="font-bold text-amber-800">Permission Restricted</p>
              <p>Only users assigned as <b>Admin</b> or <b>GRN Operator</b> roles are permitted to record material issues to production lines.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {errorMsg && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-50 text-emerald-800 p-3 rounded-lg border border-emerald-200 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Outward Memo No
                  </label>
                  <input
                    type="text"
                    disabled
                    value={outwardNo}
                    className="w-full text-slate-500 bg-slate-50 border border-slate-200 text-xs p-2.5 rounded-xl font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    required
                    value={outwardDate}
                    onChange={(e) => setOutwardDate(e.target.value)}
                    className="w-full text-slate-800 bg-slate-50 border border-slate-200 text-xs p-2.5 rounded-xl outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Select Material Group *
                </label>
                <select
                  required
                  value={selectedMaterialId}
                  onChange={(e) => handleMaterialChange(e.target.value)}
                  className="w-full text-slate-800 bg-slate-50 border border-slate-200 text-xs p-2.5 rounded-xl outline-none focus:border-rose-500"
                >
                  <option value="">-- Choose Material Master --</option>
                  {materials.map(m => {
                    // Check if this material has any stock
                    const stockList = getBatchStockDetails(m.id);
                    const totalInvStock = stockList.reduce((s, curr) => s + curr.availableQty, 0);
                    return (
                      <option key={m.id} value={m.id}>
                        {m.materialName} ({m.materialCode}) [Stock: {totalInvStock} {m.uom}]
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedMaterialId && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Select Batch (FEFO Prioritized) *
                    </label>
                    <span className="text-[9px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                      Soonest Expiring Shown First
                    </span>
                  </div>
                  
                  {sortedBatchesByExpiry.length === 0 ? (
                    <div className="text-[11px] text-red-650 bg-red-50/50 p-2.5 rounded-xl border border-red-100 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>No QC-Approved stock or active batches available for this material!</span>
                    </div>
                  ) : (
                    <select
                      required
                      value={selectedBatchNo}
                      onChange={(e) => handleBatchChange(e.target.value)}
                      className="w-full text-slate-800 bg-slate-50 border border-slate-200 text-xs p-2.5 rounded-xl outline-none focus:border-rose-500"
                    >
                      <option value="">-- Select Active Batch --</option>
                      {sortedBatchesByExpiry.map((b, idx) => {
                        const isFefo = idx === 0; // First index is nearest expiry (sorted asc by exp date)
                        const statusNotice = b.isExpired 
                          ? 'EXPIRED' 
                          : b.daysLeft <= 90 
                            ? `Near Expiry: ${b.daysLeft} d left` 
                            : `${b.daysLeft} d left`;
                        const activeMatInfo = materials.find(m => m.id === selectedMaterialId);
                        const matUomText = activeMatInfo ? activeMatInfo.uom : '';

                        return (
                          <option key={b.grn.id} value={b.grn.batchNo}>
                            {b.grn.batchNo} (Qty: {b.availableQty} {matUomText}) [{statusNotice}] {isFefo ? '[FEFO RECOMMENDED]' : ''}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
              )}

              {/* Selected Batch Analytical Badge */}
              {selectedBatchDetails && (
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 text-xs animate-fade-in">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-bold text-[9px] uppercase">Batch Details</span>
                    {sortedBatchesByExpiry[0]?.grn.batchNo === selectedBatchNo && (
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide animate-pulse flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" /> FEFO Ideal Pick
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-705">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Available Stock:</span>
                      <strong className="text-slate-850 font-bold text-xs">
                        {selectedBatchDetails.availableQty} {materials.find(m => m.id === selectedMaterialId)?.uom || ''}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Expiration:</span>
                      <strong className={selectedBatchDetails.isExpired ? 'text-red-700' : 'text-slate-850'}>
                        {selectedBatchDetails.grn.expDate ? selectedBatchDetails.grn.expDate.split('-').reverse().join('-') : 'N/A'} ({selectedBatchDetails.isExpired ? 'EXPIRED' : `${selectedBatchDetails.daysLeft} days`})
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Qty to Outward *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 50"
                    value={qtyToIssue}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      setQtyToIssue(val);
                    }}
                    className="w-full text-slate-800 bg-slate-50 border border-slate-200 text-xs p-2.5 rounded-xl outline-none focus:border-rose-500 font-bold"
                  />
                </div>

                 <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Production Dept / Destination *
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full text-slate-800 bg-slate-50 border border-slate-200 text-xs p-2.5 rounded-xl outline-none focus:border-rose-500"
                  >
                    <option value="Production Use">Production Use</option>
                    <option value="F&D Department">F&D Department</option>
                    <option value="QC Department">QC Department</option>
                    <option value="Material Loss">Material Loss</option>
                    <option value="Jobwork / Gamma">Jobwork / Gamma</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Issue Classification / Type *
                </label>
                <select
                  value={outwardType}
                  onChange={(e) => setOutwardType(e.target.value as any)}
                  className="w-full text-slate-800 bg-slate-50 border border-slate-200 text-xs p-2.5 rounded-xl outline-none focus:border-rose-500 font-bold"
                >
                  <option value="Commercial Use">Commercial Use</option>
                  <option value="Trial">Trial</option>
                  <option value="Sample">Sample</option>
                </select>
              </div>

              {department === 'Jobwork / Gamma' && (
                <div className="p-3.5 bg-blue-50/50 border border-blue-200/60 rounded-xl space-y-3 animate-fade-in text-xs">
                  <span className="text-[10px] font-extrabold text-blue-700 uppercase tracking-widest block border-b border-blue-200/40 pb-1">
                    Gamma / Jobwork Dispatch Details
                  </span>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1">
                      Jobwork Vendor / Partner *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Gamma Radiation Services Ltd"
                      value={jobworkVendorName}
                      onChange={(e) => setJobworkVendorName(e.target.value)}
                      className="w-full text-slate-800 bg-white border border-slate-200 text-xs p-2 rounded-lg outline-none focus:border-blue-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1">
                      Challan / Document Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CHN-9988-26"
                      value={jobworkDocNo}
                      onChange={(e) => setJobworkDocNo(e.target.value)}
                      className="w-full text-slate-800 bg-white border border-slate-200 text-xs p-2 rounded-lg outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1">
                        Packing Type *
                      </label>
                      <select
                        value={jobworkPackingType}
                        onChange={(e) => setJobworkPackingType(e.target.value)}
                        className="w-full text-slate-800 bg-white border border-slate-200 text-xs p-2 rounded-lg outline-none focus:border-blue-500"
                      >
                        <option value="Box">Box</option>
                        <option value="Bag">Bag</option>
                        <option value="Drum">Drum</option>
                        <option value="Container">Container</option>
                        <option value="Packet">Packet</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1">
                        Packaging Qty *
                      </label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 1"
                        value={jobworkPackingQty}
                        onChange={(e) => setJobworkPackingQty(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full text-slate-800 bg-white border border-slate-200 text-xs p-2 rounded-lg outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>
                  <p className="text-[9px] text-blue-650 italic font-medium leading-normal">
                    ⚠️ Stock will be dispatched outside, but remains your property. tracked separately.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Purpose / Outward Remarks
                </label>
                <textarea
                  placeholder="e.g. Cleared for packaging run B-88"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full text-slate-800 bg-slate-50 border border-slate-200 text-xs p-2.5 rounded-xl outline-none focus:border-rose-500 h-16 resize-none"
                />
              </div>

              <div className="space-y-2">
                <button
                  type="submit"
                  className={`w-full py-2.5 px-4 active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer font-sans ${
                    editingOutwardId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#6b3e66] hover:bg-[#7b4775]'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4 text-[#F0CDA8]" />
                  <span>{editingOutwardId ? 'Update Outward Issue' : 'Issue to Production Area'}</span>
                </button>

                {editingOutwardId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingOutwardId(null);
                      setSelectedMaterialId('');
                      setSelectedBatchNo('');
                      setQtyToIssue('');
                      setRemarks('');
                      setJobworkVendorName('');
                      setJobworkDocNo('');
                      setJobworkPackingType('Box');
                      setJobworkPackingQty('');
                    }}
                    className="w-full py-2 px-4 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                  >
                    Cancel Editing
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* History / Audit Logs */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/55 shadow-xs col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-sans font-bold text-slate-850 text-sm flex items-center gap-2">
              <Boxes className="w-4 h-4 text-[#6b3e66]" />
              <span>Material Outward Issue Logs (Production Use Audit Trail)</span>
            </h3>
            
            <div className="text-[10px] px-2.5 py-1.5 bg-[#FAF9F5] border border-[#F0CDA8]/50 rounded-xl text-[#6b3e66] font-bold max-w-fit font-sans">
              Total Issued/Used Outwards: {outwards.reduce((acc, curr) => acc + curr.qty, 0)} Units
            </div>
          </div>

          {/* Filters shelf */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="relative">
              <input
                type="text"
                placeholder="Search Material or batch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-slate-800 bg-white border border-slate-200 text-xs p-2 pl-8 outline-none rounded-lg"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            <div>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full text-slate-800 bg-white border border-slate-200 text-xs p-2 outline-none rounded-lg"
              >
                <option value="All">All Departments</option>
                <option value="Production Use">Production Use</option>
                <option value="F&D Department">F&D Department</option>
                <option value="QC Department">QC Department</option>
                <option value="Material Loss">Material Loss</option>
                <option value="Jobwork / Gamma">Jobwork / Gamma</option>
              </select>
            </div>

            <div className="flex items-center justify-end text-[10px] text-slate-400 font-sans">
              Showing {filteredOutwards.length} Outwards
            </div>
          </div>

          {/* Audit trail table */}
          {filteredOutwards.length === 0 ? (
            <div className="p-8 border border-slate-100 rounded-2xl text-center space-y-1.5 text-slate-400">
              <Boxes className="w-8 h-8 mx-auto opacity-30 text-rose-500 animate-pulse" />
              <p className="text-xs font-semibold">No Outward Issue Logs Found</p>
              <p className="text-[10px]">Material has not been supplied out to production yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-stone-150 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF9F5] border-b border-stone-200/40 text-[10px] text-stone-500 font-bold uppercase tracking-wider">
                    <th className="p-3">Memo Detail</th>
                    <th className="p-3">Material &amp; Code</th>
                    <th className="p-3 text-center">Batch Issued</th>
                    <th className="p-3 text-center">Qty Used</th>
                    <th className="p-3 text-center font-bold">Mfg Date</th>
                    <th className="p-3 text-center font-bold">Exp Date</th>
                    <th className="p-3">Issued To</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-[11px] text-[#1B1319]">
                  {filteredOutwards.map(o => {
                    const matchedMfgExp = grns.find(g => g.materialId === o.materialId && g.batchNo === o.batchNo);
                    return (
                      <tr key={o.id} className="hover:bg-stone-50/50 transition">
                        <td className="p-3 font-mono">
                          <div className="font-bold text-slate-800">{o.outwardNo}</div>
                          <div className="text-[9px] text-stone-400 flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5 text-[#6b3e66]" />
                            <span>{o.outwardDate}</span>
                          </div>
                        </td>
                        <td className="p-3 font-sans">
                          <div className="font-bold text-slate-800">{o.materialName}</div>
                          <div className="text-[10px] font-mono text-stone-400">{o.materialId}</div>
                        </td>
                        <td className="p-3 text-center font-mono">
                          <span className="bg-[#FAF9F5] text-[#6b3e66] font-bold px-2 py-0.5 rounded border border-[#F0CDA8]/45">
                            {o.batchNo}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-[#6b3e66] font-mono">
                          {o.qty}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-500 whitespace-nowrap">
                          {matchedMfgExp?.mfgDate || 'N/A'}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-500 whitespace-nowrap">
                          {matchedMfgExp?.expDate || 'N/A'}
                        </td>
                        <td className="p-3 font-sans">
                          <div className="font-bold text-slate-800">{o.department}</div>
                        
                        {o.department === 'Jobwork / Gamma' && o.jobworkVendorName && (
                          <div className="mt-1 p-1 bg-blue-50/70 border border-blue-100 rounded text-[9px] text-blue-800 max-w-fit font-semibold space-y-0.5">
                            <div><span className="text-slate-400 font-bold uppercase">Vendor:</span> {o.jobworkVendorName}</div>
                            <div><span className="text-slate-400 font-bold uppercase">Challan:</span> <span className="font-mono">{o.jobworkDocNo}</span></div>
                            <div><span className="text-slate-400 font-bold uppercase">Packing:</span> {o.jobworkPackingQty} x {o.jobworkPackingType}</div>
                          </div>
                        )}

                        <div className="text-[9px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                          <UserSquare className="w-3 h-3 text-slate-400" />
                          <span>{o.issuedBy}</span>
                        </div>
                        {o.outwardType && (
                          <span className={`inline-block mt-1 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                            o.outwardType === 'Trial' 
                              ? 'bg-blue-50 text-blue-700 border border-blue-105'
                              : o.outwardType === 'Sample'
                                ? 'bg-purple-50 text-purple-700 border border-purple-105'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-105'
                          }`}>
                            {o.outwardType}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {!cannotIssue && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingOutwardId(o.id);
                                setOutwardNo(o.outwardNo);
                                setSelectedMaterialId(o.materialId);
                                setSelectedBatchNo(o.batchNo);
                                setQtyToIssue(o.qty);
                                setDepartment(o.department);
                                setOutwardDate(o.outwardDate);
                                setRemarks(o.remarks);
                                setJobworkVendorName(o.jobworkVendorName || '');
                                setJobworkDocNo(o.jobworkDocNo || '');
                                setJobworkPackingType(o.jobworkPackingType || 'Box');
                                setJobworkPackingQty(o.jobworkPackingQty || '');
                                
                                const formEl = document.querySelector('form');
                                if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="bg-slate-50 hover:bg-amber-50 border border-slate-150 text-amber-550 p-2 rounded-lg transition"
                              title="Edit Outward Issue Memo"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {currentUser.role === 'Admin' ? (
                            <button
                              type="button"
                              onClick={() => {
                                const confirmDel = window.confirm(`Restore stock and delete outward log memory ${o.outwardNo}?`);
                                if (confirmDel) {
                                  onDeleteOutward(o.id);
                                }
                              }}
                              className="bg-slate-50 hover:bg-rose-50 border border-slate-100 text-slate-450 hover:text-red-650 p-2 rounded-lg transition"
                              title="Delete Outward Ledger Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[9px] text-slate-450 italic font-mono block">Operator Only</span>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}`
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
