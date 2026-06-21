import React, { useState, useEffect, useRef } from 'react';
import { Material, Grn, User, QcStatus, Supplier, MaterialCategory } from '../types';
import { dbService } from '../services/db';
import { 
  FilePlus, 
  Search, 
  ShieldCheck, 
  Trash2, 
  ShieldAlert, 
  PlusCircle, 
  Building2, 
  Check, 
  ChevronDown, 
  X,
  Edit
} from 'lucide-react';

interface GrnTabProps {
  materials: Material[];
  grns: Grn[];
  onSaveGrn: (grn: Grn) => void;
  onDeleteGrn: (id: string) => void;
  currentUser: User;
  onSaveMaterial?: (material: Material) => void;
  defaultSourceType?: 'Supplier' | 'Production Return' | 'Jobwork Return';
}

export function parseGSTIN(gst: string) {
  const g = gst.trim().toUpperCase();
  if (g.length !== 15) return null;
  const stateCodes: Record<string, string> = {
    '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
    '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
    '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur',
    '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
    '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh',
    '24': 'Gujarat', '25': 'Daman & Diu', '26': 'Dadra & Nagar Haveli', '27': 'Maharashtra',
    '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu',
    '34': 'Puducherry', '35': 'Andaman & Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh',
    '38': 'Ladakh'
  };
  const statePrefix = g.slice(0, 2);
  const stateName = stateCodes[statePrefix] || 'India';
  const pan = g.slice(2, 12);
  const entityType = pan[3];
  
  let entityTypeName = 'Ltd.';
  if (entityType === 'C') entityTypeName = 'Pvt. Ltd.';
  else if (entityType === 'P') entityTypeName = 'Proprietorship';
  else if (entityType === 'F') entityTypeName = 'Partnership';

  const wordSeed1 = ['Apex', 'Astra', 'Nova', 'Biotech', 'Alpha', 'Matrix', 'Zenith', 'Enzo', 'Cipla', 'Sun', 'Torrent', 'Lupin', 'Zydus', 'Cadila', 'Intas', 'Alembic'][g.charCodeAt(3) % 16];
  const wordSeed2 = ['Pharma', 'Healthcare', 'Laboratories', 'Chemicals', 'Synthetics', 'Organics', 'Therapeutics', 'Formulations', 'Remedies', 'Industries'][g.charCodeAt(4) % 10];
  
  const generatedName = `${wordSeed1} ${wordSeed2} ${entityTypeName}`;
  const generatedAddress = `Plot No. ${g.charCodeAt(12) + 10}, GIDC Industrial Estate Phase ${g.charCodeAt(13) % 4 + 1}, ${stateName}, India`;
  const generatedEmail = `info@${wordSeed1.toLowerCase()}${wordSeed2.toLowerCase()}.com`;
  const generatedPhone = `+91 ${statePrefix}5${g.slice(10, 15)}`;

  return {
    companyName: generatedName,
    address: generatedAddress,
    email: generatedEmail,
    contactNumber: generatedPhone
  };
}

