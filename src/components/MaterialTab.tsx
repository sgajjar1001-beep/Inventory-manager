import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Material, MaterialCategory, User } from '../types';
import { Layers, Plus, Trash2, Search, ShieldAlert } from 'lucide-react';

interface MaterialTabProps {
  materials: Material[];
  onSaveMaterial: (material: Material) => void;
  onDeleteMaterial: (id: string) => void;
  currentUser: User;
}

export default function MaterialTab({ materials, onSaveMaterial, onDeleteMaterial, currentUser }: MaterialTabProps) {
  // Configured UOMs block
  const customUoms = localStorage.getItem('cfg_uoms') || 'KG, LITRE, PCS, BOX, BAG, MG, GM';
  const uomsArray = customUoms.split(',').map(u => u.trim().toUpperCase()).filter(Boolean);

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState<MaterialCategory>('Raw Material');
  const [uom, setUom] = useState(() => uomsArray[0] || 'KG');
  const [minStock, setMinStock] = useState<number>(100);
  const [palletNo, setPalletNo] = useState('');
  const [drumNo, setDrumNo] = useState('');
  
  // UX State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Validation & Save Handler
  const handleSave = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim() || !uom.trim() || !palletNo.trim() || !drumNo.trim()) {
      setErrorMsg('Please solve validation: Material Name, UOM, Pallet Number and Drum Number are required.');
      return;
    }

    // Auto-generate a beautiful, unique material code using prefix, clean name, and random ID
    let prefix = 'RM';
    if (category === 'PPM') prefix = 'PPM';
    else if (category === 'SPM') prefix = 'SPM';
    else if (category === 'Capsule') prefix = 'CAP';

    const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'MAT';
    const randNum = Math.floor(100 + Math.random() * 900);
    const generatedCode = `${prefix}-${cleanName}-${randNum}`;

    let finalCode = generatedCode;
    let attempts = 0;
    while (materials.some(m => m.materialCode === finalCode) && attempts < 15) {
      const suffix = Math.floor(100 + Math.random() * 900);
      finalCode = `${prefix}-${cleanName}-${suffix}`;
      attempts++;
    }

    const newMaterial: Material = {
      id: 'm_' + Date.now(),
      materialCode: finalCode,
      materialName: name.trim(),
      category,
      uom: uom.trim().toUpperCase(),
      minStock: Number(minStock) || 0,
      palletNo: palletNo.trim() || "",
      drumNo: drumNo.trim() || "",
      createdAt: new Date().toISOString()
    };

    onSaveMaterial(newMaterial);
    
    // Clear Form & Notify
    setName('');
    setMinStock(100);
    setPalletNo('');
    setDrumNo('');
    setSuccessMsg('Material Master record saved successfully!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Filter list
  const filteredMaterials = materials.filter(m => {
    const matchesSearch = 
      m.materialName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.materialCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCat = selectedCategory === 'All' || m.category === selectedCategory;

    return matchesSearch && matchesCat;
  });

  const canEdit = currentUser.role === 'Admin' || currentUser.role === 'GRN Operator';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-sans text-slate-800">Material Master Ledger</h2>
          <p className="text-xs text-slate-500 mt-1">
            Define raw stock chemicals, active substances, and product packing formats (PPM / SPM).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Save/Add Material Form Column */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/50 shadow-xs h-fit">
          <h3 className="font-sans font-bold text-[#1B1319] text-sm mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#6b3e66]" />
            <span>Add New Material Master</span>
          </h3>

          {!canEdit ? (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/50 text-[11px] text-amber-800 leading-relaxed">
              ⚠️ Your current profile (<b>{currentUser.role}</b>) does not permit registering new Material Master records. Only Admins or GRN Operators can add materials.
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              {errorMsg && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-xs flex items-center gap-1.5">
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
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">
                    Pallet Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 12"
                    value={palletNo}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPalletNo(e.target.value)}
                    className="w-full text-slate-800 bg-stone-50 border border-stone-200 placeholder-slate-400 focus:bg-white text-xs p-2.5 outline-none rounded-xl focus:border-[#6b3e66] focus:ring-1 focus:ring-[#6b3e66] transition font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">
                    Drum Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 11, 12, 13"
                    value={drumNo}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setDrumNo(e.target.value)}
                    className="w-full text-slate-800 bg-stone-50 border border-stone-200 placeholder-slate-400 focus:bg-white text-xs p-2.5 outline-none rounded-xl focus:border-[#6b3e66] focus:ring-1 focus:ring-[#6b3e66] transition font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">
                  Material Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sodium Bicarbonate Pure Granular"
                  value={name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  className="w-full text-slate-800 bg-stone-50 border border-stone-200 placeholder-slate-400 focus:bg-white text-xs p-2.5 outline-none rounded-xl focus:border-[#6b3e66] focus:ring-1 focus:ring-[#6b3e66] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setCategory(e.target.value as MaterialCategory)}
                  className="w-full text-slate-800 bg-stone-50 border border-stone-200 text-xs p-2.5 outline-none rounded-xl focus:border-[#6b3e66] focus:ring-1 focus:ring-[#6b3e66] transition"
                >
                  <option value="Raw Material">Raw Material</option>
                  <option value="PPM">Primary Packing Material (PPM)</option>
                  <option value="SPM">Secondary Packing Material (SPM)</option>
                  <option value="Capsule">Capsule</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">
                    UOM *
                  </label>
                  <select
                    value={uom}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setUom(e.target.value)}
                    className="w-full text-slate-800 bg-stone-50 border border-stone-200 text-xs p-2.5 outline-none rounded-xl focus:border-[#6b3e66] focus:ring-1 focus:ring-[#6b3e66] transition font-bold"
                  >
                    {uomsArray.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">
                    Min Stock Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="100"
                    value={minStock === 0 ? '' : minStock}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setMinStock(Number(e.target.value))}
                    className="w-full text-slate-800 bg-stone-50 border border-stone-200 placeholder-slate-400 focus:bg-white text-xs p-2.5 outline-none rounded-xl focus:border-[#6b3e66] focus:ring-1 focus:ring-[#6b3e66] transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex justify-center items-center gap-1.5 py-2.5 px-4 border border-transparent rounded-xl shadow-xs text-xs font-bold text-white bg-[#6b3e66] hover:bg-[#7b4775] active:scale-98 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#F0CDA8]" /> Save Material Master
              </button>
            </form>
          )}
        </div>

        {/* Listing Materials Columns */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/55 shadow-xs col-span-2 space-y-4">
          
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="relative rounded-xl w-full sm:max-w-xs shadow-xs">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-stone-400" />
              </div>
              <input
                type="text"
                placeholder="Search code or name..."
                value={searchTerm}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 border border-stone-200 text-xs bg-stone-50 focus:bg-white focus:border-[#6b3e66] focus:ring-1 focus:ring-[#6b3e66] outline-none rounded-xl transition text-slate-800"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedCategory(e.target.value)}
                className="border border-stone-200 text-xs px-3 py-2 outline-none rounded-xl bg-stone-50 focus:bg-white focus:border-[#6b3e66] text-slate-700 font-medium transition"
              >
                <option value="All">All Categories</option>
                <option value="Raw Material">Raw Materials Link</option>
                <option value="PPM">PPM Only</option>
                <option value="SPM">SPM Only</option>
                <option value="Capsule">Capsule Only</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-stone-150 rounded-xl">
            <table className="min-w-full divide-y divide-stone-100 text-xs">
              <thead className="bg-[#FAF9F5] text-stone-500">
                <tr>
                  <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Item ID</th>
                  <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Code</th>
                  <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Material Name</th>
                  <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Category</th>
                  <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]">UOM</th>
                  <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Min Stock</th>
                  <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Storage Ref (Pallet/Drum)</th>
                  {currentUser.role === 'Admin' && (
                    <th className="px-4 py-3 text-center font-bold uppercase tracking-wider text-[10px]">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-stone-100 text-[#1B1319]">
                {filteredMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={currentUser.role === 'Admin' ? 7 : 6} className="px-4 py-10 text-center text-stone-400">
                      No material masters found matching query.
                    </td>
                  </tr>
                ) : (
                  filteredMaterials.map((m) => (
                    <tr key={m.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-4 py-3.5 font-mono text-[10px] text-stone-400">{m.id}</td>
                      <td className="px-4 py-3.5 font-mono font-bold text-[#6b3e66]">{m.materialCode}</td>
                      <td className="px-4 py-3.5 text-slate-900 font-semibold">{m.materialName}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          m.category === 'Raw Material' 
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
                            : m.category === 'PPM' 
                              ? 'bg-teal-50 text-teal-700 border border-teal-100' 
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {m.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-500">{m.uom}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800">{m.minStock}</td>
                      <td className="px-4 py-3.5 text-xs">
                        {m.palletNo ? (
                          <span className="inline-flex flex-wrap gap-1 items-center">
                            <span className="bg-blue-500/10 text-blue-700 px-1.5 py-0.5 rounded font-mono text-[9px] font-bold">Pallet {m.palletNo}</span>
                            {m.drumNo && <span className="bg-amber-500/10 text-amber-700 px-1.5 py-0.5 rounded font-mono text-[9px] font-bold">Drum {m.drumNo}</span>}
                          </span>
                        ) : (
                          <span className="text-stone-400 italic text-[11px]">Unassigned</span>
                        )}
                      </td>
                      {currentUser.role === 'Admin' && (
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => {
                              if(confirm(`Are you sure you want to delete material master ${m.materialName}?`)) {
                                onDeleteMaterial(m.id);
                              }
                            }}
                            className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition"
                            title="Delete Material Master"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
