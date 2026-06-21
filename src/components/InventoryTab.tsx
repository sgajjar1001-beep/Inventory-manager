import React, { useState } from 'react';
import { Grn, Material, User, Outward, QcStatus } from '../types';
import { 
  ClipboardCheck, 
  Search, 
  ShieldAlert, 
  CheckCircle2, 
  TrendingDown, 
  Hourglass, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  ChevronDown, 
  Check, 
  SlidersHorizontal,
  Layers,
  Inbox,
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
  Percent,
  Clock,
  FileDown
} from 'lucide-react';

interface InventoryTabProps {
  grns: Grn[];
  materials: Material[];
  outwards: Outward[];
  currentUser: User;
  onSaveGrn?: (grn: Grn) => Promise<void>;
  theme?: 'light' | 'dark';
}

interface VisibleColumns {
  location: boolean;
  code: boolean;
  name: boolean;
  batch: boolean;
  pallet: boolean;
  drum: boolean;
  inward: boolean;
  issued: boolean;
  stock: boolean;
  mfg: boolean;
  exp: boolean;
  daysLeft: boolean;
  qcStatus: boolean;
  releaseDate: boolean;
}

type SortColumn = 
  | 'location' 
  | 'code' 
  | 'name' 
  | 'batch' 
  | 'pallet' 
  | 'drum' 
  | 'inward' 
  | 'issued' 
  | 'stock' 
  | 'mfg' 
  | 'exp' 
  | 'daysLeft' 
  | 'qcStatus' 
  | 'releaseDate';

type SortDirection = 'asc' | 'desc';