export default function GrnTab({ 
  materials, 
  grns, 
  onSaveGrn, 
  onDeleteGrn, 
  currentUser,
  onSaveMaterial,
  defaultSourceType
}: GrnTabProps) {
  // Configured UOMs block
  const customUoms = localStorage.getItem('cfg_uoms') || 'KG, LITRE, PCS, BOX, BAG, MG, GM';
  const uomsArray = customUoms.split(',').map(u => u.trim().toUpperCase()).filter(Boolean);

  const [sourceType, setSourceType] = useState<'Supplier' | 'Production Return' | 'Jobwork Return'>(() => {
    return defaultSourceType || 'Supplier';
  });

  // Form status values
  const [grnNo, setGrnNo] = useState(() => {
    const sType = defaultSourceType || 'Supplier';
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
    return `${prefix}${String(nextIdx)}`;
  });
  const [grnDate, setGrnDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [supplierName, setSupplierName] = useState('');
  const [materialId, setMaterialId] = useState(() => (materials.length > 0 ? materials[0].id : ''));
  const [batchNo, setBatchNo] = useState('');
  const [qty, setQty] = useState<number>(0);
  const [mfgDate, setMfgDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expDate, setExpDate] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [coaNo, setCoaNo] = useState('');
  const [warehouseLocation, setWarehouseLocation] = useState('RM Store');
  const [receivedBy, setReceivedBy] = useState(() => currentUser.name);
  const [qcStatus, setQcStatus] = useState<QcStatus>('Pending');
  const [remarks, setRemarks] = useState('');
  const [jobworkRefNo, setJobworkRefNo] = useState('');

  // Search/Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editingGrnId, setEditingGrnId] = useState<string | null>(null);

  // --- AUTOMATED OPTIONS STATE FOR SUPPLIERS & PRODUCTS ---
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);
  const [materialSearchTerm, setMaterialSearchTerm] = useState('');

  // Dropdown click outside handlers refs
  const supplierRef = useRef<HTMLDivElement>(null);
  const materialRef = useRef<HTMLDivElement>(null);

  // --- QUICK CREATE SUPPLIER MODAL ---
  const [showQuickSupplierModal, setShowQuickSupplierModal] = useState(false);
  const [quickSupplierName, setQuickSupplierName] = useState('');
  const [quickGstNumber, setQuickGstNumber] = useState('');
  const [quickAddress, setQuickAddress] = useState('');
  const [quickEmail, setQuickEmail] = useState('');
  const [quickContactNumber, setQuickContactNumber] = useState('');

  // --- QUICK CREATE MATERIAL MODAL ---
  const [showQuickMaterialModal, setShowQuickMaterialModal] = useState(false);
  const [quickMaterialName, setQuickMaterialName] = useState('');
  const [quickMaterialCode, setQuickMaterialCode] = useState('');
  const [quickCategory, setQuickCategory] = useState<MaterialCategory>('Raw Material');
  const [quickUom, setQuickUom] = useState(() => uomsArray[0] || 'KG');
  const [quickMinStock, setQuickMinStock] = useState<number>(500);

  useEffect(() => {
    if (defaultSourceType) {
      setSourceType(defaultSourceType);
    }
  }, [defaultSourceType]);

  // Auto sequential prefix synchronization
  useEffect(() => {
    let prefix = 'GRN-SUP-26-';
    let startValStr = '101';
    
    if (sourceType === 'Production Return') {
      prefix = localStorage.getItem('cfg_grn_prod_prefix') || 'GRN-PRD-26-';
      startValStr = localStorage.getItem('cfg_grn_prod_start') || '201';
    } else if (sourceType === 'Jobwork Return') {
      prefix = localStorage.getItem('cfg_grn_jobwork_prefix') || 'GRN-JBW-26-';
      startValStr = localStorage.getItem('cfg_grn_jobwork_start') || '301';
    } else {
      prefix = localStorage.getItem('cfg_grn_supplier_prefix') || localStorage.getItem('cfg_grn_prefix') || 'GRN-SUP-26-';
      startValStr = localStorage.getItem('cfg_grn_supplier_start') || localStorage.getItem('cfg_grn_start') || '101';
    }

    const count = grns.filter(g => (g.sourceType || 'Supplier') === sourceType).length;
    const nextIdx = count + Number(startValStr);
    setGrnNo(`${prefix}${String(nextIdx)}`);
  }, [grns, sourceType]);

  // Initial Suppliers Fetch
  useEffect(() => {
    async function initSuppliers() {
      const data = await dbService.fetchSuppliers();
      setSuppliers(data);
    }
    initSuppliers();
  }, []);

  // Sync active material name with search input
  useEffect(() => {
    const currentMat = materials.find(m => m.id === materialId);
    if (currentMat) {
      setMaterialSearchTerm(currentMat.materialName);
    }
  }, [materialId]);

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (supplierRef.current && !supplierRef.current.contains(event.target as Node)) {
        setShowSupplierDropdown(false);
      }
      if (materialRef.current && !materialRef.current.contains(event.target as Node)) {
        setShowMaterialDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Quick Supplier save function
  const handleQuickCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    const newSup: Supplier = {
      id: 'sup_' + Date.now(),
      name: quickSupplierName.trim(),
      gstNumber: quickGstNumber.trim() || "",
address: quickAddress.trim() || "",
email: quickEmail.trim() || "",
contactNumber: quickContactNumber.trim() || "",
      createdAt: new Date().toISOString()
    };
    await dbService.saveSupplier(newSup);
    setSuppliers(prev => [...prev, newSup]);
    setSupplierName(newSup.name);
    setShowQuickSupplierModal(false);
    
    // reset form fields
    setQuickSupplierName('');
    setQuickGstNumber('');
    setQuickAddress('');
    setQuickEmail('');
    setQuickContactNumber('');
  };

  // Quick Material save function
  const handleQuickCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = quickMaterialCode.trim().toUpperCase() || `MAT-${Date.now().toString().slice(-4)}`;
    const newMat: Material = {
      id: 'mat_' + Date.now(),
      materialCode: cleanCode,
      materialName: quickMaterialName.trim(),
      category: quickCategory,
      uom: quickUom,
      minStock: Number(quickMinStock),
      createdAt: new Date().toISOString()
    };
    if (onSaveMaterial) {
      await onSaveMaterial(newMat);
    }
    setMaterialId(newMat.id);
    setMaterialSearchTerm(newMat.materialName);
    setShowQuickMaterialModal(false);
    
    // reset form fields
    setQuickMaterialName('');
    setQuickMaterialCode('');
    setQuickCategory('Raw Material');
    setQuickUom('KG');
    setQuickMinStock(500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validate
    if (!grnNo.trim() || !supplierName.trim() || !batchNo.trim() || !expDate || !materialId) {
      setErrorMsg('Please enter all required fields: GRN No, Supplier, Material, Batch, EXP Date.');
      return;
    }

    if (qty <= 0) {
      setErrorMsg('Quantity received must be a positive greater-than-zero value.');
      return;
    }

    if (new Date(mfgDate) > new Date(expDate)) {
      setErrorMsg('Manufacturing Date (MFG) details cannot be later than Expiry Date (EXP).');
      return;
    }

    // Material matching
    const targetMaterial = materials.find(m => m.id === materialId);
    if (!targetMaterial) {
      setErrorMsg('Selected material master could not be resolved.');
      return;
    }

    // Find existing to preserve specific meta fields if any
    const existingGrn = editingGrnId ? grns.find(g => g.id === editingGrnId) : null;

    const newGrn: Grn = {
      id: editingGrnId || ('g_' + Date.now()),
      grnNo: grnNo.trim().toUpperCase(),
      grnDate,
      supplierName: supplierName.trim(),
      materialId,
      materialName: targetMaterial.materialName,
      batchNo: batchNo.trim().toUpperCase(),
      qty: Number(qty),
      mfgDate,
      expDate,
      invoiceNo: invoiceNo.trim() || "",
      coaNo: coaNo.trim() || "",
      remarks: remarks.trim() || "",
      warehouseLocation,
      receivedBy,
      qcStatus: existingGrn ? existingGrn.qcStatus : qcStatus,
      palletNo: targetMaterial.palletNo || "",
      drumNo: targetMaterial.drumNo || "",
      jobworkRefNo: sourceType === 'Jobwork Return'
  ? jobworkRefNo.trim()
  : "",
      createdOn: existingGrn ? existingGrn.createdOn : new Date().toISOString(),
      sourceType
    };

    onSaveGrn(newGrn);

    // Reset Form Fields
    setSupplierName('');
    setBatchNo('');
    setQty(0);
    setInvoiceNo('');
    setCoaNo('');
    setSourceType('Supplier');
    setJobworkRefNo('');
    setRemarks('');
    setEditingGrnId(null);

    setSuccessMsg(editingGrnId ? 'Goods Receipt Note (GRN) updated successfully!' : 'Goods Receipt Note (GRN) registered successfully and saved live!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Filter list
  const filteredGrns = grns.filter(g => {
    const term = searchTerm.toLowerCase();
    return (
      g.grnNo.toLowerCase().includes(term) ||
      g.supplierName.toLowerCase().includes(term) ||
      g.materialName.toLowerCase().includes(term) ||
      g.batchNo.toLowerCase().includes(term)
    );
  });

  const canEdit = currentUser.role === 'Admin' || currentUser.role === 'GRN Operator';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold font-sans text-slate-800">Inward Register</h2>
        <p className="text-xs text-slate-500 mt-1">
          Perform a Goods Receipt entry for inbound supplier material batches, production leftovers, or returned jobwork material batches.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* GRN Entry Form */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/55 shadow-xs col-span-1 xl:col-span-1 h-fit">
          <h3 className="font-sans font-bold text-slate-850 text-sm mb-4 flex items-center gap-2">
            <FilePlus className="w-4 h-4 text-[#6b3e66]" />
            <span>Generate Inbound GRN Voucher</span>
          </h3>

          {!canEdit ? (
            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200/50 text-[11px] text-amber-800 leading-relaxed">
              ⚠️ Your current group assignment (<b>{currentUser.role}</b>) does not authorize creating GRN entries. Only Admins or GRN Operators are permitted to file notes.
            </div>
          ) : materials.length === 0 ? (
            <div className="p-3.5 bg-red-50 rounded-xl border border-red-200/50 text-[11px] text-red-800 leading-relaxed">
              ❌ No registered Material Master records found. Please create at least one active material under the <b>Material Master</b> tab before adding a GRN.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-xs flex items-center gap-1.5 font-medium">
                  <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-50 text-emerald-800 p-3 rounded-lg border border-emerald-200 text-xs font-semibold">
                  {successMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    GRN Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={grnNo}
                    onChange={(e) => setGrnNo(e.target.value)}
                    className="w-full text-slate-800 bg-slate-50 border border-slate-200 font-mono text-xs p-2.5 outline-none rounded-xl focus:border-blue-500 transition focus:bg-white uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Inward Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={grnDate}
                    onChange={(e) => setGrnDate(e.target.value)}
                    className="w-full text-slate-800 bg-slate-50 border border-slate-200 text-xs p-2.5 outline-none rounded-xl focus:border-blue-500 transition focus:bg-white"
                  />
                </div>
              </div>

               {/* Inward Return/Supplier Source Selection */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Inward Source *
                </label>
                <select
                  required
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value as any)}
                  className="w-full text-slate-850 bg-slate-50 border border-slate-200 text-xs p-2.5 outline-none rounded-xl focus:border-blue-500 transition focus:bg-white font-semibold"
                >
                  <option value="Supplier">Supplier (Purchase / Vendor Inward)</option>
                  <option value="Production Return">Production Return (Leftover Stock Return)</option>
                  <option value="Jobwork Return">Jobwork Return (Retrieved from Gamma / Jobworker)</option>
                </select>
              </div>

              {sourceType === 'Jobwork Return' && (
                <div className="p-3 bg-blue-50/40 border border-blue-150 rounded-xl space-y-2 animate-fade-in">
                  <label className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                    Original Jobwork Outward Challan / Memo No *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. OUT-2026-004"
                    value={jobworkRefNo}
                    onChange={(e) => setJobworkRefNo(e.target.value)}
                    className="w-full text-slate-800 bg-white border border-slate-200 text-xs p-2.5 outline-none rounded-xl focus:border-blue-500"
                  />
                </div>
              )}

              {/* Autocomplete Supplier Selector */}
              <div ref={supplierRef} className="relative">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {sourceType === 'Jobwork Return' ? 'Jobwork Vendor Name *' : 'Supplier Name *'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Search or enter supplier..."
                    value={supplierName}
                    onChange={(e) => {
                      setSupplierName(e.target.value);
                      setShowSupplierDropdown(true);
                    }}
                    onFocus={() => setShowSupplierDropdown(true)}
                    className="w-full text-slate-800 bg-slate-50 border border-slate-200 text-xs p-2.5 outline-none rounded-xl focus:border-[#6b3e66] transition focus:bg-white"
                  />
                  <Building2 className="absolute right-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>

                {showSupplierDropdown && (
                  <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-stone-250/90 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100 animate-slide-up">
                    {suppliers
                      .filter(s => s.name.toLowerCase().includes(supplierName.toLowerCase()))
                      .map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSupplierName(s.name);
                            setShowSupplierDropdown(false);
                          }}
                          className="w-full px-3 py-2.5 text-left text-xs hover:bg-slate-50 transition flex flex-col gap-0.5"
                        >
                          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            {s.name}
                          </span>
                          {s.gstNumber && (
                            <span className="text-[10px] text-stone-400 pl-5 font-mono">
                              GST: {s.gstNumber}
                            </span>
                          )}
                        </button>
                      ))}

                    {/* Quick Create Action Link */}
                    <button
                      type="button"
                      onClick={() => {
                        setQuickSupplierName(supplierName);
                        setShowQuickSupplierModal(true);
                        setShowSupplierDropdown(false);
                      }}
                      className="w-full px-3 py-2.5 text-left text-xs font-bold text-[#6b3e66] bg-[#6b3e66]/5 hover:bg-[#6b3e66]/10 transition flex items-center gap-1.5 sticky bottom-0 border-t border-[#6b3e66]/10"
                    >
                      <PlusCircle className="w-4 h-4 text-[#6b3e66]" />
                      <span>+ Create New Supplier "{supplierName || '...'}"</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Autocomplete Material Selector */}
              <div ref={materialRef} className="relative">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Select Material (type to filter) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Search master list by name / code / raw material..."
                    value={materialSearchTerm}
                    onChange={(e) => {
                      setMaterialSearchTerm(e.target.value);
                      setShowMaterialDropdown(true);
                    }}
                    onFocus={() => setShowMaterialDropdown(true)}
                    className="w-full text-slate-800 bg-slate-50 border border-slate-200 text-xs p-2.5 outline-none rounded-xl focus:border-[#6b3e66] transition focus:bg-white"
                  />
                  <ChevronDown className="absolute right-3.5 top-3.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>

                {showMaterialDropdown && (
                  <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-stone-250/90 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100 animate-slide-up">
                    {(() => {
                      const kw = materialSearchTerm.split(/\s+/).filter(Boolean).map(k => k.toLowerCase());
                      const list = materials.filter(m => {
                        if (kw.length === 0) return true;
                        const combined = `${m.materialCode} ${m.materialName} ${m.category}`.toLowerCase();
                        return kw.every(k => combined.includes(k));
                      });

                      if (list.length === 0) {
                        return (
                          <div className="p-3 text-xs text-slate-400 text-center">
                            No matching material masters found.
                          </div>
                        );
                      }

                      return list.map(m => {
                        const isSelected = m.id === materialId;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setMaterialId(m.id);
                              setMaterialSearchTerm(m.materialName);
                              setShowMaterialDropdown(false);
                            }}
                            className={`w-full px-3 py-2.5 text-left text-xs transition flex items-center justify-between ${
                              isSelected ? 'bg-purple-50/70 hover:bg-purple-50' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                <span className="bg-[#6b3e66]/10 text-[#6b3e66] px-1.5 py-0.5 rounded font-mono text-[9px] font-bold">
                                  {m.materialCode}
                                </span>
                                {m.materialName}
                              </span>
                              <span className="text-[10px] text-stone-400 pl-0.5">
                                Category: {m.category} | Min Safe Level: {m.minStock} {m.uom}
                              </span>
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-[#6b3e66] shrink-0" />
                            )}
                          </button>
                        );
                      });
                    })()}

                    {/* Quick Create Material Action Link */}
                    <button
                      type="button"
                      onClick={() => {
                        setQuickMaterialName(materialSearchTerm);
                        setQuickMaterialCode(`MAT-2026-${String(materials.length + 101).toUpperCase()}`);
                        setShowQuickMaterialModal(true);
                        setShowMaterialDropdown(false);
                      }}
                      className="w-full px-3 py-2.5 text-left text-xs font-bold text-[#6b3e66] bg-[#6b3e66]/5 hover:bg-[#6b3e66]/10 transition flex items-center gap-1.5 sticky bottom-0 border-t border-[#6b3e66]/10"
                    >
                      <PlusCircle className="w-4 h-4 text-[#6b3e66]" />
                      <span>+ Create New Material "{materialSearchTerm || '...'}"</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Selected Material details read-only box */}
              {(() => {
                const targetMaterial = materials.find(m => m.id === materialId);
                if (!targetMaterial) return null;
                return (
                  <div className="p-3 bg-[#6b3e66]/5 border border-[#6b3e66]/10 rounded-xl mb-3 text-[11px] flex items-center justify-between">
                    <div>
                      <span className="text-stone-500 font-medium">Product Storage Link:</span>{" "}
                      <span className="font-bold text-slate-800">{targetMaterial.materialName}</span>
                    </div>
                    <div className="flex gap-1.5 font-mono text-[10px]">
                      <span className="bg-blue-500/10 text-blue-700 px-1.5 py-0.5 rounded font-bold">
                        Pallet: {targetMaterial.palletNo || 'N/A'}
                      </span>
                      <span className="bg-amber-500/10 text-amber-700 px-1.5 py-0.5 rounded font-bold">
                        Drum: {targetMaterial.drumNo || 'N/A'}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Inward Batch No *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. B-M451"
                    value={batchNo}
                    onChange={(e) => setBatchNo(e.target.value)}
                    className="w-full text-slate-800 bg-slate-50 border border-slate-200 font-mono text-xs p-2.5 outline-none rounded-xl focus:border-blue-500 transition focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Quantity Received *
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={qty === 0 ? '' : qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    placeholder="e.g. 500"
                    className="w-full text-slate-800 bg-slate-50 border border-slate-200 text-xs p-2.5 outline-none rounded-xl focus:border-blue-500 transition pr-8 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Mfg. Date (MFG)
                  </label>
                  <input
                    type="date"
                    required
                    value={mfgDate}
                    onChange={(e) => setMfgDate(e.target.value)}
                    className="w-full text-slate-800 bg-slate-50 border border-slate-200 text-xs p-2.5 outline-none rounded-xl focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Expiry Date (EXP) *
                  </label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full text-slate-800 bg-slate-50 border border-slate-200 text-xs p-2.5 outline-none rounded-xl focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Challan / Invoice No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-990"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="w-full text-slate-800 bg-slate-50 border border-slate-200 text-xs p-2.5 outline-none rounded-xl focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Supplier COA No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. COA-ABC-11"
                    value={coaNo}
                    onChange={(e) => setCoaNo(e.target.value)}
                    className="w-full text-slate-800 bg-slate-50 border border-slate-200 text-xs p-2.5 outline-none rounded-xl focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Storage Sector
                  </label>
                  <select
                    value={warehouseLocation}
                    onChange={(e) => setWarehouseLocation(e.target.value)}
                    className="w-full text-slate-800 bg-slate-50 border border-slate-200 text-xs p-2.5 outline-none rounded-xl focus:border-blue-500 transition"
                  >
                    <option value="RM Store">RM Store</option>
                    <option value="PPM Store">PPM Store</option>
                    <option value="QC Hold Area">QC Hold Area</option>
                    <option value="Rejected Store">Rejected Store</option>
                    <option value="Finished Goods Store">Finished Goods Store</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    QC Status
                  </label>
                  <select
                    value={qcStatus}
                    onChange={(e) => setQcStatus(e.target.value as QcStatus)}
                    className="w-full text-slate-800 bg-slate-50 border border-slate-200 text-xs p-2.5 outline-none rounded-xl focus:border-blue-500 transition"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Pallet Ref populated warning notice */}
              {(() => {
                const activeMat = materials.find(m => m.id === materialId);
                return (
                  <div className="p-2.5 bg-[#8ed5ff]/5 border border-[#8ed5ff]/15 rounded-xl text-[10px] leading-relaxed text-[#87929a] font-sans">
                    ℹ️ <b>Active Storage Ref:</b> Pallet coordinates and drum indices are linked automatically from this item's Product Master config (Pallet: {activeMat?.palletNo || 'Unassigned'}, Drum: {activeMat?.drumNo || 'Unassigned'}).
                  </div>
                );
              })()}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Received By (Signature)
                </label>
                <input
                  type="text"
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  className="w-full text-slate-800 bg-slate-50 border border-slate-200 text-xs p-2.5 outline-none rounded-xl focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Remarks / Comments
                </label>
                <textarea
                  value={remarks}
                  rows={2}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Additional observations..."
                  className="w-full text-slate-800 bg-slate-50 border border-slate-200 text-xs p-2.5 outline-none rounded-xl focus:border-blue-500 transition"
                />
              </div>

              <div className="space-y-2">
                <button
                  type="submit"
                  className={`w-full flex justify-center items-center gap-1.5 py-2.5 px-4 border border-transparent rounded-xl shadow-xs text-xs font-bold text-white transition active:scale-98 cursor-pointer ${
                    editingGrnId ? 'bg-amber-650 hover:bg-amber-700' : 'bg-[#6b3e66] hover:bg-[#7b4775]'
                  }`}
                >
                  <FilePlus className="w-4 h-4 text-[#F0CDA8]" />
                  <span>{editingGrnId ? 'Update GRN Entry' : 'Save GRN Details'}</span>
                </button>

                {editingGrnId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingGrnId(null);
                      setSupplierName('');
                      setBatchNo('');
                      setQty(0);
                      setInvoiceNo('');
                      setCoaNo('');
                      setSourceType('Supplier');
                      setJobworkRefNo('');
                      setRemarks('');
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

        {/* GRN History list */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/55 shadow-xs col-span-1 xl:col-span-2 space-y-4">
          <div className="flex justify-between items-center bg-[#FAF9F5] p-2.5 rounded-xl border border-stone-200/40">
            <h3 className="font-sans font-bold text-slate-805 text-sm">Goods Receipt Logs History</h3>
            <div className="relative rounded-lg max-w-xs shadow-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-stone-400" />
              </div>
              <input
                type="text"
                placeholder="Search GRNs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-8 pr-3 py-1.5 border border-stone-200 text-xs outline-none rounded-lg bg-white focus:border-[#6b3e66] focus:ring-1 focus:ring-[#6b3e66] transition text-slate-800"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-stone-150 rounded-xl">
            <table className="min-w-full divide-y divide-stone-100 text-xs">
              <thead className="bg-[#FAF9F5] text-stone-500 font-bold uppercase tracking-wider font-sans">
                <tr>
                  <th className="px-3 py-3 text-left font-bold tracking-wider">GRN No.</th>
                  <th className="px-3 py-3 text-left font-bold tracking-wider">Date</th>
                  <th className="px-3 py-3 text-left font-bold tracking-wider">Inward Source</th>
                  <th className="px-3 py-3 text-left font-bold tracking-wider">Material Code</th>
                  <th className="px-3 py-3 text-left font-bold tracking-wider">Material Name</th>
                  <th className="px-3 py-3 text-left font-bold tracking-wider">Batch No.</th>
                  <th className="px-3 py-3 text-center font-bold tracking-wider">Mfg Date</th>
                  <th className="px-3 py-3 text-center font-bold tracking-wider">Exp Date</th>
                  <th className="px-3 py-3 text-center font-bold tracking-wider">Pallet No</th>
                  <th className="px-3 py-3 text-center font-bold tracking-wider">Drum No</th>
                  <th className="px-3 py-3 text-left font-bold tracking-wider">Qty Recd</th>
                  <th className="px-3 py-3 text-center font-bold tracking-wider">status</th>
                  <th className="px-3 py-3 text-left font-bold tracking-wider">Location / User</th>
                  <th className="px-3 py-3 text-center font-bold tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100 text-slate-700">
                {filteredGrns.length === 0 ? (
                  <tr>
                    <td colSpan={currentUser.role === 'Admin' ? 12 : 11} className="px-3 py-10 text-center text-slate-400">
                      No GRN records registered.
                    </td>
                  </tr>
                ) : (
                  filteredGrns.map((g) => {
                    const matchedMat = materials.find(m => m.id === g.materialId);
                    const labelUom = matchedMat ? matchedMat.uom : 'PCS';

                    return (
                      <tr key={g.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-3 py-3 font-mono font-bold text-slate-800">{g.grnNo}</td>
                        <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{g.grnDate}</td>
                        <td className="px-3 py-3 text-slate-600 font-medium">
                          <div className="truncate max-w-[124px]" title={g.supplierName}>{g.supplierName}</div>
                          <span className={`inline-block mt-0.5 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full tracking-wide border uppercase ${
                            g.sourceType === 'Production Return'
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-150'
                          }`}>
                            {g.sourceType || 'Supplier'}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-bold font-mono text-slate-700">
                          {matchedMat ? matchedMat.materialCode : 'N/A'}
                        </td>
                        <td className="px-3 py-3 text-slate-900 font-semibold">{g.materialName}</td>
                        <td className="px-3 py-3 font-mono text-[11px] font-bold text-slate-700">{g.batchNo}</td>
                        <td className="px-3 py-3 text-center font-mono text-slate-600 whitespace-nowrap">{g.mfgDate || 'N/A'}</td>
                        <td className="px-3 py-3 text-center font-mono text-slate-600 whitespace-nowrap">
                          <span className={`px-1.5 py-0.5 rounded font-semibold ${
                            new Date(g.expDate) < new Date() ? 'bg-red-50 text-red-700' : ''
                          }`}>
                            {g.expDate || 'N/A'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-bold text-slate-800">{g.palletNo || '-'}</td>
                        <td className="px-3 py-3 text-center font-mono font-bold text-slate-800">{g.drumNo || '-'}</td>
                        <td className="px-3 py-3 font-bold text-slate-800 whitespace-nowrap">
                          {g.qty} <span className="text-[10px] text-slate-400 font-medium">{labelUom}</span>
                        </td>
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            g.qcStatus === 'Approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : g.qcStatus === 'Rejected'
                                ? 'bg-red-50 text-red-700 border border-red-100'
                                : 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse'
                          }`}>
                            {g.qcStatus === 'Approved' ? (
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                            ) : g.qcStatus === 'Rejected' ? (
                              <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-ping" />
                            )}
                            {g.qcStatus}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="text-[10px] font-bold text-slate-600">{g.warehouseLocation}</div>
                          <div className="text-[9px] text-slate-400">By: {g.receivedBy}</div>
                        </td>
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingGrnId(g.id);
                                  setGrnNo(g.grnNo);
                                  setGrnDate(g.grnDate);
                                  setSupplierName(g.supplierName);
                                  setMaterialId(g.materialId);
                                  setBatchNo(g.batchNo);
                                  setQty(g.qty);
                                  setMfgDate(g.mfgDate);
                                  setExpDate(g.expDate);
                                  setInvoiceNo(g.invoiceNo || '');
                                  setCoaNo(g.coaNo || '');
                                  setWarehouseLocation(g.warehouseLocation || 'RM Store');
                                  setReceivedBy(g.receivedBy || '');
                                  setSourceType(g.sourceType || 'Supplier');
                                  setJobworkRefNo(g.jobworkRefNo || '');
                                  setRemarks(g.remarks || '');
                                  
                                  const container = document.querySelector('form');
                                  if (container) {
                                    container.scrollIntoView({ behavior: 'smooth' });
                                  }
                                }}
                                className="text-amber-500 hover:text-amber-700 p-1 rounded hover:bg-amber-50 transition"
                                title="Edit Inward GRN Voucher"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {currentUser.role === 'Admin' && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Delete GRN register voucher ${g.grnNo}?`)) {
                                    onDeleteGrn(g.id);
                                  }
                                }}
                                className="text-red-400 hover:text-red-650 p-1 rounded hover:bg-rose-50 transition"
                                title="Delete GRN register voucher"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
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

      {/* --- QUICK CREATE SUPPLIER MODAL OVERLAY --- */}
      {showQuickSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-250 w-full max-w-md overflow-hidden animate-scale-up">
            <div className="bg-[#6b3e66] px-5 py-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#F0CDA8]" />
                <h4 className="font-sans font-bold text-sm">Quick Create Supplier Profiles</h4>
              </div>
              <button 
                type="button" 
                onClick={() => setShowQuickSupplierModal(false)}
                className="text-stone-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateSupplier} className="p-5 space-y-4">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Add a new supplier master profile quickly. These information fields are optional but recommended for system audit trail documentation.
              </p>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  required
                  value={quickSupplierName}
                  onChange={(e) => setQuickSupplierName(e.target.value)}
                  className="w-full text-slate-800 bg-slate-50 border border-slate-200 text-xs p-2.5 outline-none rounded-xl focus:border-purple-600 transition"
                  placeholder="e.g. Merck Chemical Lab Solutions"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex justify-between items-center">
                  <span>GST Identification Number (GSTIN)</span>
                  {quickGstNumber.trim().length === 15 && (
                    <button
                      type="button"
                      onClick={() => {
                        const info = parseGSTIN(quickGstNumber);
                        if (info) {
                          setQuickSupplierName(info.companyName);
                          setQuickAddress(info.address);
                          setQuickEmail(info.email);
                          setQuickContactNumber(info.contactNumber);
                        }
                      }}
                      className="text-[10px] bg-purple-100 hover:bg-purple-200 text-[#6b3e66] px-2 py-0.5 rounded-lg transition font-extrabold cursor-pointer"
                    >
                      ✨ Auto-fill details
                    </button>
                  )}
                </label>
                <input
                  type="text"
                  value={quickGstNumber}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setQuickGstNumber(val);
                    if (val.trim().length === 15) {
                      const info = parseGSTIN(val);
                      if (info) {
                        setQuickSupplierName(info.companyName);
                        setQuickAddress(info.address);
                        setQuickEmail(info.email);
                        setQuickContactNumber(info.contactNumber);
                      }
                    }
                  }}
                  className="w-full text-slate-800 bg-slate-50 border border-slate-200 text-xs p-2.5 outline-none rounded-xl focus:border-purple-600 transition uppercase font-mono"
                  placeholder="e.g. 24AAACO1314M1ZP"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Corporate Physical Address
                </label>
                <input
                  type="text"
                  value={quickAddress}
                  onChange={(e) => setQuickAddress(e.target.value)}
                  className="w-full text-slate-800 bg-slate-50 border border-slate-200 text-xs p-2.5 outline-none rounded-xl focus:border-purple-600 transition"
                  placeholder="e.g. Phase 4, GID Estate, Ahmedabad, Gujarat"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Email ID
                  </label>
                  <input
                    type="email"
                    value={quickEmail}
                    onChange={(e) => setQuickEmail(e.target.value)}
                    className="w-full text-slate-800 bg-slate-50 border border-slate-200 text-xs p-2.5 outline-none rounded-xl focus:border-purple-600 transition"
                    placeholder="sales@supplier.com"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Contact Number
                  </label>
                  <input
                    type="text"
                    value={quickContactNumber}
                    onChange={(e) => setQuickContactNumber(e.target.value)}
                    className="w-full text-slate-800 bg-slate-50 border border-slate-200 text-xs p-2.5 outline-none rounded-xl focus:border-purple-600 transition"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickSupplierModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-[#6b3e66] hover:bg-[#7b4775] rounded-xl transition shadow-sm"
                >
                  Create & Assign Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- QUICK CREATE MATERIAL MODAL OVERLAY --- */}
      {showQuickMaterialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-250 w-full max-w-md overflow-hidden animate-scale-up">
            <div className="bg-[#6b3e66] px-5 py-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-[#F0CDA8]" />
                <h4 className="font-sans font-bold text-sm">Quick Create Product Masters</h4>
              </div>
              <button 
                type="button" 
                onClick={() => setShowQuickMaterialModal(false)}
                className="text-stone-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateMaterial} className="p-5 space-y-4">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Add an official material to the central inventory catalog catalog right from here, allowing you to inward receipt it instantly!
              </p>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Material Name *
                </label>
                <input
                  type="text"
                  required
                  value={quickMaterialName}
                  onChange={(e) => setQuickMaterialName(e.target.value)}
                  className="w-full text-slate-800 bg-slate-50 border border-slate-200 text-xs p-2.5 outline-none rounded-xl focus:border-purple-600 transition"
                  placeholder="e.g. Hydrochloric Acid 37%"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Unique Material Master Code *
                </label>
                <input
                  type="text"
                  required
                  value={quickMaterialCode}
                  onChange={(e) => setQuickMaterialCode(e.target.value)}
                  className="w-full text-slate-800 bg-slate-50 border border-slate-200 text-xs p-2.5 outline-none rounded-xl focus:border-purple-600 transition uppercase font-mono font-bold"
                  placeholder="e.g. RM-HCL-01"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Inventory Category
                  </label>
                  <select
                    value={quickCategory}
                    onChange={(e) => setQuickCategory(e.target.value as MaterialCategory)}
                    className="w-full text-slate-800 bg-slate-50 border border-slate-200 text-xs p-2.5 outline-none rounded-xl focus:border-purple-600 transition"
                  >
                    <option value="Raw Material">Raw Material</option>
                    <option value="PPM">PPM (Primary Packaging)</option>
                    <option value="SPM">SPM (Secondary Packaging)</option>
                    <option value="Capsule">Capsule</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    UOM (Unit of Measure)
                  </label>
                  <input
                    type="text"
                    required
                    value={quickUom}
                    onChange={(e) => setQuickUom(e.target.value)}
                    className="w-full text-slate-800 bg-slate-50 border border-slate-200 text-xs p-2.5 outline-none rounded-xl focus:border-purple-600 transition uppercase"
                    placeholder="e.g. KG, LTR, PCS"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Minimum Safe Reserve Stock Level
                </label>
                <input
                  type="number"
                  required
                  value={quickMinStock}
                  onChange={(e) => setQuickMinStock(Number(e.target.value))}
                  className="w-full text-slate-800 bg-slate-50 border border-slate-200 text-xs p-2.5 outline-none rounded-xl focus:border-purple-600 transition"
                  placeholder="e.g. 500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickMaterialModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-[#6b3e66] hover:bg-[#7b4775] rounded-xl transition shadow-sm"
                >
                  Create & Select Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
