/* eslint-disable react-hooks/set-state-in-effect, react-hooks/purity */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChanges, updateChangeStatus, getEffectivenessLogs } from '../api/apiRoutes';
import {
  LogOut,
  GitPullRequest,
  CheckCircle,
  Clock,
  TrendingUp,
  Plus,
  ShieldCheck,
  Zap,
  Loader2,
  Users as UsersIcon,
  LayoutGrid,
  FilePlus,
  ClipboardList,
  CheckSquare,
  BarChart3,
  Settings as SettingsIcon,
  Menu,
  X
} from 'lucide-react';

import { DashboardOverview } from './DashboardOverview';
import { NewRequest } from './NewRequest';
import { AllRequests } from './AllRequests';
import { Approvals } from './Approvals';
import { Effectiveness } from './Effectiveness';
import { Reports } from './Reports';
import { AuditLog } from './AuditLog';
import { Users } from './Users';
import { Settings } from './Settings';

export const Dashboard = ({ userEmail, userRole, onSignOut }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'new-request' | 'all-requests' | 'approvals' | 'effectiveness' | 'reports' | 'audit-log' | 'users' | 'settings'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const handleLocalSignOut = () => {
    logAction('Sign Out', 'User logged out of the system.');
    onSignOut();
    navigate('/');
  };
  
  // Database States
  const [changes, setChanges] = useState([]);
  const [isFetchingChanges, setIsFetchingChanges] = useState(false);
  
  // Global Toast State
  const [toastMsg, setToastMsg] = useState(null);

  // Audit Logs State (using localStorage with seed data)
  const [auditLogs, setAuditLogs] = useState(() => {
    const stored = localStorage.getItem('cms_audit_logs');
    if (stored) return JSON.parse(stored);
    const defaultAudit = [
      {
        id: 'AUD-001',
        timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hr ago
        action: 'User Login',
        user: 'admin@cms.com',
        details: 'Successfully authenticated as Administrator.'
      },
      {
        id: 'AUD-002',
        timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hrs ago
        action: 'Status Updated',
        user: 'manager@cms.com',
        details: 'Approved change request CHG-8901.'
      },
      {
        id: 'AUD-003',
        timestamp: new Date(Date.now() - 10800000).toISOString(), // 3 hrs ago
        action: 'Change Created',
        user: 'requester@cms.com',
        details: 'Created new change request CHG-8899.'
      },
      {
        id: 'AUD-004',
        timestamp: new Date(Date.now() - 14400000).toISOString(), // 4 hrs ago
        action: 'Status Updated',
        user: 'admin@cms.com',
        details: 'Marked change request CHG-8895 as Completed.'
      }
    ];
    localStorage.setItem('cms_audit_logs', JSON.stringify(defaultAudit));
    return defaultAudit;
  });

  // Effectiveness Monitoring State (loaded from backend API)
  const [effectivenessLogs, setEffectivenessLogs] = useState([]);
  const [isFetchingEffectiveness, setIsFetchingEffectiveness] = useState(false);

  // Helper to log audit actions
  const logAction = (action, details) => {
    const newLog = {
      id: `AUD-${Date.now().toString().substring(7)}`,
      timestamp: new Date().toISOString(),
      action,
      user: userEmail || 'system',
      details
    };
    setAuditLogs(prev => {
      const updated = [newLog, ...prev];
      localStorage.setItem('cms_audit_logs', JSON.stringify(updated));
      return updated;
    });
  };

  // Fetch changes from the backend
  const fetchChanges = async () => {
    setIsFetchingChanges(true);
    try {
      const response = await getChanges();
      setChanges(response.data);
    } catch (error) {
      console.error(error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        handleLocalSignOut();
      } else {
        setToastMsg('Error loading changes from backend.');
      }
    } finally {
      setIsFetchingChanges(false);
    }
  };

  // Fetch initial data
  // Fetch effectiveness logs from backend
  const fetchEffectiveness = async () => {
    setIsFetchingEffectiveness(true);
    try {
      const response = await getEffectivenessLogs();
      setEffectivenessLogs(response.data);
    } catch (error) {
      console.error(error);
      setToastMsg('Error loading effectiveness logs from server.');
    } finally {
      setIsFetchingEffectiveness(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('cms_token') || sessionStorage.getItem('cms_token');
    if (token) {
      fetchChanges();
      fetchEffectiveness();
      logAction('Session Started', `User initialized session with role: ${userRole}`);
    } else {
      navigate('/', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // Clear toast notifications
  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  // Update a Change Status (Approvals)
  const handleStatusUpdate = async (id, status) => {
    try {
      await updateChangeStatus(id, status);
      setChanges(prev => prev.map(c => c.id === id ? { ...c, status } : c));
      setToastMsg(`Updated ${id} to ${status}`);
      logAction('Status Updated', `Moved change request ${id} status to "${status}".`);
    } catch (error) {
      console.error(error);
      setToastMsg('Error updating status on server.');
    }
  };

  // Compile metrics dynamically for approvals badge
  const pendingCount = changes.filter(c => c.status === 'Pending').length;
  const evaluatingCount = changes.filter(c => c.status === 'Evaluating').length;

  // Sidebar Menu Config
  const navigationItems = [
    {
      group: 'MAIN',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
        { id: 'new-request', label: 'New Request', icon: FilePlus },
        { id: 'all-requests', label: 'All Requests', icon: ClipboardList },
        { id: 'approvals', label: 'Approvals', icon: CheckSquare, badge: pendingCount + evaluatingCount }
      ]
    },
    {
      group: 'MONITOR',
      items: [
        { id: 'effectiveness', label: 'Effectiveness', icon: TrendingUp },
        { id: 'reports', label: 'Reports', icon: BarChart3 },
        { id: 'audit-log', label: 'Audit Log', icon: ShieldCheck }
      ]
    },
    {
      group: 'SYSTEM',
      items: [
        { id: 'users', label: 'Users', icon: UsersIcon },
        { id: 'settings', label: 'Settings', icon: SettingsIcon }
      ]
    }
  ];

  // Helper to handle tab select
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans">
      
      {/* 1. Sidebar Left Panel */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transform transition-transform duration-300 md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Sidebar Header Logo */}
        <div>
          <div className="px-6 py-5 flex items-center justify-between border-b border-slate-200">
            <div>
              <h1 className="font-heading text-2xl font-extrabold tracking-tight text-[#0066cc] flex items-center gap-2">
                <GitPullRequest size={22} className="text-[#0066cc]" />
                4M·CMS
              </h1>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-0.5">Change Management</p>
            </div>
            {/* Mobile close button */}
            <button onClick={() => setMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-slate-700">
              <X size={20} />
            </button>
          </div>

          {/* Navigation Links Group */}
          <nav className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-160px)]">
            {navigationItems.map((group) => (
              <div key={group.group} className="space-y-1">
                <h3 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">{group.group}</h3>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const IconComponent = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => handleTabChange(item.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium transition-all duration-200 cursor-pointer ${
                            isActive
                              ? 'bg-sky-50 text-[#0066cc] rounded-lg'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <IconComponent size={18} className={isActive ? 'text-[#0066cc]' : 'text-slate-400'} />
                            <span>{item.label}</span>
                          </div>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-[#0066cc]/10 text-[#0066cc]' : 'bg-slate-100 text-slate-600'}`}>
                              {item.badge}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer User Details */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-sky-100 text-[#0066cc] flex items-center justify-center font-bold text-sm">
                {(userRole || 'A')[0]}
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-slate-800 leading-tight max-w-[130px] truncate" title={userEmail}>
                  {userEmail ? userEmail.split('@')[0] : 'Admin'}
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {userRole || 'Administrator'}
                </span>
              </div>
            </div>
            {/* Logout button */}
            <button
              onClick={handleLocalSignOut}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Main Content Right Panel */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
            >
              <Menu size={20} />
            </button>
            <div>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-slate-900">
                {activeTab === 'dashboard' ? 'Dashboard Overview' : activeTab === 'new-request' ? 'Request New Change' : activeTab.replace('-', ' ')}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-600 hidden sm:inline">{userEmail}</span>
            {activeTab === 'dashboard' && (
              <button
                onClick={() => handleTabChange('new-request')}
                className="hidden sm:flex items-center gap-1 bg-sky-50 border border-sky-100 hover:bg-sky-100 text-[#0066cc] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                <Plus size={12} />
                <span>Request Change</span>
              </button>
            )}
            <button
              onClick={handleLocalSignOut}
              className="flex items-center gap-1.5 bg-white border border-slate-250 hover:bg-rose-50 hover:border-rose-500 hover:text-rose-600 text-slate-600 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              <LogOut size={12} />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-grow p-4 sm:p-6 lg:p-8 w-full max-w-none">
          
          {/* TAB: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <DashboardOverview
              changes={changes}
              isFetchingChanges={isFetchingChanges}
              onTabChange={handleTabChange}
            />
          )}

          {/* TAB: NEW REQUEST */}
          {activeTab === 'new-request' && (
            <NewRequest
              userEmail={userEmail}
              onTabChange={handleTabChange}
              changes={changes}
              setChanges={setChanges}
              logAction={logAction}
              setToastMsg={setToastMsg}
              onLocalSignOut={handleLocalSignOut}
            />
          )}

          {/* TAB: ALL REQUESTS */}
          {activeTab === 'all-requests' && (
            <AllRequests
              changes={changes}
              onTabChange={handleTabChange}
            />
          )}

          {/* TAB: APPROVALS */}
          {activeTab === 'approvals' && (
            <Approvals
              userRole={userRole}
              changes={changes}
              onStatusUpdate={handleStatusUpdate}
            />
          )}

          {/* TAB: EFFECTIVENESS MONITORING */}
          {activeTab === 'effectiveness' && (
            <Effectiveness
              changes={changes}
              effectivenessLogs={effectivenessLogs}
              setEffectivenessLogs={setEffectivenessLogs}
              logAction={logAction}
              setToastMsg={setToastMsg}
            />
          )}

          {/* TAB: REPORTS */}
          {activeTab === 'reports' && (
            <Reports
              changes={changes}
              effectivenessLogs={effectivenessLogs}
            />
          )}

          {/* TAB: AUDIT LOG */}
          {activeTab === 'audit-log' && (
            <AuditLog
              auditLogs={auditLogs}
            />
          )}

          {/* TAB: USERS LIST */}
          {activeTab === 'users' && (
            <Users
              userRole={userRole}
              userEmail={userEmail}
              logAction={logAction}
              setToastMsg={setToastMsg}
              onLocalSignOut={handleLocalSignOut}
            />
          )}

          {/* TAB: SETTINGS */}
          {activeTab === 'settings' && (
            <Settings
              userEmail={userEmail}
              userRole={userRole}
            />
          )}

        </main>
      </div>

      {/* Global Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white rounded-xl px-4 py-3 flex items-center gap-2 shadow-xl z-50 animate-slide-in-right text-xs sm:text-sm font-medium">
          <CheckCircle size={16} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

    </div>
  );
};