export default function InventoryTab({ grns, materials, outwards, currentUser, onSaveGrn, theme = 'dark' }: InventoryTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('All');
  const [qcStatusFilter, setQcStatusFilter] = useState('All');
  const [inventoryFilterTab, setInventoryFilterTab] = useState<'All' | 'Warehouse' | 'Jobwork' | 'LowStock' | 'NearExpiry'>('All');
  const showLowStockOnly = inventoryFilterTab === 'LowStock';
  const showNearExpiryOnly = inventoryFilterTab === 'NearExpiry';
  const subTab = (inventoryFilterTab === 'Jobwork') ? 'Jobwork' : 'Warehouse';
  const showWarehouse = inventoryFilterTab === 'All' || inventoryFilterTab === 'Warehouse' || inventoryFilterTab === 'LowStock' || inventoryFilterTab === 'NearExpiry';
  const showJobwork = inventoryFilterTab === 'All' || inventoryFilterTab === 'Jobwork';

  const [showDropdown, setShowDropdown] = useState(false);
  const [showAlarmsPanel, setShowAlarmsPanel] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success?: string; error?: string } | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<{ grn: Grn; materialName: string; materialCode: string; uom: string }[]>([]);

  // Column choices checklist state
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>({
    location: true,
    code: true,
    name: true,
    batch: true,
    pallet: true,
    drum: true,
    inward: true,
    issued: true,
    stock: true,
    mfg: true,
    exp: true,
    daysLeft: true,
    qcStatus: true,
    releaseDate: false // default off to prevent clutter, toggleable inside drop-down
  });

  // Sorting columns state
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const matchedMaterials = searchTerm.trim()
    ? materials.filter(m =>
        m.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.materialCode.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  // Master ordered column state (columns order can be adjusted dynamically)
  const [columnOrder, setColumnOrder] = useState<(keyof VisibleColumns)[]>(() => {
    const saved = localStorage.getItem('inv_column_order');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [
      'location',
      'code',
      'name',
      'batch',
      'pallet',
      'drum',
      'inward',
      'issued',
      'stock',
      'mfg',
      'exp',
      'daysLeft',
      'qcStatus',
      'releaseDate'
    ];
  });

  const columnLabels: Record<keyof VisibleColumns, string> = {
    location: 'Storage Sector',
    code: 'Material Code',
    name: 'Material Name',
    batch: 'Batch Number',
    pallet: 'Pallet Number',
    drum: 'Drum Number(s)',
    inward: 'Inward Qty',
    issued: 'Issued Qty',
    stock: 'Current Stock',
    mfg: 'Mfg Date',
    exp: 'Exp Date',
    daysLeft: 'Expiration Status',
    qcStatus: 'QC Status',
    releaseDate: 'QC Release Date'
  };

  const moveColumn = (key: keyof VisibleColumns, direction: 'up' | 'down') => {
    setColumnOrder(prev => {
      const customizableOnly = prev.filter(k => k !== 'code');
      const idx = customizableOnly.indexOf(key);
      if (idx === -1) return prev;

      let nextIdx = idx;
      if (direction === 'up' && idx > 0) {
        nextIdx = idx - 1;
      } else if (direction === 'down' && idx < customizableOnly.length - 1) {
        nextIdx = idx + 1;
      } else {
        return prev;
      }

      const updatedCustom = [...customizableOnly];
      const temp = updatedCustom[idx];
      updatedCustom[idx] = updatedCustom[nextIdx];
      updatedCustom[nextIdx] = temp;

      // Re-insert 'code' at its current index
      const originalCodeIndex = prev.indexOf('code');
      const finOrder: (keyof VisibleColumns)[] = [];
      let customCounter = 0;
      for (let i = 0; i < prev.length; i++) {
        if (i === originalCodeIndex) {
          finOrder.push('code');
        } else {
          finOrder.push(updatedCustom[customCounter++]);
        }
      }
      
      localStorage.setItem('inv_column_order', JSON.stringify(finOrder));
      return finOrder;
    });
  };

  const toggleColumn = (key: keyof VisibleColumns) => {
    setVisibleColumns(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const renderHeaderCell = (key: keyof VisibleColumns) => {
    switch (key) {
      case 'location':
        return (
          <th 
            key="location"
            onClick={() => handleSort('location')} 
            className="px-4 py-3.5 text-left cursor-pointer hover:bg-white/5 transition whitespace-nowrap"
          >
            <span>Sector</span> {renderSortIndicator('location')}
          </th>
        );
      case 'code':
        return (
          <th 
            key="code"
            onClick={() => handleSort('code')} 
            className="px-3 py-3.5 text-left cursor-pointer hover:bg-white/5 transition whitespace-nowrap"
          >
            <span>Mat Code</span> {renderSortIndicator('code')}
          </th>
        );
      case 'name':
        return (
          <th 
            key="name"
            onClick={() => handleSort('name')} 
            className="px-4 py-3.5 text-left cursor-pointer hover:bg-white/5 transition"
          >
            <span>Material Name</span> {renderSortIndicator('name')}
          </th>
        );
      case 'batch':
        return (
          <th 
            key="batch"
            onClick={() => handleSort('batch')} 
            className="px-4 py-3.5 text-center cursor-pointer hover:bg-white/5 transition whitespace-nowrap"
          >
            <span>Batch No</span> {renderSortIndicator('batch')}
          </th>
        );
      case 'pallet':
        return (
          <th 
            key="pallet"
            onClick={() => handleSort('pallet')} 
            className="px-3 py-3.5 text-center cursor-pointer hover:bg-white/5 transition text-amber-500 whitespace-nowrap"
          >
            <span>Pallet #</span> {renderSortIndicator('pallet')}
          </th>
        );
      case 'drum':
        return (
          <th 
            key="drum"
            onClick={() => handleSort('drum')} 
            className="px-3 py-3.5 text-center cursor-pointer hover:bg-white/5 transition text-amber-500 whitespace-nowrap"
          >
            <span>Drum No(s)</span> {renderSortIndicator('drum')}
          </th>
        );
      case 'inward':
        return (
          <th 
            key="inward"
            onClick={() => handleSort('inward')} 
            className="px-3 py-3.5 text-center cursor-pointer hover:bg-white/5 transition font-semibold whitespace-nowrap"
          >
            <span>Inward</span> {renderSortIndicator('inward')}
          </th>
        );
      case 'issued':
        return (
          <th 
            key="issued"
            onClick={() => handleSort('issued')} 
            className="px-3 py-3.5 text-center cursor-pointer hover:bg-white/5 transition text-rose-300 whitespace-nowrap"
          >
            <span>Issued</span> {renderSortIndicator('issued')}
          </th>
        );
      case 'stock':
        return (
          <th 
            key="stock"
            onClick={() => handleSort('stock')} 
            className={`px-4 py-3.5 text-right cursor-pointer hover:bg-white/5 transition font-bold whitespace-nowrap ${
              theme === 'light' ? 'text-blue-700 font-extrabold' : 'text-sky-400'
            }`}
          >
            <span>Current Stock</span> {renderSortIndicator('stock')}
          </th>
        );
      case 'mfg':
        return (
          <th 
            key="mfg"
            onClick={() => handleSort('mfg')} 
            className="px-3 py-3.5 text-center cursor-pointer hover:bg-white/5 transition whitespace-nowrap"
          >
            <span>MFG Date</span> {renderSortIndicator('mfg')}
          </th>
        );
      case 'exp':
        return (
          <th 
            key="exp"
            onClick={() => handleSort('exp')} 
            className="px-3 py-3.5 text-center cursor-pointer hover:bg-white/5 transition whitespace-nowrap"
          >
            <span>EXP Date</span> {renderSortIndicator('exp')}
          </th>
        );
      case 'daysLeft':
        return (
          <th 
            key="daysLeft"
            onClick={() => handleSort('daysLeft')} 
            className="px-4 py-3.5 text-center cursor-pointer hover:bg-white/5 transition text-[#ffb9d8] whitespace-nowrap"
          >
            <span>Time left to Expire</span> {renderSortIndicator('daysLeft')}
          </th>
        );
      case 'qcStatus':
        return (
          <th 
            key="qcStatus"
            onClick={() => handleSort('qcStatus')} 
            className="px-4 py-3.5 text-center cursor-pointer hover:bg-white/5 transition whitespace-nowrap"
          >
            <span>QC Status</span> {renderSortIndicator('qcStatus')}
          </th>
        );
      case 'releaseDate':
        return (
          <th 
            key="releaseDate"
            onClick={() => handleSort('releaseDate')} 
            className="px-4 py-3.5 text-center cursor-pointer hover:bg-white/5 transition whitespace-nowrap"
          >
            <span>Release/Inward Date</span> {renderSortIndicator('releaseDate')}
          </th>
        );
      default:
        return null;
    }
  };

  const renderBodyCell = (key: keyof VisibleColumns, row: any) => {
    const uomLabel = row.material?.uom || 'KG';
    switch (key) {
      case 'location':
        return (
          <td key="location" className="px-4 py-3 whitespace-nowrap font-sans text-left">
            <span className={`font-mono font-bold text-[10px] px-2 py-0.5 rounded uppercase border ${
              theme === 'light'
                ? 'bg-slate-100 text-slate-700 border-slate-200/80'
                : 'bg-white/10 text-white/90 border-white/5'
            }`}>
              {row.warehouseLocation || 'RM Store'}
            </span>
          </td>
        );
      case 'code':
        return (
          <td key="code" className={`px-3 py-3 font-mono text-[10px] font-bold whitespace-nowrap text-left ${
            theme === 'light' ? 'text-blue-700' : 'text-[#8ed5ff]'
          }`}>
            {row.material?.materialCode || 'N/A'}
          </td>
        );
      case 'name':
        return (
          <td key="name" className={`px-4 py-3 font-semibold truncate max-w-[220px] text-left ${
            theme === 'light' ? 'text-slate-900' : 'text-white'
          }`}>
            {row.materialName}
          </td>
        );
      case 'batch':
        return (
          <td key="batch" className={`px-4 py-3 text-center font-mono text-[11px] font-extrabold whitespace-nowrap ${
            theme === 'light' ? 'text-slate-800' : 'text-white'
          }`}>
            {row.batchNo}
          </td>
        );
      case 'pallet':
        return (
          <td key="pallet" className="px-3 py-3 text-center whitespace-nowrap">
            {row.palletNo ? (
              <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] border ${
                theme === 'light'
                  ? 'bg-amber-500/10 border-amber-500/20 text-indigo-900 font-extrabold'
                  : 'bg-amber-400/10 border-amber-400/20 text-amber-300'
              }`}>
                Pallet {row.palletNo}
              </span>
            ) : (
              <span className="text-stone-500 font-mono italic">-</span>
            )}
          </td>
        );
      case 'drum':
        return (
          <td key="drum" className="px-3 py-3 text-center whitespace-nowrap">
            {row.drumNo ? (
              <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] border ${
                theme === 'light'
                  ? 'bg-blue-500/10 border-blue-500/20 text-blue-900 font-extrabold'
                  : 'bg-[#bdc2ff]/10 border border-[#bdc2ff]/20 text-[#8ed5ff]'
              }`}>
                Drum {row.drumNo}
              </span>
            ) : (
              <span className="text-stone-505 font-mono italic">-</span>
            )}
          </td>
        );
      case 'inward':
        return (
          <td key="inward" className="px-3 py-3 text-center font-mono font-semibold text-slate-450 whitespace-nowrap">
            {row.inwardQty} <span className="text-[9px] font-normal">{uomLabel}</span>
          </td>
        );
      case 'issued':
        return (
          <td key="issued" className="px-3 py-3 text-center font-mono font-bold text-rose-500 whitespace-nowrap">
            {row.issuedQty > 0 ? `-${row.issuedQty}` : '0'}{' '}
            <span className="text-[9px] font-normal text-slate-500">{uomLabel}</span>
          </td>
        );
      case 'stock':
        return (
          <td key="stock" className={`px-4 py-3 text-right font-black font-mono text-xs whitespace-nowrap ${
            theme === 'light' ? 'text-blue-650' : 'text-sky-400'
          }`}>
            {row.currentStock}{' '}
            <span className={`text-[10px] font-normal ${theme === 'light' ? 'text-slate-500' : 'text-[#87929a]'}`}>{uomLabel}</span>
          </td>
        );
      case 'mfg':
        return (
          <td key="mfg" className={`px-3 py-3 text-center font-mono whitespace-nowrap ${
            theme === 'light' ? 'text-slate-500' : 'text-[#87929a]'
          }`}>
            {row.mfgDate ? row.mfgDate.split('-').reverse().join('-') : 'N/A'}
          </td>
        );
      case 'exp':
        return (
          <td key="exp" className={`px-3 py-3 text-center font-mono font-bold whitespace-nowrap ${
            theme === 'light' ? 'text-slate-900' : 'text-white/90'
          }`}>
            {row.expDate ? row.expDate.split('-').reverse().join('-') : 'N/A'}
          </td>
        );
      case 'daysLeft':
        return (
          <td key="daysLeft" className="px-4 py-3 text-center whitespace-nowrap">
            <span className={`inline-block text-[11px] ${row.expiryStats.class}`}>
              {row.expiryStats.text}{' '}
              <span className="text-[9px] font-mono opacity-85 pl-1">
                {row.expiryStats.monthsText}
              </span>
            </span>
          </td>
        );
      case 'qcStatus':
        return (
          <td key="qcStatus" className="px-4 py-3 text-center whitespace-nowrap">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
              row.qcStatus === 'Approved'
                ? theme === 'light'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : row.qcStatus === 'Rejected'
                  ? theme === 'light'
                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : theme === 'light'
                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {row.qcStatus === 'Approved' ? (
                <ShieldCheck className={`w-3 h-3 shrink-0 ${theme === 'light' ? 'text-emerald-750' : 'text-emerald-400'}`} />
              ) : row.qcStatus === 'Rejected' ? (
                <ShieldAlert className={`w-3 h-3 shrink-0 ${theme === 'light' ? 'text-rose-750' : 'text-rose-400'}`} />
              ) : (
                <HelpCircle className={`w-3 h-3 shrink-0 ${theme === 'light' ? 'text-amber-650' : 'text-amber-400'}`} />
              )}
              {row.qcStatus}
            </span>
          </td>
        );
      case 'releaseDate':
        return (
          <td key="releaseDate" className={`px-4 py-3 text-center font-mono whitespace-nowrap ${
            theme === 'light' ? 'text-slate-500' : 'text-[#87929a]'
          }`}>
            {row.qcReleaseDate || row.grnDate}
          </td>
        );
      default:
        return null;
    }
  };

  // Expiration Days & Months precise calculator
  const getExpirationStats = (expString: string) => {
    if (!expString) return { text: 'N/A', class: 'text-slate-500', isExpired: false, days: -9999, monthsText: '' };
    const today = new Date();
    today.setHours(0,0,0,0);
    const exp = new Date(expString);
    exp.setHours(0,0,0,0);

    const diffMs = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const positiveDaysAgo = Math.abs(diffDays);
      const monthsAgo = (positiveDaysAgo / 30).toFixed(1);
      return { 
        text: `EXPIRED (${positiveDaysAgo}d ago)`, 
        class: 'text-rose-450 font-black tracking-tight', 
        isExpired: true, 
        days: diffDays,
        monthsText: `${monthsAgo} Months Ago`
      };
    } else if (diffDays === 0) {
      return { 
        text: 'EXPIRES TODAY', 
        class: 'text-amber-500 font-bold animate-pulse', 
        isExpired: false, 
        days: 0,
        monthsText: '0 M left'
      };
    } else {
      const monthsLeft = (diffDays / 30).toFixed(1);
      let textClass = 'text-[#8ed5ff] font-medium';
      if (diffDays <= 30) {
        textClass = 'text-red-400 font-bold';
      } else if (diffDays <= 90) {
        textClass = 'text-amber-400 font-semibold';
      }
      return { 
        text: `${diffDays} Days`, 
        class: textClass, 
        isExpired: false, 
        days: diffDays, 
        monthsText: `(${monthsLeft} Months) left` 
      };
    }
  };

  // Keep track of low stock alarm thresholds (uses only APPROVED stocks)
  const materialStocks = materials.map(m => {
    // Only count Approved batches in safe inventory
    const approvedInventory = grns.filter(g => g.qcStatus === 'Approved' && g.materialId === m.id);

    const totalInwardApproved = approvedInventory
      .reduce((sum, current) => sum + current.qty, 0);

    const totalIssued = outwards
      .filter(o => o.materialId === m.id)
      .reduce((sum, current) => sum + current.qty, 0);

    const totalQty = Math.max(0, totalInwardApproved - totalIssued);
    const isBelowMin = totalQty < m.minStock;

    return {
      material: m,
      totalQty,
      isBelowMin
    };
  });

  // Calculate row stocks for ALL grns (Approved + Pending + Rejected)
  const computedRows = grns.map(item => {
    const matchedMat = materials.find(m => m.id === item.materialId);
    
    // Compute outwards issued for this specific batch No.
    const batchOutwards = outwards
      .filter(o => o.materialId === item.materialId && o.batchNo === item.batchNo)
      .reduce((s, curr) => s + curr.qty, 0);

    const currentStock = Math.max(0, item.qty - batchOutwards);
    const expiryStats = getExpirationStats(item.expDate);

    return {
      ...item,
      material: matchedMat,
      inwardQty: item.qty,
      issuedQty: batchOutwards,
      currentStock,
      expiryStats
    };
  });

  // Search, Location Filter, and QC Status filter
  const filteredRows = computedRows.filter(row => {
    // Search matching multiple criteria
    const matchesSearch = 
      row.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (row.material && row.material.materialCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      row.batchNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (row.palletNo && row.palletNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (row.drumNo && row.drumNo.toLowerCase().includes(searchTerm.toLowerCase()));

    // Location sector filter 
    const matchesLoc = locationFilter === 'All' || row.warehouseLocation === locationFilter;

    // QC Status filter
    const matchesQc = qcStatusFilter === 'All' || row.qcStatus === qcStatusFilter;

    // Show Low Stock only restrictions
    if (showLowStockOnly) {
      const matStock = materialStocks.find(ms => ms.material.id === row.materialId);
      if (!(matStock?.isBelowMin || false)) return false;
    }

    // Show Near Expiry only restrictions
    if (showNearExpiryOnly) {
      if (row.expiryStats.days < 0 || row.expiryStats.days > 90) return false;
    }

    return matchesSearch && matchesLoc && matchesQc;
  });

  // Sorting algorithm based on active SortColumn
  const sortedRows = [...filteredRows].sort((a, b) => {
    let valA: any = '';
    let valB: any = '';

    switch (sortColumn) {
      case 'location':
        valA = a.warehouseLocation || '';
        valB = b.warehouseLocation || '';
        break;
      case 'code':
        valA = a.material?.materialCode || '';
        valB = b.material?.materialCode || '';
        break;
      case 'name':
        valA = a.materialName || '';
        valB = b.materialName || '';
        break;
      case 'batch':
        valA = a.batchNo || '';
        valB = b.batchNo || '';
        break;
      case 'pallet':
        valA = Number(a.palletNo) || a.palletNo || '';
        valB = Number(b.palletNo) || b.palletNo || '';
        break;
      case 'drum':
        valA = a.drumNo || '';
        valB = b.drumNo || '';
        break;
      case 'inward':
        valA = a.inwardQty;
        valB = b.inwardQty;
        break;
      case 'issued':
        valA = a.issuedQty;
        valB = b.issuedQty;
        break;
      case 'stock':
        valA = a.currentStock;
        valB = b.currentStock;
        break;
      case 'mfg':
        valA = a.mfgDate ? new Date(a.mfgDate).getTime() : 0;
        valB = b.mfgDate ? new Date(b.mfgDate).getTime() : 0;
        break;
      case 'exp':
        valA = a.expDate ? new Date(a.expDate).getTime() : 0;
        valB = b.expDate ? new Date(b.expDate).getTime() : 0;
        break;
      case 'daysLeft':
        valA = a.expiryStats.days;
        valB = b.expiryStats.days;
        break;
      case 'qcStatus':
        valA = a.qcStatus;
        valB = b.qcStatus;
        break;
      case 'releaseDate':
        valA = a.qcReleaseDate || a.grnDate || '';
        valB = b.qcReleaseDate || b.grnDate || '';
        break;
    }

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortDirection === 'asc' 
        ? valA.localeCompare(valB) 
        : valB.localeCompare(valA);
    } else {
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    }
  });

  // Calculate jobwork tracker rows
  const jobworkRows = outwards
    .filter(o => o.department === 'Jobwork / Gamma')
    .map(o => {
      const matchedMat = materials.find(m => m.id === o.materialId);
      
      // Find returned quantities (sourceType === 'Jobwork Return' on same batch and material from same vendor)
      const returnedQty = grns
        .filter(g => g.sourceType === 'Jobwork Return' && g.supplierName === o.jobworkVendorName && g.batchNo === o.batchNo && g.materialId === o.materialId)
        .reduce((sum, g) => sum + g.qty, 0);

      const outsideBalance = Math.max(0, o.qty - returnedQty);

      return {
        id: o.id,
        materialCode: matchedMat?.materialCode || 'N/A',
        materialName: matchedMat?.materialName || o.materialName || 'N/A',
        batchNo: o.batchNo,
        vendor: o.jobworkVendorName || 'Unknown Vendor',
        docNo: o.jobworkDocNo || 'N/A',
        packing: `${o.jobworkPackingQty || 0} x ${o.jobworkPackingType || 'box/bag'}`,
        dispatchedQty: o.qty,
        returnedQty,
        outsideBalance,
        uom: matchedMat?.uom || 'KG',
        date: o.outwardDate
      };
    });

  // CSV Report Exporter
  const handleExportCSV = () => {
    let headers: string[] = [];
    let csvContent = "";

    if (subTab === 'Warehouse') {
      headers = ["Sector", "Material Code", "Material Name", "Batch Number", "Pallet", "Drum", "Inward Qty", "Issued Qty", "Current Stock", "Mfg Date", "Exp Date", "QC Status"];
      const rows = sortedRows.map(r => [
        r.warehouseLocation || '',
        r.material?.materialCode || '',
        r.materialName || '',
        r.batchNo || '',
        r.palletNo || '',
        r.drumNo || '',
        r.inwardQty,
        r.issuedQty,
        r.currentStock,
        r.mfgDate,
        r.expDate,
        r.qcStatus
      ]);
      csvContent = [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    } else {
      headers = ["Date Dispatched", "Vendor Name", "Material Code", "Material Name", "Batch No", "Challan Doc No", "Packing Details", "Dispatched Qty", "Returned Qty", "Outside Stock Balance"];
      const rows = jobworkRows.map(r => [
        r.date,
        r.vendor,
        r.materialCode,
        r.materialName,
        r.batchNo,
        r.docNo,
        r.packing,
        r.dispatchedQty,
        r.returnedQty,
        r.outsideBalance
      ]);
      csvContent = [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Inventory_Master_Report_${subTab}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    if (subTab === 'Warehouse') {
      headers = ["Sector", "Material Code", "Material Name", "Batch Number", "Pallet", "Drum", "Inward Qty", "Issued Qty", "Current Stock", "Mfg Date", "Exp Date", "QC Status"];
      rows = sortedRows.map(r => [
        r.warehouseLocation || '',
        r.material?.materialCode || '',
        r.materialName || '',
        r.batchNo || '',
        r.palletNo || '',
        r.drumNo || '',
        r.inwardQty,
        r.issuedQty,
        r.currentStock,
        r.mfgDate,
        r.expDate,
        r.qcStatus
      ]);
    } else {
      headers = ["Date Dispatched", "Vendor Name", "Material Code", "Material Name", "Batch No", "Challan Doc No", "Packing Details", "Dispatched Qty", "Returned Qty", "Outside Stock Balance"];
      rows = jobworkRows.map(r => [
        r.date,
        r.vendor,
        r.materialCode,
        r.materialName,
        r.batchNo,
        r.docNo,
        r.packing,
        r.dispatchedQty,
        r.returnedQty,
        r.outsideBalance
      ]);
    }
    const headerLine = headers.join("\t");
    const dataRows = rows.map(r => r.join("\t")).join("\n");
    const excelContent = headerLine + "\n" + dataRows;
    const blob = new Blob(["\uFEFF" + excelContent], { type: 'application/vnd.ms-excel;charset=utf-16;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Inventory_Master_Report_${subTab}_${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleDownloadSampleFormat = () => {
    const headers = ["Sector", "Material Code", "Material Name", "Batch Number", "Pallet", "Drum", "Quantity", "Mfg Date", "Exp Date", "QC Status"];
    const sampleRows = [
      ["Sector A", "PPM001", "HDPE Drums Outer Packing", "B-2026-01", "Pallet 10", "Drum 01", "150", "2026-01-10", "2029-01-10", "Approved"],
      ["Sector B", "RM001", "Active Liquid Solvent", "B-2026-02", "Pallet 12", "Drum 03", "300", "2026-02-15", "2028-02-15", "Approved"],
    ];
    const csvContent = [headers.join(","), ...sampleRows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Inventory_Import_Sample_Format.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setImportStatus({ error: "Selected file is empty or corrupted." });
          return;
        }

        const lines: string[][] = [];
        const rawLines = text.split(/\r?\n/);
        for (const rawLine of rawLines) {
          if (!rawLine.trim()) continue;
          
          const row: string[] = [];
          let inQuotes = false;
          let currentField = '';
          for (let i = 0; i < rawLine.length; i++) {
            const char = rawLine[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              row.push(currentField.trim());
              currentField = '';
            } else {
              currentField += char;
            }
          }
          row.push(currentField.trim());
          lines.push(row);
        }

        if (lines.length < 2) {
          setImportStatus({ error: "File must contain a header and at least one stock row." });
          return;
        }

        const headers = lines[0].map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
        
        const idxSector = headers.findIndex(h => h.includes('sector') || h.includes('location'));
        const idxMatCode = headers.findIndex(h => h.includes('code') || h.includes('matcode'));
        const idxMatName = headers.findIndex(h => h.includes('name') || h.includes('matname') || h.includes('material'));
        const idxBatch = headers.findIndex(h => h.includes('batch'));
        const idxPallet = headers.findIndex(h => h.includes('pallet'));
        const idxDrum = headers.findIndex(h => h.includes('drum'));
        const idxQty = headers.findIndex(h => h.includes('qty') || h.includes('quantity') || h.includes('stock') || h.includes('current'));
        const idxMfg = headers.findIndex(h => h.includes('mfg') || h.includes('manufacturing'));
        const idxExp = headers.findIndex(h => h.includes('exp') || h.includes('expiry') || h.includes('expiration'));
        const idxQc = headers.findIndex(h => h.includes('qc') || h.includes('status'));

        const parsedRecords: any[] = [];
        let skippedCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i];
          if (row.length === 0 || (row.length === 1 && !row[0])) continue;

          const getVal = (idx: number, def = '') => (idx !== -1 && row[idx] !== undefined) ? row[idx].replace(/^"|"$/g, '').trim() : def;

          const rawCode = getVal(idxMatCode);
          const rawName = getVal(idxMatName);
          const rawQtyVal = getVal(idxQty);
          const rawMfg = getVal(idxMfg);
          const rawExp = getVal(idxExp);
          const rawLocation = getVal(idxSector, 'RM Store');
          const rawBatch = getVal(idxBatch, `B-${new Date().toISOString().split('T')[0]}`);
          const rawPallet = getVal(idxPallet, '');
          const rawDrum = getVal(idxDrum, '');
          const rawQc = getVal(idxQc, 'Approved') as QcStatus;

          let matchedMaterial = materials.find(m => 
            (rawCode && m.materialCode.toLowerCase() === rawCode.toLowerCase()) ||
            (rawName && m.materialName.toLowerCase() === rawName.toLowerCase())
          );

          if (!matchedMaterial && materials.length > 0) {
            matchedMaterial = materials.find(m => rawName && m.materialName.toLowerCase().includes(rawName.toLowerCase()));
            if (!matchedMaterial) {
              matchedMaterial = materials[0];
            }
          }

          if (!matchedMaterial) {
            skippedCount++;
            continue;
          }

          const parsedQty = parseFloat(rawQtyVal);
          if (isNaN(parsedQty) || parsedQty <= 0) {
            skippedCount++;
            continue;
          }

          const resolvedMfg = rawMfg || new Date().toISOString().split('T')[0];
          let resolvedExp = rawExp;
          if (!resolvedExp) {
            const mfgD = new Date(resolvedMfg);
            mfgD.setFullYear(mfgD.getFullYear() + 2);
            resolvedExp = mfgD.toISOString().split('T')[0];
          }

          const uid = 'import-' + Math.random().toString(36).substring(2, 11).toUpperCase();
          const grnRecord: Grn = {
            id: uid,
            grnNo: `IMP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            grnDate: new Date().toISOString().split('T')[0],
            supplierName: 'Imported Inventory',
            materialId: matchedMaterial.id,
            materialName: matchedMaterial.materialName,
            batchNo: rawBatch,
            qty: parsedQty,
            mfgDate: resolvedMfg,
            expDate: resolvedExp,
            warehouseLocation: rawLocation,
            palletNo: rawPallet || undefined,
            drumNo: rawDrum || undefined,
            qcStatus: (['Pending', 'Approved', 'Rejected'].includes(rawQc) ? rawQc : 'Approved') as QcStatus,
            createdOn: new Date().toISOString()
          };

          parsedRecords.push({
            grn: grnRecord,
            materialName: matchedMaterial.materialName,
            materialCode: matchedMaterial.materialCode,
            uom: matchedMaterial.uom
          });
        }

        if (parsedRecords.length === 0) {
          setImportStatus({ error: "Could not parse any valid inventory records. Verify column formatting." });
          return;
        }

        setParsedPreview(parsedRecords);
        setImportStatus({ 
          success: `Parsed ${parsedRecords.length} records. Skipping ${skippedCount} unmatched or invalid rows.` 
        });

      } catch (err: any) {
        setImportStatus({ error: `Failed to read file: ${err.message}` });
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (parsedPreview.length === 0) return;
    try {
      if (onSaveGrn) {
        for (const item of parsedPreview) {
          await onSaveGrn(item.grn);
        }
      }
      setImportStatus({ success: `Successfully imported ${parsedPreview.length} inventory records!` });
      setParsedPreview([]);
      // Clear file inputs
      const fInputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>;
      fInputs.forEach(i => { i.value = ''; });
    } catch (err: any) {
      setImportStatus({ error: `Import failed: ${err.message}` });
    }
  };

  const renderSortIndicator = (col: SortColumn) => {
    if (sortColumn !== col) {
      return <ArrowUpDown className="w-3.5 h-3.5 opacity-40 ml-1 inline-block shrink-0" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3.5 h-3.5 text-[#8ed5ff] ml-1 inline-block shrink-0" />
      : <ArrowDown className="w-3.5 h-3.5 text-[#8ed5ff] ml-1 inline-block shrink-0" />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Upper header statistics with standard title & sub-text, and aligned import/export selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 id="stock-master-title" className={`text-xl font-bold font-sans flex items-center gap-2 ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>
            <Layers className={`w-5 h-5 ${theme === 'light' ? 'text-blue-600' : 'text-[#8ed5ff]'}`} />
            <span>Inventory Master</span>
          </h2>
          <p className={`text-xs mt-1 font-sans ${theme === 'light' ? 'text-slate-500' : 'text-[#87929a]'}`}>
            Unified inventory master directory. Track QC approved warehouse stocks or monitor ownership of materials dispatched outside to jobworkers like Gamma.
          </p>
        </div>

        {/* Import & Export controls alignment */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Download Sample Format Button */}
          <button
            onClick={handleDownloadSampleFormat}
            className={`px-3 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              theme === 'light'
                ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                : 'bg-sky-500/10 hover:bg-sky-500/20 text-[#8ed5ff] hover:text-white border border-sky-500/15'
            }`}
            title="Download Sample CSV/Excel guide template for bulk importing"
          >
            <FileDown className="w-4 h-4" />
            <span>Format Sample</span>
          </button>

          {/* Import Button */}
          <button
            onClick={() => {
              setIsImportModalOpen(true);
              setImportStatus(null);
              setParsedPreview([]);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5 border ${
              theme === 'light'
                ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500'
                : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400/20'
            }`}
          >
            <span>📤 Bulk Import Stock</span>
          </button>

          {/* Export Reports Dropdown */}
          <div className="relative">
            <select
              id="import-export-select"
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'csv') handleExportCSV();
                else if (val === 'excel') handleExportExcel();
                else if (val === 'pdf') handleExportPDF();
                e.target.value = ''; // Reset select
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black tracking-wider transition-all shadow-md outline-none cursor-pointer border-none ${
                theme === 'light'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              }`}
            >
              <option value="" className={theme === 'light' ? 'bg-white text-slate-800' : 'bg-[#0f172a] text-[#87929a] font-bold'}>📥 EXPORT REPORTS...</option>
              <option value="csv" className={theme === 'light' ? 'bg-white text-slate-800' : 'bg-[#0f172a] text-white'}>Export as CSV File</option>
              <option value="excel" className={theme === 'light' ? 'bg-white text-slate-800' : 'bg-[#0f172a] text-white'}>Export as Excel (.xls)</option>
              <option value="pdf" className={theme === 'light' ? 'bg-white text-slate-800' : 'bg-[#0f172a] text-white'}>Export/Print PDF</option>
            </select>
          </div>
        </div>
      </div>

      {/* Modern Filter Dropdown next to Modify Columns Button for streamlined clean layout */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl border ${
        theme === 'light' 
          ? 'bg-white border-slate-200/80 shadow-xs' 
          : 'bg-[#0d1527] border-white/5 shadow-md'
      }`}>
        <div className="flex flex-wrap items-center gap-2.5">
          <label htmlFor="inventory-tab-filter" className={`text-xs font-black uppercase tracking-wider ${theme === 'light' ? 'text-slate-600' : 'text-[#87929a]'}`}>
            🔍 Category View:
          </label>
          <select
            id="inventory-tab-filter"
            value={inventoryFilterTab}
            onChange={(e) => setInventoryFilterTab(e.target.value as any)}
            className={`px-4 py-2 text-xs font-extrabold rounded-xl outline-none transition cursor-pointer border ${
              theme === 'light'
                ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500'
                : 'bg-white/5 border-white/10 text-white focus:border-[#8ed5ff]'
            }`}
          >
            <option value="All" className={theme === 'light' ? 'bg-white text-slate-800' : 'bg-[#131b2e] text-white'}>📊 All Stock Items (Combined)</option>
            <option value="Warehouse" className={theme === 'light' ? 'bg-white text-slate-800' : 'bg-[#131b2e] text-white'}>🏢 Warehouse Stocks Only</option>
            <option value="Jobwork" className={theme === 'light' ? 'bg-white text-slate-800' : 'bg-[#131b2e] text-white'}>⚙️ Jobwork Outside Dispatches</option>
            <option value="LowStock" className={theme === 'light' ? 'bg-white text-slate-800' : 'bg-[#131b2e] text-white'}>⚠️ Critical Low Stocks Alerts</option>
            <option value="NearExpiry" className={theme === 'light' ? 'bg-white text-slate-800' : 'bg-[#131b2e] text-white'}>⏰ Fast Near Expiry (≤90 Days)</option>
          </select>
        </div>

        {/* Button: Modify Columns Display checklist dropdown placed right next to option select */}
        <div className="relative self-end sm:self-auto">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all cursor-pointer flex items-center gap-1.5 border ${
              showDropdown 
                ? theme === 'light'
                  ? 'bg-blue-50 text-blue-700 border-blue-400/50 font-extrabold'
                  : 'bg-sky-450/20 text-sky-300 border-sky-400/40 font-extrabold shadow-md scale-102'
                : theme === 'light'
                  ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
                  : 'bg-white/5 hover:bg-white/10 text-stone-200 border-white/10'
            }`}
          >
            <SlidersHorizontal className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-blue-600' : 'text-[#8ed5ff]'}`} />
            <span>⚙️ Modify Columns</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDropdown && (
            <>
              <div 
                className="fixed inset-0 z-10 bg-transparent" 
                onClick={() => setShowDropdown(false)} 
              />
              <div className={`absolute right-0 top-full mt-2 w-64 border rounded-xl shadow-2xl p-3.5 z-20 space-y-2 text-xs font-semibold text-left ${
                theme === 'light'
                  ? 'bg-white border-slate-200 text-slate-800'
                  : 'bg-[#131b2e] border-white/15 text-white'
              }`}>
                <div className={`text-[10px] font-black uppercase tracking-widest pb-1 border-b ${
                  theme === 'light' ? 'text-blue-700 border-slate-100' : 'text-[#8ed5ff] border-white/5 mb-2'
                }`}>
                  Select Columns to Display
                </div>
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {columnOrder.filter(k => k !== 'code').map((key, index, arr) => {
                    const label = columnLabels[key] || String(key);
                    const isFirst = index === 0;
                    const isLast = index === arr.length - 1;
                    return (
                      <div 
                        key={key} 
                        className={`flex items-center justify-between gap-1.5 p-1.5 rounded-lg transition ${
                          theme === 'light' ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-white/5 text-stone-200'
                        }`}
                      >
                        <label className="flex items-center gap-2 cursor-pointer select-none flex-1 py-0.5">
                          <input
                            type="checkbox"
                            checked={visibleColumns[key]}
                            onChange={() => toggleColumn(key)}
                            className={`rounded w-3.5 h-3.5 cursor-pointer shrink-0 ${
                              theme === 'light'
                                ? 'border-slate-300 text-blue-600 focus:ring-blue-500'
                                : 'border-white/25 bg-slate-950 text-[#8ed5ff] focus:ring-[#8ed5ff]'
                            }`}
                          />
                          <span className="text-[11px] font-medium leading-tight">{label}</span>
                        </label>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveColumn(key, 'up');
                            }}
                            disabled={isFirst}
                            className={`p-1 rounded transition duration-150 ${
                              theme === 'light' 
                                ? 'hover:bg-slate-200 text-slate-500 focus:text-blue-600 disabled:opacity-20' 
                                : 'hover:bg-white/10 text-stone-400 focus:text-[#8ed5ff] disabled:opacity-25'
                            } disabled:pointer-events-none`}
                            title="Move Left"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveColumn(key, 'down');
                            }}
                            disabled={isLast}
                            className={`p-1 rounded transition duration-150 ${
                              theme === 'light' 
                                ? 'hover:bg-slate-200 text-slate-500 focus:text-blue-600 disabled:opacity-20' 
                                : 'hover:bg-white/10 text-stone-400 focus:text-[#8ed5ff] disabled:opacity-25'
                            } disabled:pointer-events-none`}
                            title="Move Right"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 🔍 Search-Guided Product Movement Ledger Audit Report */}
      {searchTerm.trim() !== '' && matchedMaterials.length > 0 && (
        <div className="bg-slate-900 border border-sky-500/20 rounded-2xl p-6 shadow-xl space-y-6 my-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
            <div>
              <div className="text-[10px] uppercase font-black tracking-widest text-[#8ed5ff]">Live Master Audit Inquiry</div>
              <h3 className="text-base font-bold font-sans text-white flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-[#8ed5ff]" />
                <span>Transaction Movement Report for matching items ({matchedMaterials.length})</span>
              </h3>
            </div>
            <span className="text-[10px] font-mono bg-[#8ed5ff]/10 text-[#8ed5ff] px-2.5 py-1 rounded-full border border-[#8ed5ff]/20">
              Query: "{searchTerm}"
            </span>
          </div>

          <div className="space-y-6">
            {matchedMaterials.slice(0, 3).map(mat => {
              const matchedGrns = grns.filter(g => g.materialId === mat.id);
              const matchedOutwards = outwards.filter(o => o.materialId === mat.id);
              const totalInwardQty = matchedGrns.reduce((sum, g) => sum + g.qty, 0);
              const totalOutwardQty = matchedOutwards.reduce((sum, o) => sum + o.qty, 0);
              const currentAvailable = Math.max(0, totalInwardQty - totalOutwardQty);
              
              const receivedLocations = Array.from(new Set(matchedGrns.map(g => g.warehouseLocation)));
              const issuedDepartments = Array.from(new Set(matchedOutwards.map(o => o.department)));

              const ledgerEvents = [
                ...matchedGrns.map(g => ({
                  id: g.id,
                  date: g.grnDate,
                  type: 'INWARD',
                  voucherNo: g.grnNo,
                  batchNo: g.batchNo,
                  qty: g.qty,
                  party: g.supplierName,
                  location: g.warehouseLocation,
                  remark: g.remarks || g.sourceType
                })),
                ...matchedOutwards.map(o => ({
                  id: o.id,
                  date: o.outwardDate,
                  type: 'OUTWARD',
                  voucherNo: o.outwardNo,
                  batchNo: o.batchNo,
                  qty: o.qty,
                  party: o.department === 'Jobwork / Gamma' ? o.jobworkVendorName || o.department : o.department,
                  location: o.department,
                  remark: o.remarks || o.outwardType
                }))
              ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

              return (
                <div key={mat.id} className="bg-black/25 border border-white/5 rounded-xl p-4.5 space-y-4">
                  {/* Item header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-2.5">
                    <div>
                      <div className="text-xs font-bold text-white">{mat.materialName}</div>
                      <div className="text-[10px] font-mono text-stone-400 mt-0.5">Code: {mat.materialCode} | Category: {mat.category} | UOM: {mat.uom}</div>
                    </div>
                  </div>

                  {/* Summary grid stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3">
                      <div className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider">Total Inward Received</div>
                      <div className="text-base font-black text-emerald-300 mt-1">{totalInwardQty.toLocaleString()} <span className="text-xs font-semibold">{mat.uom}</span></div>
                      <div className="text-[9px] text-stone-400 mt-1.5 leading-tight truncate" title={receivedLocations.join(', ')}>
                        Locations: {receivedLocations.length > 0 ? receivedLocations.join(', ') : 'None'}
                      </div>
                    </div>

                    <div className="bg-[#2563eb]/5 border border-[#2563eb]/10 rounded-xl p-3">
                      <div className="text-[9px] uppercase font-bold text-[#8ed5ff] tracking-wider font-sans">Total Issued Outward</div>
                      <div className="text-base font-black text-[#8ed5ff] mt-1">{totalOutwardQty.toLocaleString()} <span className="text-xs font-semibold">{mat.uom}</span></div>
                      <div className="text-[9px] text-stone-450 mt-1.5 leading-tight truncate" title={issuedDepartments.join(', ')}>
                        Issued To: {issuedDepartments.length > 0 ? issuedDepartments.join(', ') : 'None'}
                      </div>
                    </div>

                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3">
                      <div className="text-[9px] uppercase font-bold text-amber-500 tracking-wider font-sans">Live Net Balance</div>
                      <div className="text-base font-black text-amber-300 mt-1">{currentAvailable.toLocaleString()} <span className="text-xs font-semibold">{mat.uom}</span></div>
                      <div className="text-[9px] text-stone-450 mt-1.5 font-sans">
                        Alarms Min stock: {mat.minStock} {mat.uom}
                      </div>
                    </div>
                  </div>

                  {/* Ledger logs */}
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase font-bold text-stone-400 tracking-wider font-sans">Movement Timeline (Ledger)</div>
                    {ledgerEvents.length === 0 ? (
                      <div className="text-center py-4 bg-[#141a2c] rounded-xl text-[11px] text-stone-500 font-sans">
                        No transactions found for this material in ledger logs.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#141a2c]">
                        <table className="min-w-full divide-y divide-white/5 text-[11px]">
                          <thead className="bg-[#19223a] text-stone-300 uppercase text-[9px] tracking-wider font-sans">
                            <tr>
                              <th className="px-3 py-2 text-left">Date</th>
                              <th className="px-3 py-2 text-center">Type</th>
                              <th className="px-3 py-2 text-left">Voucher No</th>
                              <th className="px-3 py-2 text-left">Batch No</th>
                              <th className="px-3 py-2 text-right">Transaction Qty</th>
                              <th className="px-3 py-2 text-left">Source / Recipient</th>
                              <th className="px-3 py-2 text-left font-sans">Target location</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-stone-300">
                            {ledgerEvents.map(evt => (
                              <tr key={evt.id} className="hover:bg-white/5 transition duration-150">
                                <td className="px-3 py-1.5 whitespace-nowrap font-mono">{evt.date}</td>
                                <td className="px-3 py-1.5 text-center whitespace-nowrap">
                                  <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black ${
                                    evt.type === 'INWARD' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-sky-500/10 text-sky-305 border border-sky-500/20'
                                  }`}>
                                    {evt.type}
                                  </span>
                                </td>
                                <td className="px-3 py-1.5 whitespace-nowrap font-semibold text-stone-200">{evt.voucherNo}</td>
                                <td className="px-3 py-1.5 whitespace-nowrap font-mono">{evt.batchNo}</td>
                                <td className="px-3 py-1.5 text-right whitespace-nowrap font-bold text-stone-100">
                                  {evt.type === 'INWARD' ? '+' : '-'}{evt.qty.toLocaleString()}
                                </td>
                                <td className="px-3 py-1.5 text-left truncate max-w-[120px]" title={evt.party}>{evt.party}</td>
                                <td className="px-3 py-1.5 text-left truncate max-w-[140px]" title={evt.location}>{evt.location}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Control panel and filters */}
      {showWarehouse && (
        <div className={`border rounded-2xl p-5 space-y-4 ${
          theme === 'light' ? 'bg-white border-slate-200/80 shadow-xs' : 'bg-white/5 border border-white/10'
        }`}>
        <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center">
          
          {/* Main search and selectors combo */}
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative rounded-xl shadow-sm flex-1 min-w-[240px]">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className={`h-4 w-4 ${theme === 'light' ? 'text-slate-400' : 'text-stone-400'}`} />
              </div>
              <input
                id="stock-master-search"
                type="text"
                placeholder="Search by material code, name, batch, pallet or drum..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`block w-full pl-9 pr-3 py-2.5 text-xs border outline-none rounded-xl transition ${
                  theme === 'light'
                    ? 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500 shadow-xs'
                    : 'bg-white/5 border-white/10 text-white placeholder-stone-500 focus:border-[#8ed5ff]'
                }`}
              />
            </div>

            {/* Storage Area Filter */}
            <select
              id="filter-location-select"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className={`px-3 py-2.5 border text-xs rounded-xl font-bold outline-none transition cursor-pointer ${
                theme === 'light'
                  ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 focus:border-blue-500 shadow-xs'
                  : 'bg-white/5 hover:bg-white/10 text-white border-white/10 focus:border-[#8ed5ff]'
              }`}
            >
              <option value="All" className={theme === 'light' ? 'bg-white text-slate-800' : 'bg-[#131b2e] text-white'}>All Locations</option>
              <option value="RM Store" className={theme === 'light' ? 'bg-white text-slate-800' : 'bg-[#131b2e] text-white'}>RM Store</option>
              <option value="PPM Store" className={theme === 'light' ? 'bg-white text-slate-800' : 'bg-[#131b2e] text-white'}>PPM Store</option>
              <option value="QC Hold Area" className={theme === 'light' ? 'bg-white text-slate-800' : 'bg-[#131b2e] text-white'}>QC Hold Area</option>
              <option value="Rejected Store" className={theme === 'light' ? 'bg-white text-slate-800' : 'bg-[#131b2e] text-white'}>Rejected Store</option>
              <option value="Finished Goods Store" className={theme === 'light' ? 'bg-white text-slate-800' : 'bg-[#131b2e] text-white'}>Finished Goods SFG</option>
            </select>

            {/* QC Status Filter */}
            <select
              id="filter-qc-status-select"
              value={qcStatusFilter}
              onChange={(e) => setQcStatusFilter(e.target.value)}
              className={`px-3 py-2.5 border text-xs rounded-xl font-bold outline-none transition cursor-pointer ${
                theme === 'light'
                  ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 focus:border-blue-500 shadow-xs'
                  : 'bg-white/5 hover:bg-white/10 text-white border-white/10 focus:border-[#8ed5ff]'
              }`}
            >
              <option value="All" className={theme === 'light' ? 'bg-white text-slate-800' : 'bg-[#131b2e] text-white'}>All QC Statuses</option>
              <option value="Approved" className={theme === 'light' ? 'bg-white text-emerald-700 font-bold' : 'bg-[#131b2e] text-emerald-400 font-bold'}>Approved Only</option>
              <option value="Pending" className={theme === 'light' ? 'bg-white text-amber-700 font-bold' : 'bg-[#131b2e] text-amber-400 font-bold'}>Pending Approval</option>
              <option value="Rejected" className={theme === 'light' ? 'bg-white text-rose-700 font-bold' : 'bg-[#131b2e] text-rose-400 font-bold'}>Rejected Only</option>
            </select>
          </div>

        </div>

        {/* Unified Stock Report output table */}
        <div className={`overflow-x-auto rounded-xl border ${theme === 'light' ? 'border-slate-200/80 shadow-xs bg-white' : 'border-white/10'}`}>
          <table className={`min-w-full text-xs divide-y ${theme === 'light' ? 'divide-slate-200' : 'divide-white/5'}`}>
            <thead className={`font-bold uppercase tracking-wider text-[10px] select-none ${theme === 'light' ? 'bg-slate-50/80 text-slate-700 border-b border-slate-200' : 'bg-[#131b2e] text-white'}`}>
              <tr>
                {columnOrder.map(key => {
                  if (!visibleColumns[key]) return null;
                  return renderHeaderCell(key);
                })}
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'light' ? 'divide-slate-100 text-slate-800' : 'divide-white/5 text-[#d1d5db]'}`}>
              {sortedRows.length === 0 ? (
                <tr>
                  <td 
                    colSpan={Object.keys(visibleColumns).filter(k => visibleColumns[k as keyof VisibleColumns]).length} 
                    className={`px-4 py-12 text-center font-sans ${theme === 'light' ? 'text-slate-400' : 'text-stone-400'}`}
                  >
                    <div className="flex flex-col items-center justify-center space-y-2">
                       <Inbox className="w-8 h-8 text-stone-500" />
                      <span>No matched raw materials or batch stocks match the filter criteria.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedRows.map((row) => {
                  const isExpired = row.expiryStats.isExpired;

                  return (
                    <tr 
                      key={row.id} 
                      className={`transition duration-150 ${
                        theme === 'light'
                          ? isExpired
                            ? 'bg-rose-50/70 hover:bg-rose-100/50'
                            : 'hover:bg-slate-50'
                          : isExpired
                            ? 'bg-rose-500/5 hover:bg-white/5'
                            : 'hover:bg-white/5'
                      }`}
                    >
                      {columnOrder.map(key => {
                        if (!visibleColumns[key]) return null;
                        return renderBodyCell(key, row);
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {showJobwork && (
        <div className="space-y-4 animate-fade-in block">
          
          {inventoryFilterTab === 'All' && (
            <div className={`mt-6 pt-6 border-t ${theme === 'light' ? 'border-slate-200' : 'border-white/10'} space-y-1`}>
              <h3 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>
                <span>⚙️ Jobwork Outside Sent Stock Tracker</span>
              </h3>
              <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-[#87929a]'}`}>
                Real-time tracking of outward materials sent for external processing or packing, showing total quantities and returned balance.
              </p>
            </div>
          )}

          {/* Search Box */}
          {inventoryFilterTab !== 'All' && (
            <div className={`flex flex-wrap items-center gap-3 border rounded-2xl p-4 ${
              theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#0d1527] border-white/5'
            }`}>
              <div className="relative rounded-xl shadow-sm flex-1 min-w-[240px]">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search className={`h-4 w-4 ${theme === 'light' ? 'text-slate-400' : 'text-[#8ed5ff]'}`} />
                </div>
                <input
                  type="text"
                  placeholder="Search jobwork by vendor name, material code, batch number, or challan number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`block w-full pl-9 pr-3 py-2.5 text-xs border outline-none rounded-xl transition ${
                    theme === 'light'
                      ? 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500'
                      : 'bg-white/5 border-white/10 text-white placeholder-stone-500 focus:border-[#8ed5ff]'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Jobwork Table */}
          <div className={`overflow-x-auto rounded-xl border ${theme === 'light' ? 'border-slate-200/80 shadow-xs bg-white' : 'border-blue-900/45'}`}>
            <table className={`min-w-full text-xs divide-y ${theme === 'light' ? 'divide-slate-200' : 'divide-white/5'}`}>
              <thead className={`font-bold uppercase tracking-wider text-[10px] select-none border-b ${
                theme === 'light' ? 'bg-slate-50/80 text-slate-700 border-slate-200' : 'bg-[#0b1326] text-white border-white/5'
              }`}>
                <tr>
                  <th className={`px-4 py-3.5 text-left ${theme === 'light' ? 'text-slate-600' : 'text-[#8ed5ff]'}`}>Date Sent</th>
                  <th className={`px-4 py-3.5 text-left ${theme === 'light' ? 'text-slate-600' : 'text-[#8ed5ff]'}`}>Vendor / Processor</th>
                  <th className={`px-4 py-3.5 text-left ${theme === 'light' ? 'text-slate-750' : 'text-sky-400'}`}>Material Name &amp; Code</th>
                  <th className="px-4 py-3.5 text-center">Batch No</th>
                  <th className="px-4 py-3.5 text-center">Challan Ref No</th>
                  <th className="px-4 py-3.5 text-center">Packing Type</th>
                  <th className="px-4 py-3.5 text-right">Dispatched Qty</th>
                  <th className={`px-4 py-3.5 text-right ${theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'}`}>Returned Qty</th>
                  <th className={`px-4 py-3.5 text-right font-black ${theme === 'light' ? 'text-blue-700' : 'text-blue-400'}`}>Remaining Balance</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'light' ? 'bg-white divide-slate-100' : 'bg-[#131b2e]/30 divide-white/5'}`}>
                {(() => {
                  const filteredJobworkRows = jobworkRows.filter(r => {
                    return r.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           r.materialCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           r.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           r.batchNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           r.docNo.toLowerCase().includes(searchTerm.toLowerCase());
                  });

                  if (filteredJobworkRows.length === 0) {
                    return (
                      <tr>
                        <td colSpan={9} className={`px-4 py-8 text-center italic ${theme === 'light' ? 'text-slate-400' : 'text-stone-500'}`}>
                          No active jobwork dispatches match your query terms.
                        </td>
                      </tr>
                    );
                  }

                  return filteredJobworkRows.map((r) => {
                    const isCompleted = r.outsideBalance <= 0;
                    return (
                      <tr key={r.id} className={`transition duration-150 ${theme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-white/5'}`}>
                        <td className={`px-4 py-3 whitespace-nowrap font-mono ${theme === 'light' ? 'text-slate-600' : 'text-stone-400'}`}>
                          {r.date ? r.date.split('-').reverse().join('-') : 'N/A'}
                        </td>
                        <td className={`px-4 py-3 font-bold text-left ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>
                          <span className={`px-2 py-0.5 rounded text-[10px] border mr-1.5 uppercase font-bold ${
                            theme === 'light' ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}>Vendor</span>
                          {r.vendor}
                        </td>
                        <td className="px-4 py-3 text-left">
                          <div className={`font-semibold ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>{r.materialName}</div>
                          <div className={`text-[10px] font-mono mt-0.5 ${theme === 'light' ? 'text-blue-700' : 'text-[#8ed5ff]'}`}>{r.materialCode}</div>
                        </td>
                        <td className={`px-4 py-3 text-center font-bold font-mono ${theme === 'light' ? 'text-slate-800' : 'text-amber-300'}`}>
                          {r.batchNo}
                        </td>
                        <td className={`px-4 py-3 text-center font-mono ${theme === 'light' ? 'text-slate-650' : 'text-slate-300'}`}>
                          {r.docNo}
                        </td>
                        <td className={`px-4 py-3 text-center ${theme === 'light' ? 'text-slate-650' : 'text-slate-300'}`}>
                          {r.packing}
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold ${theme === 'light' ? 'text-slate-850' : 'text-stone-200'}`}>
                          {r.dispatchedQty.toLocaleString()} {r.uom}
                        </td>
                        <td className={`px-4 py-3 text-right font-bold font-mono ${theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'}`}>
                          {r.returnedQty.toLocaleString()} {r.uom}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {isCompleted ? (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                              theme === 'light'
                                ? 'text-emerald-800 bg-emerald-50 border-emerald-300'
                                : 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/20'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${theme === 'light' ? 'bg-emerald-600' : 'bg-emerald-500'}`} />
                              Fully Returned
                            </span>
                          ) : (
                            <div className="text-right">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                                theme === 'light'
                                  ? 'text-blue-800 bg-blue-50 border-blue-300'
                                  : 'text-blue-400 bg-blue-500/15 border border-blue-500/20'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${theme === 'light' ? 'bg-blue-600' : 'bg-blue-500'}`} />
                                {r.outsideBalance.toLocaleString()} {r.uom} Pending
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 📤 Bulk Import Dialog Modal */}
      {isImportModalOpen && (
        <div id="import-modal-overlay" className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#0b101d] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/5 bg-[#0f1524]">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="font-bold text-white text-base">Bulk Spreadsheet Stock Import</h3>
                  <p className="text-[10px] text-stone-400 font-sans mt-0.5">Upload a CSV/Excel CSV file containing current physical batch inventories to import them into the active warehouse registry.</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportStatus(null);
                  setParsedPreview([]);
                }}
                className="text-[#87929a] hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-xl transition cursor-pointer text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-left">
              {/* Sample format helper banner and manual format instruction */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 bg-[#1e293b]/30 p-4 rounded-xl border border-white/5 flex flex-col justify-between space-y-2">
                  <div className="text-xs text-stone-300 leading-relaxed space-y-1">
                    <p className="font-bold text-sky-400 uppercase tracking-widest text-[10px]">Instructions &amp; Required Column Headers:</p>
                    <p>Your spreadsheet should contain the following headers in the first row:</p>
                    <div className="bg-slate-950/80 p-2 rounded-lg font-mono text-[10px] text-stone-300 leading-snug break-all border border-white/5 select-all">
                      Sector, Material Code, Material Name, Batch Number, Pallet, Drum, Quantity, Mfg Date, Exp Date, QC Status
                    </div>
                    <p className="text-[#87929a] mt-1 text-[10px]">Note: The system automatically matches existing materials based on <b>Material Code</b> or <b>Material Name</b>.</p>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={handleDownloadSampleFormat}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-black rounded-lg transition-all cursor-pointer"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>Download Excel/CSV Format Guide</span>
                    </button>
                  </div>
                </div>

                <div className="bg-blue-950/20 p-4 rounded-xl border border-blue-500/10 space-y-2 text-stone-300">
                  <div className="text-[10px] text-blue-400 font-extrabold uppercase tracking-widest">Guide &amp; Tips:</div>
                  <ul className="list-disc pl-4 space-y-1 text-[10px] text-[#dae2fd]">
                    <li><b>Mfg &amp; Exp Date</b> should be formatted as YYYY-MM-DD.</li>
                    <li><b>QC Status</b> defaults to 'Approved' if empty.</li>
                    <li>Quantities must be positive numbers.</li>
                  </ul>
                </div>
              </div>

              {/* Status Alert Banner */}
              {importStatus && (
                <div className={`p-4 rounded-xl border text-xs font-semibold ${
                  importStatus.error 
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                }`}>
                  <p>{importStatus.error || importStatus.success}</p>
                </div>
              )}

              {/* Upload Drop Zone / Input */}
              <div className="border-2 border-dashed border-white/10 hover:border-white/25 rounded-2xl p-6 text-center bg-slate-950/25 transition">
                <input 
                  type="file" 
                  accept=".csv,.txt" 
                  onChange={handleFileImportChange}
                  className="hidden" 
                  id="csv-file-uploader-input" 
                />
                <label htmlFor="csv-file-uploader-input" className="cursor-pointer block space-y-3">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/20 shadow-xs">
                    <FileDown className="w-5 h-5 rotate-180" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-white block">Click to Browse CSV/Excel File</span>
                    <span className="text-[10px] text-stone-500 mt-1 block">Supports .csv, .txt formatted files</span>
                  </div>
                </label>
              </div>

              {/* Parsed Preview Table */}
              {parsedPreview.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#8ed5ff] uppercase tracking-wider">Previewing Data to Import ({parsedPreview.length} items)</h4>
                    <span className="text-[10px] text-stone-400">Review carefully before confirmation</span>
                  </div>
                  <div className="border border-white/5 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-[11px] border-collapse bg-slate-950/20">
                      <thead className="bg-[#121927] text-[#87929a] uppercase font-bold text-[9px] tracking-wider border-b border-white/5">
                        <tr>
                          <th className="px-3 py-2">Sector</th>
                          <th className="px-3 py-2">Material</th>
                          <th className="px-3 py-2">Batch No</th>
                          <th className="px-3 py-2">Pallet / Drum</th>
                          <th className="px-3 py-2 text-right">Quantity</th>
                          <th className="px-3 py-2 text-center">Dates (Mfg → Exp)</th>
                          <th className="px-3 py-2 text-center">QC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {parsedPreview.map((item, index) => (
                          <tr key={index} className="hover:bg-white/[0.02] text-stone-200">
                            <td className="px-3 py-2 text-[#8ed5ff] font-sans font-medium">{item.grn.warehouseLocation || 'N/A'}</td>
                            <td className="px-3 py-2 font-bold text-white">
                              <div>{item.materialName}</div>
                              <div className="text-[9px] text-[#87929a] font-mono mt-0.5">{item.materialCode}</div>
                            </td>
                            <td className="px-3 py-2 font-mono text-amber-300">{item.grn.batchNo}</td>
                            <td className="px-3 py-2 text-[#dae2fd]">
                              {item.grn.palletNo || '-'} {item.grn.drumNo ? `/ ${item.grn.drumNo}` : ''}
                            </td>
                            <td className="px-3 py-2 text-right font-black text-white">
                              {item.grn.qty.toLocaleString()} {item.uom}
                            </td>
                            <td className="px-3 py-2 text-center text-stone-400 font-mono text-[10px]">
                              {item.grn.mfgDate} → {item.grn.expDate}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${
                                item.grn.qcStatus === 'Approved' ? 'bg-emerald-500/15 text-emerald-400' :
                                item.grn.qcStatus === 'Rejected' ? 'bg-rose-500/15 text-rose-400' :
                                'bg-amber-500/15 text-amber-400'
                              }`}>
                                {item.grn.qcStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end items-center gap-3 p-5 border-t border-white/5 bg-[#0f1524]">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportStatus(null);
                  setParsedPreview([]);
                }}
                className="px-4 py-2 hover:bg-white/5 text-stone-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={parsedPreview.length === 0}
                className={`px-5 py-2 rounded-xl text-xs font-black tracking-wide shadow-md transition-all flex items-center gap-1.5 ${
                  parsedPreview.length > 0
                    ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 cursor-pointer'
                    : 'bg-white/5 text-stone-500 border border-white/5 cursor-not-allowed'
                }`}
              >
                <span>Confirm and Import Stock ({parsedPreview.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
