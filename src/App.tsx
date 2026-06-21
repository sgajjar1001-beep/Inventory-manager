import React, { useState, useEffect } from 'react';
import { dbService } from './services/db';
import { User, Material, Grn, Outward } from './types';

// Tab screens
import LoginScreen from './components/LoginScreen';
import HomeLauncher from './components/HomeLauncher';
import DashboardTab from './components/DashboardTab';
import MaterialTab from './components/MaterialTab';
import GrnTab from './components/GrnTab';
import QcTab from './components/QcTab';
import InventoryTab from './components/InventoryTab';
import OutwardTab from './components/OutwardTab';
import UsersTab from './components/UsersTab';
import ProfileTab from './components/ProfileTab';
import SettingsTab from './components/SettingsTab';

import { 
  Database, 
  Layers, 
  FileSpreadsheet, 
  Hourglass, 
  Boxes, 
  Users, 
  LogOut, 
  User as UserIcon, 
  Cloud, 
  CloudOff,
  Activity,
  LayoutGrid,
  Building2,
  Sliders,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileText,
  Sun,
  Moon,
  PlusCircle
} from 'lucide-react';

export default function App() {
  // Global synchronization state
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [grns, setGrns] = useState<Grn[]>([]);
  const [outwards, setOutwards] = useState<Outward[]>([]);
  
  // Theme state selector
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('app-theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'light';
  });

  useEffect(() => {
    document.body.className = theme;
    document.documentElement.className = theme;
    localStorage.setItem('app-theme', theme);
  }, [theme]);
  
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarExpanded, setMobileSidebarExpanded] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<any>(null);

  // Auth Session State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Navigation - default to home tiles dashboard
  const [activeTab, setActiveTab] = useState<string>('home');

  // Multi-sequence category types
  const [defaultInwardSource, setDefaultInwardSource] = useState<'Supplier' | 'Production Return' | 'Jobwork Return'>('Supplier');
  const [defaultOutwardType, setDefaultOutwardType] = useState<'Trial' | 'Sample' | 'Commercial Use'>('Commercial Use');

  const refreshProfileState = async () => {
    try {
      const p = await dbService.fetchCompanyProfile();
      setCompanyProfile(p);
    } catch (e) {
      console.error(e);
    }
  };

  // Trigger load
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [fetchedUsers, fetchedMaterials, fetchedGrns, fetchedOutwards, fetchedProfile] = await Promise.all([
          dbService.fetchUsers(),
          dbService.fetchMaterials(),
          dbService.fetchGrnRecords(),
          dbService.fetchOutwardRecords(),
          dbService.fetchCompanyProfile()
        ]);
        
        setUsers(fetchedUsers);
        setMaterials(fetchedMaterials);
        setGrns(fetchedGrns);
        setOutwards(fetchedOutwards);
        setCompanyProfile(fetchedProfile);
      } catch (err) {
        console.error('Failure fetching records:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    // Default to the main Landing Tiles grid screen
    setActiveTab('home');
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleImportBackup = async (data: {
    materials: Material[];
    grns: Grn[];
    outwards: Outward[];
    users: User[];
  }) => {
    try {
      // Stream write all records to DB
      for (const m of data.materials || []) {
        await dbService.saveMaterial(m);
      }
      for (const g of data.grns || []) {
        await dbService.saveGrn(g);
      }
      for (const o of data.outwards || []) {
        await dbService.saveOutwardRecord(o);
      }
      for (const u of data.users || []) {
        await dbService.saveUser(u);
      }

      // Sync active state variables
      setMaterials(data.materials || []);
      setGrns(data.grns || []);
      setOutwards(data.outwards || []);
      setUsers(data.users || []);
    } catch (err) {
      console.error('Dynamic DB import error:', err);
      throw err;
    }
  };

  // State modifiers
  const handleSaveUser = async (user: User) => {
    await dbService.saveUser(user);
    setUsers(prev => [...prev, user]);
  };

  const handleSaveMaterial = async (material: Material) => {
    await dbService.saveMaterial(material);
    setMaterials(prev => [...prev, material]);
  };

  const handleDeleteMaterial = async (id: string) => {
    await dbService.deleteMaterial(id);
    setMaterials(prev => prev.filter(m => m.id !== id));
  };

  const handleSaveGrn = async (grn: Grn) => {
    await dbService.saveGrn(grn);
    setGrns(prev => {
      const exists = prev.some(g => g.id === grn.id);
      if (exists) {
        return prev.map(g => g.id === grn.id ? grn : g);
      }
      return [grn, ...prev];
    });
  };

  const handleSaveOutward = async (outward: Outward) => {
    await dbService.saveOutwardRecord(outward);
    setOutwards(prev => {
      const exists = prev.some(o => o.id === outward.id);
      if (exists) {
        return prev.map(o => o.id === outward.id ? outward : o);
      }
      return [outward, ...prev];
    });
  };

  const handleDeleteOutward = async (id: string) => {
    await dbService.deleteOutwardRecord(id);
    setOutwards(prev => prev.filter(o => o.id !== id));
  };

  const handleDeleteGrn = async (id: string) => {
    await dbService.deleteGrn(id);
    setGrns(prev => prev.filter(g => g.id !== id));
  };

  const handleApproveQc = async (id: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    await dbService.updateGrnStatus(id, 'Approved', todayStr);
    setGrns(prev => prev.map(g => {
      if (g.id === id) {
        return { ...g, qcStatus: 'Approved', qcReleaseDate: todayStr };
      }
      return g;
    }));
  };

  const handleRejectQc = async (id: string) => {
    await dbService.updateGrnStatus(id, 'Rejected', '');
    setGrns(prev => prev.map(g => {
      if (g.id === id) {
        return { ...g, qcStatus: 'Rejected', qcReleaseDate: undefined };
      }
      return g;
    }));
  };

  const isDBActive = dbService.isFirebaseActive();

  // Loading state visualizer
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
        <div className="relative flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <Activity className="absolute text-blue-600 w-5 h-5 animate-pulse" />
        </div>
        <p className="mt-4 text-xs font-semibold text-slate-500 uppercase tracking-widest font-mono">
          Syncing Warehouse Database...
        </p>
      </div>
    );
  }

  // Not Logged In screen container
  if (!currentUser) {
    return <LoginScreen users={users} onLoginSuccess={handleLoginSuccess} />;
  }

  // Render correct tab view
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeLauncher 
            currentUser={currentUser} 
            materials={materials} 
            grns={grns} 
            outwards={outwards} 
            onSelectTab={(tab) => setActiveTab(tab)} 
            onSelectInwardType={(source) => {
              setDefaultInwardSource(source);
              setActiveTab('grn');
            }}
            onSelectOutwardType={(type) => {
              setDefaultOutwardType(type);
              setActiveTab('outward');
            }}
            theme={theme}
          />
        );
      case 'dashboard':
        return (
          <DashboardTab 
            materials={materials} 
            grns={grns} 
            outwards={outwards}
            currentUser={currentUser} 
            onNavigateToTab={(tab) => setActiveTab(tab)} 
          />
        );
      case 'materials':
        return (
          <MaterialTab 
            materials={materials} 
            onSaveMaterial={handleSaveMaterial} 
            onDeleteMaterial={handleDeleteMaterial}
            currentUser={currentUser}
          />
        );
      case 'grn':
        return (
          <GrnTab 
            materials={materials} 
            grns={grns} 
            onSaveGrn={handleSaveGrn} 
            onDeleteGrn={handleDeleteGrn}
            currentUser={currentUser} 
            onSaveMaterial={handleSaveMaterial}
            defaultSourceType={defaultInwardSource}
          />
        );
      case 'qc':
        return (
          <QcTab 
            grns={grns} 
            onApproveQc={handleApproveQc} 
            onRejectQc={handleRejectQc} 
            currentUser={currentUser} 
          />
        );
      case 'inventory':
        return (
          <InventoryTab 
            grns={grns} 
            materials={materials} 
            outwards={outwards}
            currentUser={currentUser} 
            onSaveGrn={handleSaveGrn}
            theme={theme}
          />
        );
      case 'outward':
        return (
          <OutwardTab
            materials={materials}
            grns={grns}
            outwards={outwards}
            onSaveOutward={handleSaveOutward}
            onDeleteOutward={handleDeleteOutward}
            currentUser={currentUser}
            defaultOutwardType={defaultOutwardType}
          />
        );
      case 'users':
        return (
          <UsersTab 
            users={users} 
            onSaveUser={handleSaveUser} 
            currentUser={currentUser} 
            grns={grns}
            outwards={outwards}
          />
        );
      case 'profile':
        return (
          <ProfileTab 
            currentUser={currentUser} 
            onProfileUpdated={refreshProfileState}
          />
        );
      case 'settings':
        return (
          <SettingsTab 
            currentUser={currentUser} 
            grns={grns} 
            onResetDatabase={() => {
              setGrns([]);
              setMaterials([]);
              setOutwards([]);
            }}
            materials={materials}
            outwards={outwards}
            users={users}
            onImportBackup={handleImportBackup}
            onSaveMaterial={handleSaveMaterial}
            theme={theme}
          />
        );
      default:
        return <div className="p-4 text-center">Screen not resolved.</div>;
    }
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row font-sans selection:bg-[#2563eb]/20 selection:text-white transition-colors duration-300 ${
      theme === 'light' ? 'bg-[#faf8ff] text-[#1e293b]' : 'bg-[#0b1326] text-[#dae2fd]'
    }`}>
      
      {/* 1. Left Sidebar - Desktop (Collapsible) & Mobile (Slide-Over Drawer) */}
      <aside 
        id="main-app-sidebar"
        className={`flex flex-col shrink-0 transition-all duration-300 z-50 border-r ${
          sidebarOpen ? 'md:w-64' : 'md:w-20'
        } ${
          mobileSidebarExpanded ? 'fixed inset-y-0 left-0 w-72 shadow-2xl translate-x-0' : 'fixed inset-y-0 left-0 w-72 md:translate-x-0 -translate-x-full md:relative md:flex'
        } ${
          theme === 'light' ? 'bg-white border-[#e2e8f0]' : 'bg-[#0f1a30] border-white/10'
        }`}
      >
        {/* Sidebar Header Block */}
        <div className={`p-4 border-b flex items-center justify-between h-16 shrink-0 transition-colors ${
          theme === 'light' ? 'bg-white border-[#e2e8f0]' : 'bg-[#0c1527] border-white/10'
        }`}>
          <div className="flex items-center gap-2 overflow-hidden">
            <div className={`p-2 rounded-xl border shrink-0 transition-colors ${
              theme === 'light' 
                ? 'bg-[#2563eb]/5 border-[#2563eb]/20 text-[#2563eb]' 
                : 'bg-[#8ed5ff]/10 border border-[#8ed5ff]/20 text-[#8ed5ff]'
            }`}>
              {companyProfile?.logoUrl ? (
                <img 
                  src={companyProfile.logoUrl} 
                  alt="Logo" 
                  className="w-5 h-5 object-contain" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Database className="w-5 h-5" />
              )}
            </div>
            {sidebarOpen && (
              <div className="flex flex-col truncate">
                <span className={`font-bold text-xs tracking-tight uppercase truncate ${
                  theme === 'light' ? 'text-[#1e293b]' : 'text-white'
                }`}>
                  {(companyProfile?.companyName && companyProfile.companyName.trim() !== '' && companyProfile.companyName !== 'NovaStream Pharmaceutical Industries' && companyProfile.companyName !== 'NovaStream Pharma') ? companyProfile.companyName : 'Inventory Master'}
                </span>
                <span className={`text-[9px] font-mono tracking-widest uppercase truncate ${
                  theme === 'light' ? 'text-[#475569]' : 'text-[#8ed5ff]'
                }`}>
                  GST: {(companyProfile?.gstNumber && companyProfile.gstNumber !== '24AAACO1314M1ZP') ? companyProfile.gstNumber.substring(0, 7) + '...' : 'PENDING'}
                </span>
              </div>
            )}
          </div>
          
          {/* Toggle sidebar collapse arrow (desktop) */}
          <button 
            id="desktop-sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`hidden md:flex p-1.5 rounded-lg transition ${
              theme === 'light' ? 'hover:bg-slate-100 text-[#2563eb]' : 'hover:bg-white/10 text-[#8ed5ff]'
            }`}
            title={sidebarOpen ? "Collapse Menu" : "Expand Menu"}
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {/* Close drawer (mobile) */}
          <button
            id="mobile-sidebar-close"
            onClick={() => setMobileSidebarExpanded(false)}
            className="md:hidden p-1.5 hover:bg-rose-500/10 rounded-lg text-rose-450"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sidebar List */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
          
          <div className={`text-[9px] font-bold uppercase tracking-widest px-3.5 mb-2 mt-1 block ${
            theme === 'light' ? 'text-[#475569]' : 'text-[#87929a]'
          }`}>
            {sidebarOpen ? 'Menu Modules' : '📝'}
          </div>

          {/* 1. Main Launcher Tile menu link */}
          <button
            onClick={() => { setActiveTab('home'); setMobileSidebarExpanded(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold font-sans transition-all duration-200 cursor-pointer
              ${activeTab === 'home' 
                ? (theme === 'light' 
                    ? 'bg-[#2563eb]/10 border border-[#2563eb]/30 text-[#2563eb] shadow-sm' 
                    : 'bg-[#8ed5ff]/10 border border-[#8ed5ff]/30 text-white shadow-[#8ed5ff]/5 shadow-md') 
                : (theme === 'light'
                    ? 'text-[#475569] hover:bg-slate-50 hover:text-[#2563eb] border border-transparent'
                    : 'text-[#bdc8d1] hover:bg-white/5 hover:text-white border border-transparent')}`}
          >
            <LayoutGrid className={`w-4 h-4 shrink-0 ${theme === 'light' ? 'text-[#2563eb]' : 'text-[#8ed5ff]'}`} />
            {sidebarOpen && <span className="truncate">All Modules Grid</span>}
          </button>

          {/* 2. Stats Dashboard */}
          <button
            onClick={() => { setActiveTab('dashboard'); setMobileSidebarExpanded(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold font-sans transition-all duration-200 cursor-pointer
              ${activeTab === 'dashboard' 
                ? (theme === 'light' 
                    ? 'bg-[#2563eb]/10 border border-[#2563eb]/30 text-[#2563eb] shadow-sm' 
                    : 'bg-[#8ed5ff]/10 border border-[#8ed5ff]/30 text-white shadow-md') 
                : (theme === 'light'
                    ? 'text-[#475569] hover:bg-slate-50 hover:text-[#2563eb] border border-transparent'
                    : 'text-[#bdc8d1] hover:bg-white/5 hover:text-white border border-transparent')}`}
          >
            <TrendingUp className={`w-4 h-4 shrink-0 ${theme === 'light' ? 'text-[#2563eb]' : 'text-[#8ed5ff]'}`} />
            {sidebarOpen && <span className="truncate">Live Stats Dashboard</span>}
          </button>

          {/* 3. Product / Material Master */}
          <button
            onClick={() => { setActiveTab('materials'); setMobileSidebarExpanded(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold font-sans transition-all duration-200 cursor-pointer
              ${activeTab === 'materials' 
                ? (theme === 'light' 
                    ? 'bg-[#2563eb]/10 border border-[#2563eb]/30 text-[#2563eb] shadow-sm' 
                    : 'bg-[#8ed5ff]/10 border border-[#8ed5ff]/30 text-white shadow-md') 
                : (theme === 'light'
                    ? 'text-[#475569] hover:bg-slate-50 hover:text-[#2563eb] border border-transparent'
                    : 'text-[#bdc8d1] hover:bg-white/5 hover:text-white border border-transparent')}`}
          >
            <Boxes className={`w-4 h-4 shrink-0 ${theme === 'light' ? 'text-[#2563eb]' : 'text-[#8ed5ff]'}`} />
            {sidebarOpen && <span className="truncate">Material Master</span>}
          </button>

          {/* 4. GRN Inward */}
          <button
            onClick={() => { setActiveTab('grn'); setMobileSidebarExpanded(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold font-sans transition-all duration-200 cursor-pointer
              ${activeTab === 'grn' 
                ? (theme === 'light' 
                    ? 'bg-[#2563eb]/10 border border-[#2563eb]/30 text-[#2563eb] shadow-sm' 
                    : 'bg-[#8ed5ff]/10 border border-[#8ed5ff]/30 text-white shadow-md') 
                : (theme === 'light'
                    ? 'text-[#475569] hover:bg-slate-50 hover:text-[#2563eb] border border-transparent'
                    : 'text-[#bdc8d1] hover:bg-white/5 hover:text-white border border-transparent')}`}
          >
            <FileSpreadsheet className={`w-4 h-4 shrink-0 ${theme === 'light' ? 'text-[#2563eb]' : 'text-[#8ed5ff]'}`} />
            {sidebarOpen && <span className="truncate">Inward Register</span>}
          </button>

          {/* 5. QC Inspection Desk */}
          <button
            onClick={() => { setActiveTab('qc'); setMobileSidebarExpanded(false); }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold font-sans transition-all duration-200 cursor-pointer
              ${activeTab === 'qc' 
                ? (theme === 'light' 
                    ? 'bg-[#2563eb]/10 border border-[#2563eb]/30 text-[#2563eb]' 
                    : 'bg-[#aee0ff]/10 border border-[#8ed5ff]/30 text-white') 
                : (theme === 'light'
                    ? 'text-[#475569] hover:bg-slate-50 hover:text-[#2563eb] border border-transparent'
                    : 'text-[#bdc8d1] hover:bg-white/5 hover:text-white border border-transparent')}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Hourglass className={`w-4 h-4 shrink-0 ${theme === 'light' ? 'text-[#2563eb]' : 'text-[#8ed5ff]'}`} />
              {sidebarOpen && <span className="truncate">QC Inspection Desk</span>}
            </div>
            {sidebarOpen && grns.filter(g => g.qcStatus === 'Pending').length > 0 && (
              <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border animate-pulse shrink-0 ${
                theme === 'light'
                  ? 'bg-amber-100 text-amber-850 border-amber-300'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}>
                {grns.filter(g => g.qcStatus === 'Pending').length}
              </span>
            )}
          </button>

          {/* 6. Stock Master */}
          <button
            onClick={() => { setActiveTab('inventory'); setMobileSidebarExpanded(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold font-sans transition-all duration-200 cursor-pointer
              ${activeTab === 'inventory' 
                ? (theme === 'light' 
                    ? 'bg-[#2563eb]/10 border border-[#2563eb]/30 text-[#2563eb] shadow-sm' 
                    : 'bg-[#8ed5ff]/10 border border-[#8ed5ff]/30 text-white') 
                : (theme === 'light'
                    ? 'text-[#475569] hover:bg-slate-50 hover:text-[#2563eb] border border-transparent'
                    : 'text-[#bdc8d1] hover:bg-white/5 hover:text-white border border-transparent')}`}
          >
            <Database className={`w-4 h-4 shrink-0 ${theme === 'light' ? 'text-[#2563eb]' : 'text-[#8ed5ff]'}`} />
            {sidebarOpen && <span className="truncate">Inventory Master</span>}
          </button>

          {/* 7. Outward Issue */}
          <button
            onClick={() => { setActiveTab('outward'); setMobileSidebarExpanded(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold font-sans transition-all duration-200 cursor-pointer
              ${activeTab === 'outward' 
                ? (theme === 'light' 
                    ? 'bg-[#2563eb]/10 border border-[#2563eb]/30 text-[#2563eb]' 
                    : 'bg-[#8ed5ff]/10 border border-[#8ed5ff]/30 text-white') 
                : (theme === 'light'
                    ? 'text-[#475569] hover:bg-slate-50 hover:text-[#2563eb] border border-transparent'
                    : 'text-[#bdc8d1] hover:bg-white/5 hover:text-white border border-transparent')}`}
          >
            <Layers className={`w-4 h-4 shrink-0 ${theme === 'light' ? 'text-[#2563eb]' : 'text-[#8ed5ff]'}`} />
            {sidebarOpen && <span className="truncate">Outward Register</span>}
          </button>

          {/* 8. User Management (Only Admin) */}
          {currentUser.role === 'Admin' && (
            <button
              onClick={() => { setActiveTab('users'); setMobileSidebarExpanded(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold font-sans transition-all duration-200 cursor-pointer
                ${activeTab === 'users' 
                  ? (theme === 'light' 
                      ? 'bg-[#2563eb]/10 border border-[#2563eb]/30 text-[#2563eb]' 
                      : 'bg-[#8ed5ff]/10 border border-[#8ed5ff]/30 text-white') 
                  : (theme === 'light'
                      ? 'text-[#475569] hover:bg-slate-50 hover:text-[#2563eb] border border-transparent'
                      : 'text-[#bdc8d1] hover:bg-white/5 hover:text-white border border-transparent')}`}
            >
              <Users className={`w-4 h-4 shrink-0 ${theme === 'light' ? 'text-[#2563eb]' : 'text-[#8ed5ff]'}`} />
              {sidebarOpen && <span className="truncate">User Credentials</span>}
            </button>
          )}

          {/* --- NEW SIDEBAR LINKS --- */}
          <div className={`text-[9px] font-bold uppercase tracking-widest px-3.5 pt-4 mb-2 border-t block ${
            theme === 'light' ? 'border-slate-100 text-[#475569]' : 'border-white/5 text-[#87929a]'
          }`}>
            {sidebarOpen ? 'Identity & Settings' : '⚙️'}
          </div>

          {/* 9. Profile Button */}
          <button
            onClick={() => { setActiveTab('profile'); setMobileSidebarExpanded(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold font-sans transition-all duration-200 cursor-pointer
              ${activeTab === 'profile' 
                ? (theme === 'light' 
                    ? 'bg-[#2563eb]/10 border border-[#2563eb]/30 text-[#2563eb]' 
                    : 'bg-[#8ed5ff]/10 border border-[#8ed5ff]/30 text-white') 
                : (theme === 'light'
                    ? 'text-[#475569] hover:bg-slate-50 hover:text-[#2563eb] border border-transparent'
                    : 'text-[#bdc8d1] hover:bg-white/5 hover:text-white border border-transparent')}`}
          >
            <Building2 className="w-4 h-4 text-emerald-500 shrink-0" />
            {sidebarOpen && (
              <div className="text-left font-sans">
                <span className={`block truncate text-xs ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>Company Profile</span>
                <span className={`block text-[8px] font-normal font-sans -mt-0.5 truncate ${theme === 'light' ? 'text-[#64748b]' : 'text-[#87929a]'}`}>GST & Address details</span>
              </div>
            )}
          </button>

          {/* 10. Setting Button */}
          <button
            onClick={() => { setActiveTab('settings'); setMobileSidebarExpanded(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold font-sans transition-all duration-200 cursor-pointer
              ${activeTab === 'settings' 
                ? (theme === 'light' 
                    ? 'bg-[#2563eb]/10 border border-[#2563eb]/30 text-[#2563eb]' 
                    : 'bg-[#8ed5ff]/10 border border-[#8ed5ff]/30 text-white') 
                : (theme === 'light'
                    ? 'text-[#475569] hover:bg-slate-50 hover:text-[#2563eb] border border-transparent'
                    : 'text-[#bdc8d1] hover:bg-white/5 hover:text-white border border-transparent')}`}
          >
            <Sliders className="w-4 h-4 text-pink-500 shrink-0" />
            {sidebarOpen && (
              <div className="text-left font-sans">
                <span className={`block truncate text-xs ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>System Settings</span>
                <span className={`block text-[8px] font-normal font-sans -mt-0.5 truncate ${theme === 'light' ? 'text-[#64748b]' : 'text-[#87929a]'}`}>Rule guards & Resets</span>
              </div>
            )}
          </button>

        </nav>

        {/* Sidebar Footer User detail card */}
        <div className={`p-4 border-t shrink-0 transition-colors ${
          theme === 'light' ? 'bg-slate-50 border-slate-100' : 'bg-[#0c1527] border-white/10'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold shrink-0 border ${
              theme === 'light'
                ? 'bg-[#2563eb]/10 border-[#2563eb]/25 text-[#2563eb]'
                : 'bg-[#ffb9d8]/10 border border-[#ffb9d8]/20 text-[#ffb9d8]'
            }`}>
              {currentUser.name ? currentUser.name.substring(0, 2).toUpperCase() : 'US'}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <span className={`block font-bold text-xs truncate ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>{currentUser.name}</span>
                <span className={`block text-[9px] font-mono tracking-wider uppercase truncate ${theme === 'light' ? 'text-[#64748b]' : 'text-[#87929a]'}`}>{currentUser.role}</span>
              </div>
            )}
          </div>
          {sidebarOpen ? (
            <>
              <button
                onClick={handleLogout}
                className={`mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 border text-xs font-bold rounded-xl transition cursor-pointer ${
                  theme === 'light'
                    ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-650'
                    : 'bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/35 text-rose-350'
                }`}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out Session</span>
              </button>
              <div className="mt-3.5 pt-2.5 border-t border-dashed border-slate-200/50 dark:border-white/5 flex flex-col items-center justify-center text-[10px] text-center font-mono tracking-wide">
                <span className={theme === 'light' ? 'text-slate-500 font-medium' : 'text-stone-400 font-medium'}>
                  System Version: <strong className="font-extrabold text-slate-700 dark:text-stone-200">v3.2.0</strong>
                </span>
                <span className={`mt-0.5 text-[9px] ${theme === 'light' ? 'text-slate-400 font-normal' : 'text-stone-500 font-normal'}`}>
                  Created by: <span className="font-semibold text-indigo-600 dark:text-[#8ed5ff]">Developer Smt_Gajjar</span>
                </span>
              </div>
            </>
          ) : (
            <div className="mt-4 flex flex-col items-center justify-center text-[8px] font-mono opacity-60">
              <span>v3.2.0</span>
              <span className="font-bold text-indigo-600 dark:text-[#8ed5ff]">SG</span>
            </div>
          )}
        </div>
      </aside>

      {/* Backdrop for mobile drawer */}
      {mobileSidebarExpanded && (
        <div 
          onClick={() => setMobileSidebarExpanded(false)}
          className="fixed inset-0 bg-black/60 z-45 md:hidden"
        />
      )}

      {/* 2. Main Container holding Upper header, Subnav, Workspace Body */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Upper Universal Header with Glass backdrop-blur */}
        <header className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors ${
          theme === 'light' 
            ? 'bg-white/85 border-[#e2e8f0] shadow-sm text-slate-800' 
            : 'bg-[#0b1326]/75 border-white/10 shadow-lg text-white'
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              
              {/* Dynamic Hamburger menu (mobile) & Collapse button feedback */}
              <div className="flex items-center gap-2">
                <button
                  id="mobile-hamburger-btn"
                  onClick={() => setMobileSidebarExpanded(true)}
                  className={`md:hidden p-2 rounded-xl border shrink-0 transition-colors ${
                    theme === 'light' 
                      ? 'hover:bg-slate-100 text-[#2563eb] border-[#cbd5e1]' 
                      : 'hover:bg-white/10 text-[#8ed5ff] border-white/10'
                  }`}
                  title="Toggle Menu Drawer"
                >
                  <Menu className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-2">
                  <Database className={`w-5 h-5 ${theme === 'light' ? 'text-[#2563eb]' : 'text-[#8ed5ff]'}`} />
                  <span className={`font-extrabold text-sm sm:text-base tracking-tight font-sans ${
                    theme === 'light' ? 'text-slate-800' : 'text-white'
                  }`}>
                    {(companyProfile?.companyName && companyProfile.companyName.trim() !== '' && companyProfile.companyName !== 'NovaStream Pharmaceutical Industries' && companyProfile.companyName !== 'NovaStream Pharma') ? companyProfile.companyName : 'Inventory Master'}
                  </span>
                </div>
              </div>

              {/* Middle Live Sync Indicator as custom cyber pill */}
              <div className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full border transition-colors ${
                theme === 'light' 
                  ? 'bg-slate-100 border-[#e2e8f0]' 
                  : 'bg-white/5 border-white/10'
              }`}>
                {isDBActive ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest font-mono ${
                      theme === 'light' ? 'text-emerald-700' : 'text-emerald-300'
                    }`}>
                      Cloud Firestore DB Synced
                    </span>
                  </>
                ) : (
                  <>
                    <span className={`w-2 h-2 rounded-full animate-pulse ${
                      theme === 'light' ? 'bg-[#2563eb]' : 'bg-[#8ed5ff]'
                    }`}></span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest font-mono ${
                      theme === 'light' ? 'text-[#2563eb]' : 'text-[#8ed5ff]'
                    }`}>
                      Local Sandbox Live
                    </span>
                  </>
                )}
              </div>

              {/* Profile details preview with Night Light button */}
              <div className="flex items-center gap-4">

                {/* Quick Add Entry Dropdown */}
                <div className="relative group">
                  <button
                    className={`p-2 rounded-xl border transition flex items-center gap-1.5 cursor-pointer text-xs font-bold ${
                      theme === 'light'
                        ? 'bg-[#2563eb] border-[#2563eb] text-white hover:bg-[#1d4ed8]'
                        : 'bg-[#8ed5ff] border-[#8ed5ff] text-[#0b1326] hover:bg-[#a6e0ff]'
                    }`}
                    title="Add new inward/outward entry"
                  >
                    <PlusCircle className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline font-bold">New Entry</span>
                  </button>
                  {/* Dropdown Menu on Hover */}
                  <div className={`absolute right-0 mt-2 w-48 rounded-xl shadow-xl border overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 ${
                    theme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#131d34] border-white/10 text-white'
                  }`}>
                    <div className="p-1">
                      <button
                        onClick={() => {
                          setActiveTab('grn');
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 ${
                          theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-white/5'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        New Inward (GRN)
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('outward');
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 ${
                          theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-white/5'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        New Outward Issue
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Night Light Theme Toggle Button */}
                <button
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  className={`p-2 rounded-xl border transition flex items-center gap-1.5 cursor-pointer text-xs font-bold ${
                    theme === 'light'
                      ? 'bg-slate-50 hover:bg-slate-100 border-[#cbd5e1] hover:border-[#2563eb] text-[#2563eb]'
                      : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#8ed5ff] text-[#8ed5ff]'
                  }`}
                  title="Toggle Light / Dark mode (Night Light)"
                >
                  {theme === 'light' ? (
                    <>
                      <Moon className="w-4 h-4 text-slate-700" />
                      <span className="text-slate-750 font-sans hidden sm:inline font-bold">Night Mode</span>
                    </>
                  ) : (
                    <>
                      <Sun className="w-4 h-4 text-amber-300" />
                      <span className="text-amber-350 font-sans hidden sm:inline font-bold">Night Light</span>
                    </>
                  )}
                </button>

                <div className="text-right hidden xs:block">
                  <div className={`text-xs font-bold flex items-center justify-end gap-1 font-mono ${
                    theme === 'light' ? 'text-slate-800' : 'text-white'
                  }`}>
                    <UserIcon className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-[#2563eb]' : 'text-[#8ed5ff]'}`} />
                    <span>{currentUser.name}</span>
                  </div>
                  <div className={`text-[9px] font-bold uppercase tracking-widest block mt-0.5 ${
                    theme === 'light' ? 'text-[#475569]' : 'text-[#87929a]'
                  }`}>
                    ROLE: <span className="text-[#ffb9d8]">{currentUser.role}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </header>

        {/* Navigation Subbar (Dynamic Breadcrumb Navigation) */}
        {activeTab !== 'home' && (
          <nav className={`py-3 px-4 sticky top-16 z-30 shadow-sm backdrop-blur-md border-b transition-colors ${
            theme === 'light' 
              ? 'bg-white/95 border-[#e2e8f0]' 
              : 'bg-[#131b2e]/90 border-white/10 shadow-2xl'
          }`}>
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              
              {/* Back to Modules launcher button */}
              <button
                onClick={() => setActiveTab('home')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border shadow-sm shrink-0 ${
                  theme === 'light' 
                    ? 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white border-[#2563eb] hover:shadow-md' 
                    : 'bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-[#8ed5ff]'
                }`}
                title="Return to Main Menu Tiles Grid"
              >
                <LayoutGrid className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-white' : 'text-[#8ed5ff]'}`} />
                <span>&larr; Back to Modules</span>
              </button>

              {/* Context breadcrumb info */}
              <div className="flex items-center gap-2">
                <span className={`text-[10px] uppercase font-bold font-mono tracking-widest hidden xs:block ${
                  theme === 'light' ? 'text-[#475569]' : 'text-[#87929a]'
                }`}>
                  Workspace Node:
                </span>
                <span className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-tight border uppercase font-mono transition-colors ${
                  theme === 'light' 
                    ? 'bg-[#2563eb]/5 text-[#2563eb] border-[#2563eb]/20' 
                    : 'bg-[#8ed5ff]/10 text-[#8ed5ff] border border-[#8ed5ff]/20'
                }`}>
                  {activeTab === 'dashboard' && '📈 Dashboard'}
                  {activeTab === 'materials' && '📦 Material Master'}
                  {activeTab === 'grn' && '📥 Inward Register'}
                  {activeTab === 'qc' && `🧪 QC Inspection Desk (${grns.filter(g => g.qcStatus === 'Pending').length} Pending)`}
                  {activeTab === 'inventory' && '📊 Inventory Master'}
                  {activeTab === 'outward' && '📤 Outward Register'}
                  {activeTab === 'users' && '👥 User Credentials Accounts'}
                  {activeTab === 'profile' && '👥 Company Profile'}
                  {activeTab === 'settings' && '⚙️ System Settings'}
                </span>
              </div>

            </div>
          </nav>
        )}

        {/* Main Workspace Frame */}
        <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {renderTabContent()}
          </div>
        </main>

        {/* Footer message */}
        <footer className={`py-8 text-center text-[10px] space-y-2 border-t max-w-6xl mx-auto w-full transition-colors ${
          theme === 'light' ? 'border-[#e2e8f0] text-[#475569]' : 'border-white/5 text-[#87929a]'
        }`}>
          <p className="text-xs font-medium font-sans">
            Active Workspace Session: <span className={`font-bold ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>{currentUser.name}</span> • Role: <span className="font-bold text-[#ffb9d8]">{currentUser.role}</span>
          </p>
          <p className="font-mono text-[9px] opacity-80">
            Inventory Manager &copy; 2026. Made live via GitHub Integration. Made By Smt_Gajjar. Compatible on all multi-devices.
          </p>
        </footer>
      </div>

    </div>
  );
}
