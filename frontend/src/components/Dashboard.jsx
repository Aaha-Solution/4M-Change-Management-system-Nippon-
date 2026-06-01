/* eslint-disable react-hooks/set-state-in-effect, react-hooks/purity */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChanges, updateChangeStatus, getEffectivenessLogs, getNotifications } from '../api/apiRoutes';
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
  X,
  CheckCheck,
  ListTodo,
  Bell,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

import { DashboardOverview } from './DashboardOverview';
import { NewRequest } from './NewRequest';
import { AllRequests } from './AllRequests';
import { L1Request } from './L1Request';
import { L3RequestTracker } from './L3RequestTracker';
import { L2Validation } from './L2Validation';
import { Effectiveness } from './Effectiveness';
import { Reports } from './Reports';
import { AuditLog } from './AuditLog';
import { Users } from './Users';
import { Settings } from './Settings';
import { Notifications } from './Notifications';
import nipponLogo from '../assets/Nippon Logo.png';

export const Dashboard = ({ userEmail, userRole, onSignOut }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'new-request' | 'all-requests' | 'approvals' | 'effectiveness' | 'reports' | 'audit-log' | 'users' | 'settings' | 'notifications'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [levelOpen, setLevelOpen] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [isFetchingNotifications, setIsFetchingNotifications] = useState(false);

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

  // Fetch notifications from backend
  const fetchNotifications = async () => {
    setIsFetchingNotifications(true);
    try {
      const response = await getNotifications();
      setNotifications(response.data);
    } catch (error) {
      console.error(error);
      setToastMsg('Error loading notifications from server.');
    } finally {
      setIsFetchingNotifications(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('cms_token') || sessionStorage.getItem('cms_token');
    if (token) {
      fetchChanges();
      fetchEffectiveness();
      fetchNotifications();
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
          <nav className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-160px)]">

            {/* Dashboard */}
            <button
              onClick={() => handleTabChange('dashboard')}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer rounded-lg ${activeTab === 'dashboard'
                  ? 'bg-sky-50 text-[#0066cc]'
                  : 'text-slate-655 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
              <div className="flex items-center gap-3">
                <LayoutGrid size={18} className={activeTab === 'dashboard' ? 'text-[#0066cc]' : 'text-slate-400'} />
                <span>Dashboard</span>
              </div>
            </button>

            {/* All Requests */}
            <button
              onClick={() => handleTabChange('all-requests')}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer rounded-lg ${activeTab === 'all-requests'
                  ? 'bg-sky-50 text-[#0066cc]'
                  : 'text-slate-655 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
              <div className="flex items-center gap-3">
                <ClipboardList size={18} className={activeTab === 'all-requests' ? 'text-[#0066cc]' : 'text-slate-400'} />
                <span>All Requests</span>
              </div>
            </button>

            {/* Level Expandable */}
            <div className="space-y-0.5">
              <button
                onClick={() => setLevelOpen(!levelOpen)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer rounded-lg ${(activeTab === 'l1' || activeTab === 'approvals' || activeTab === 'new-request')
                    ? 'bg-sky-50 text-[#0066cc]'
                    : 'text-slate-655 hover:text-slate-900 hover:bg-slate-50'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <FilePlus size={18} className={(activeTab === 'l1' || activeTab === 'approvals' || activeTab === 'new-request') ? 'text-[#0066cc]' : 'text-slate-400'} />
                  <span>Level</span>
                </div>
                {levelOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
              </button>

              {/* L1, L2 and L3 Sub-menu */}
              {levelOpen && (
                <div className="pl-6 space-y-0.5 border-l border-slate-100 ml-5 py-1">
                  {/* L1 */}
                  <button
                    onClick={() => handleTabChange('l1')}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-all duration-200 cursor-pointer rounded-lg ${activeTab === 'l1'
                        ? 'bg-sky-50/70 text-[#0066cc]'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckCircle size={14} className={activeTab === 'l1' ? 'text-[#0066cc]' : 'text-slate-400'} />
                      <span>L1</span>
                    </div>
                  </button>

                  {/* L2 */}
                  <button
                    onClick={() => handleTabChange('approvals')}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-all duration-200 cursor-pointer rounded-lg ${activeTab === 'approvals'
                        ? 'bg-sky-50/70 text-[#0066cc]'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckCheck size={14} className={activeTab === 'approvals' ? 'text-[#0066cc]' : 'text-slate-400'} />
                      <span>L2</span>
                    </div>
                  </button>

                  {/* L3 */}
                  <button
                    onClick={() => handleTabChange('l3')}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-all duration-200 cursor-pointer rounded-lg ${activeTab === 'l3'
                        ? 'bg-sky-50/70 text-[#0066cc]'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ListTodo size={14} className={activeTab === 'l3' ? 'text-[#0066cc]' : 'text-slate-400'} />
                      <span>L3</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Effectiveness */}
            <button
              onClick={() => handleTabChange('effectiveness')}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer rounded-lg ${activeTab === 'effectiveness'
                  ? 'bg-sky-50 text-[#0066cc]'
                  : 'text-slate-655 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
              <div className="flex items-center gap-3">
                <TrendingUp size={18} className={activeTab === 'effectiveness' ? 'text-[#0066cc]' : 'text-slate-400'} />
                <span>Effectiveness</span>
              </div>
            </button>

            {/* Notifications */}
            <button
              onClick={() => handleTabChange('notifications')}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer rounded-lg ${activeTab === 'notifications'
                  ? 'bg-sky-50 text-[#0066cc]'
                  : 'text-slate-655 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
              <div className="flex items-center gap-3">
                <Bell size={18} className={activeTab === 'notifications' ? 'text-[#0066cc]' : 'text-slate-400'} />
                <span>Notifications</span>
              </div>
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span className="w-5 h-5 flex items-center justify-center bg-rose-600 text-white font-bold text-[10px] rounded-full">
                  {notifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>

            {/* Reports */}
            <button
              onClick={() => handleTabChange('reports')}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer rounded-lg ${activeTab === 'reports'
                  ? 'bg-sky-50 text-[#0066cc]'
                  : 'text-slate-655 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
              <div className="flex items-center gap-3">
                <BarChart3 size={18} className={activeTab === 'reports' ? 'text-[#0066cc]' : 'text-slate-400'} />
                <span>Reports</span>
              </div>
            </button>

            {/* Audit Log */}
            <button
              onClick={() => handleTabChange('audit-log')}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer rounded-lg ${activeTab === 'audit-log'
                  ? 'bg-sky-50 text-[#0066cc]'
                  : 'text-slate-655 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck size={18} className={activeTab === 'audit-log' ? 'text-[#0066cc]' : 'text-slate-400'} />
                <span>Audit Log</span>
              </div>
            </button>

            {/* Users */}
            <button
              onClick={() => handleTabChange('users')}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer rounded-lg ${activeTab === 'users'
                  ? 'bg-sky-50 text-[#0066cc]'
                  : 'text-slate-655 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
              <div className="flex items-center gap-3">
                <UsersIcon size={18} className={activeTab === 'users' ? 'text-[#0066cc]' : 'text-slate-400'} />
                <span>Users</span>
              </div>
            </button>

            {/* Settings */}
            <button
              onClick={() => handleTabChange('settings')}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer rounded-lg ${activeTab === 'settings'
                  ? 'bg-sky-50 text-[#0066cc]'
                  : 'text-slate-655 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
              <div className="flex items-center gap-3">
                <SettingsIcon size={18} className={activeTab === 'settings' ? 'text-[#0066cc]' : 'text-slate-400'} />
                <span>Settings</span>
              </div>
            </button>

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
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-[24px] py-[16px] flex items-center justify-between">
          <div className="flex items-center gap-[12px]">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-[8px] text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-[8px]"
            >
              <Menu size={20} />
            </button>
            <div>
              <h2 className="font-heading text-[22px] font-bold text-slate-900">
                {activeTab === 'dashboard' ? 'Overview' :
                  activeTab === 'new-request' ? 'Request New Change' :
                  activeTab === 'approvals' ? 'L2 Validation Workflow' :
                  activeTab === 'notifications' ? 'Notifications Feed' :
                  activeTab === 'l1' ? 'L1 Approvals' :
                  activeTab === 'l3' ? 'L3 Request Tracker & Final Approval' :
                  activeTab === 'all-requests' ? 'All Change Requests' :
                  activeTab.replace('-', ' ')}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-[16px]">
            {/* Email always visible */}
            <span className="text-[14px] font-medium text-slate-600 hidden sm:inline">{userEmail}</span>

            {/* Request Change button - only on dashboard tab */}
            {activeTab === 'dashboard' && (
              <button
                onClick={() => handleTabChange('new-request')}
                className="hidden sm:flex items-center gap-[4px] bg-sky-50 border border-sky-100 hover:bg-sky-100 text-[#0066cc] px-[12px] py-[6px] rounded-[8px] text-[12px] font-bold transition-all cursor-pointer"
              >
                <Plus size={12} />
                <span>Request Change</span>
              </button>
            )}

            {/* Bell icon - only on dashboard tab */}
            {activeTab === 'dashboard' && (
              <button
                onClick={() => handleTabChange('notifications')}
                className="relative p-[8px] text-slate-600 hover:text-[#0066cc] bg-slate-100 hover:bg-slate-200/50 rounded-full transition-colors cursor-pointer"
              >
                <Bell size={20} />
                <span className="absolute -top-[2px] -right-[2px] w-[18px] h-[18px] flex items-center justify-center bg-rose-600 text-white font-bold text-[9px] rounded-full border-2 border-white">
                  1
                </span>
              </button>
            )}

            {/* Sign Out button - always visible */}
            <button
              onClick={handleLocalSignOut}
              title="Sign Out"
              className="flex items-center gap-[6px] bg-white border border-slate-250 hover:bg-rose-50 hover:border-rose-500 hover:text-rose-600 text-slate-600 px-[14px] py-[6px] rounded-[8px] text-[12px] font-semibold cursor-pointer transition-colors"
            >
              <LogOut size={12} />
              <span>Sign Out</span>
            </button>
            
            {/* Nippon Logo in assets */}
            <div className="pl-[8px] border-l border-slate-200">
              <img src={nipponLogo} alt="Nippon Logo" className="h-[32px] w-auto object-contain select-none" />
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-grow py-[24px] px-[24px] w-full max-w-none">

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
            <L2Validation
              userRole={userRole}
              setToastMsg={setToastMsg}
              fetchChanges={fetchChanges}
            />
          )}

          {/* TAB: L1 REQUEST */}
          {activeTab === 'l1' && (
            <L1Request
              userEmail={userEmail}
              onTabChange={handleTabChange}
              changes={changes}
              setChanges={setChanges}
              logAction={logAction}
              setToastMsg={setToastMsg}
              onLocalSignOut={handleLocalSignOut}
            />
          )}

          {/* TAB: L3 REQUEST TRACKER */}
          {activeTab === 'l3' && (
            <L3RequestTracker
              userEmail={userEmail}
              userRole={userRole}
              logAction={logAction}
              setToastMsg={setToastMsg}
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

          {/* TAB: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <Notifications
              setToastMsg={setToastMsg}
              notifications={notifications}
              setNotifications={setNotifications}
              fetchNotifications={fetchNotifications}
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
