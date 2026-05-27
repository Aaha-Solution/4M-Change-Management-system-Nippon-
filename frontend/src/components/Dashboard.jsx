import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChanges, getUsers, createChange, updateChangeStatus, deleteUser, signup } from '../api/apiRoutes';
import {
  LogOut,
  GitPullRequest,
  CheckCircle,
  Clock,
  TrendingUp,
  Plus,
  ChevronRight,
  ShieldCheck,
  Zap,
  Loader2,
  Users,
  FileText,
  LayoutGrid,
  FilePlus,
  ClipboardList,
  CheckSquare,
  BarChart3,
  Settings,
  Menu,
  X,
  Search,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Info
} from 'lucide-react';

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
  const [users, setUsers] = useState([]);
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);
  
  // Create Change Form States
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState('Medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Global Toast State
  const [toastMsg, setToastMsg] = useState(null);

  // Search & Filter States for "All Requests" tab
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

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

  // Effectiveness Monitoring State (using localStorage with seed data)
  const [effectivenessLogs, setEffectivenessLogs] = useState(() => {
    const stored = localStorage.getItem('cms_effectiveness');
    if (stored) return JSON.parse(stored);
    const defaultEff = [
      {
        id: 'EFF-001',
        changeNo: 'CHG-8902',
        reqDate: '2026-05-20',
        context: 'Upgrade database cluster to PG 16',
        startDate: '2026-05-22',
        monthWise: '2026-05',
        remarks: 'Database performance improved. Read latency reduced by 25%. Replication is stable.',
        attachment: 'db-perf-report.pdf',
        status: 'Effectiveness Ok',
        qaApproval: 'Approved'
      },
      {
        id: 'EFF-002',
        changeNo: 'CHG-8901',
        reqDate: '2026-05-19',
        context: 'Integrate Auth0 SSO provider',
        startDate: '2026-05-20',
        monthWise: '2026-05',
        remarks: 'SSO configuration complete. Active Directory synced successfully. All tests passed.',
        attachment: 'auth0-signoff.png',
        status: 'Effectiveness Ok',
        qaApproval: 'Approved'
      },
      {
        id: 'EFF-003',
        changeNo: 'CHG-8899',
        reqDate: '2026-05-18',
        context: 'Modify API Gateway route rules',
        startDate: '2026-05-19',
        monthWise: '2026-05',
        remarks: 'Response latency slightly increased. Cache hit ratio below expectations.',
        attachment: 'api-gateway-logs.txt',
        status: 'Effectiveness Not Ok',
        qaApproval: 'Rejected'
      }
    ];
    localStorage.setItem('cms_effectiveness', JSON.stringify(defaultEff));
    return defaultEff;
  });

  // Effectiveness Monitoring Form States
  const [effChangeNo, setEffChangeNo] = useState('');
  const [effMonthWise, setEffMonthWise] = useState('2026-05');
  const [effRemarks, setEffRemarks] = useState('');
  const [effAttachment, setEffAttachment] = useState('');
  const [effStatus, setEffStatus] = useState('Effectiveness Ok');
  const [effQaApproval, setEffQaApproval] = useState('Approved');
  const [editingEffLogId, setEditingEffLogId] = useState(null);
  const [deleteEffLogId, setDeleteEffLogId] = useState(null);

  // Search & Filter States for Effectiveness
  const [effSearch, setEffSearch] = useState('');
  const [effFilterStatus, setEffFilterStatus] = useState('All');
  const [effFilterMonth, setEffFilterMonth] = useState('All');

  // Users Tab States
  const [createUserFullName, setCreateUserFullName] = useState('');
  const [createUserEmail, setCreateUserEmail] = useState('');
  const [createUserPassword, setCreateUserPassword] = useState('');
  const [createUserRole, setCreateUserRole] = useState('');
  const [createUserDept, setCreateUserDept] = useState('');
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('All');
  
  const [customRoles, setCustomRoles] = useState(['Admin', 'HOD', 'Operator', 'QA Team', 'Administrator', 'Change Manager', 'Requester']);
  const [customDepts, setCustomDepts] = useState(['Management', 'PED Team', 'Assembly', 'Quality', 'Engineering', 'Operations']);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Create a new user account
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!createUserFullName.trim() || !createUserEmail.trim() || !createUserPassword.trim() || !createUserRole || !createUserDept) {
      setToastMsg('Please fill in all fields.');
      return;
    }
    
    setIsCreatingUser(true);
    try {
      await signup({
        email: createUserEmail.trim(),
        password: createUserPassword.trim(),
        role: createUserRole,
        name: createUserFullName.trim(),
        department: createUserDept
      });
      
      setToastMsg('User account created successfully!');
      logAction('User Registered', `Created account for ${createUserFullName.trim()} (${createUserEmail.trim()}) as ${createUserRole}.`);
      
      // Clear form
      setCreateUserFullName('');
      setCreateUserEmail('');
      setCreateUserPassword('');
      setCreateUserRole('');
      setCreateUserDept('');
      
      // Refresh list
      fetchUsers();
    } catch (err) {
      console.error(err);
      setToastMsg(err.response?.data?.error || 'Error creating user account.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Delete user account
  const handleDeleteUser = async (id, email, name) => {
    if (!window.confirm(`Are you sure you want to delete user "${name || email}"?`)) return;
    try {
      await deleteUser(id);
      setToastMsg('User deleted successfully.');
      logAction('User Deleted', `Removed account for ${name || email} (${email}).`);
      fetchUsers();
    } catch (err) {
      console.error(err);
      setToastMsg('Error deleting user.');
    }
  };

  // Toggle password visibility in the table
  const togglePasswordVisibility = (userId) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Add custom Role
  const handleAddCustomRole = () => {
    const roleName = window.prompt("Enter new custom role name:");
    if (roleName && roleName.trim()) {
      const trimmed = roleName.trim();
      if (!customRoles.includes(trimmed)) {
        setCustomRoles([...customRoles, trimmed]);
      }
      setCreateUserRole(trimmed);
    }
  };

  // Add custom Department
  const handleAddCustomDept = () => {
    const deptName = window.prompt("Enter new custom department name:");
    if (deptName && deptName.trim()) {
      const trimmed = deptName.trim();
      if (!customDepts.includes(trimmed)) {
        setCustomDepts([...customDepts, trimmed]);
      }
      setCreateUserDept(trimmed);
    }
  };


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

  // Fetch all registered users
  const fetchUsers = async () => {
    setIsFetchingUsers(true);
    try {
      const response = await getUsers();
      setUsers(response.data);
    } catch (error) {
      console.error(error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        handleLocalSignOut();
      } else {
        setToastMsg('Error loading users from backend.');
      }
    } finally {
      setIsFetchingUsers(false);
    }
  };

  // Fetch initial data
  useEffect(() => {
    const token = localStorage.getItem('cms_token') || sessionStorage.getItem('cms_token');
    if (token) {
      fetchChanges();
      fetchUsers();
      // Log session start once
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

  // Handle form submission for creating a change request
  const handleCreateChange = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setToastMsg('Please enter a change request title.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await createChange({
        title: newTitle.trim(),
        requester: userEmail,
        priority: newPriority
      });
      const data = response.data;

      setChanges([data.change, ...changes]);
      setToastMsg(`Created request: ${data.change.id}`);
      logAction('Change Created', `Successfully registered new change request ${data.change.id}: "${newTitle.trim()}"`);
      
      // Reset form fields
      setNewTitle('');
      setNewPriority('Medium');
      // Navigate back to overview to see the new request
      setActiveTab('dashboard');
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        handleLocalSignOut();
      } else {
        setToastMsg('Error saving change to server.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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

  // Compile metrics dynamically
  const pendingCount = changes.filter(c => c.status === 'Pending').length;
  const evaluatingCount = changes.filter(c => c.status === 'Evaluating').length;
  const approvedCount = changes.filter(c => c.status === 'Approved').length;
  const completedCount = changes.filter(c => c.status === 'Completed').length;

  // Format month names (e.g. "2026-05" -> "May 2026")
  const formatMonthWise = (val) => {
    if (!val) return "-";
    const parts = val.split("-");
    if (parts.length === 2) {
      const year = parts[0];
      const month = parseInt(parts[1], 10);
      const date = new Date(year, month - 1, 1);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      }
    }
    return val;
  };

  // Formatted date (e.g., "2026-05-20" -> "20 May")
  const formatDateShort = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", { day: 'numeric', month: 'short' });
  };

  // Add or Edit Effectiveness Log
  const handleAddOrEditEff = (e) => {
    e.preventDefault();
    if (!effChangeNo) {
      setToastMsg('Please select a Change Request.');
      return;
    }

    const selectedChange = changes.find(c => c.id === effChangeNo);
    const context = selectedChange ? selectedChange.title : 'External Assessment';
    const reqDate = selectedChange ? selectedChange.date : new Date().toLocaleDateString();
    
    if (editingEffLogId) {
      // Edit mode
      setEffectivenessLogs(prev => {
        const updated = prev.map(log => {
          if (log.id === editingEffLogId) {
            return {
              ...log,
              monthWise: effMonthWise,
              remarks: effRemarks,
              attachment: effAttachment,
              status: effStatus,
              qaApproval: effQaApproval
            };
          }
          return log;
        });
        localStorage.setItem('cms_effectiveness', JSON.stringify(updated));
        return updated;
      });
      logAction('Effectiveness Log Updated', `Modified monitoring metrics for ${effChangeNo}.`);
      setToastMsg(`Updated observations for ${effChangeNo}`);
      handleCancelEditing();
    } else {
      // Create mode
      const newLog = {
        id: `EFF-${Date.now().toString().substring(7)}`,
        changeNo: effChangeNo,
        reqDate: reqDate,
        context: context,
        startDate: new Date().toISOString().split('T')[0],
        monthWise: effMonthWise,
        remarks: effRemarks,
        attachment: effAttachment,
        status: effStatus,
        qaApproval: effQaApproval
      };
      setEffectivenessLogs(prev => {
        const updated = [newLog, ...prev];
        localStorage.setItem('cms_effectiveness', JSON.stringify(updated));
        return updated;
      });
      logAction('Effectiveness Log Created', `Created monitoring observations for change ${effChangeNo}.`);
      setToastMsg(`Log entry added for ${effChangeNo}`);
      
      // Reset form
      setEffChangeNo('');
      setEffRemarks('');
      setEffAttachment('');
    }
  };

  // Edit action
  const handleSelectRowForEdit = (log) => {
    setEditingEffLogId(log.id);
    setEffChangeNo(log.changeNo);
    setEffMonthWise(log.monthWise);
    setEffRemarks(log.remarks);
    setEffAttachment(log.attachment || '');
    setEffStatus(log.status);
    setEffQaApproval(log.qaApproval);
  };

  // Cancel edit
  const handleCancelEditing = () => {
    setEditingEffLogId(null);
    setEffChangeNo('');
    setEffMonthWise('2026-05');
    setEffRemarks('');
    setEffAttachment('');
    setEffStatus('Effectiveness Ok');
    setEffQaApproval('Approved');
  };

  // Delete effectiveness record
  const handleDeleteEff = () => {
    if (!deleteEffLogId) return;
    setEffectivenessLogs(prev => {
      const updated = prev.filter(log => log.id !== deleteEffLogId);
      localStorage.setItem('cms_effectiveness', JSON.stringify(updated));
      return updated;
    });
    logAction('Effectiveness Log Deleted', `Removed observations record ${deleteEffLogId}`);
    setToastMsg(`Deleted entry ${deleteEffLogId}`);
    setDeleteEffLogId(null);
  };

  // Reset to default logs
  const handleResetEffToDefaults = () => {
    localStorage.removeItem('cms_effectiveness');
    const defaultEff = [
      {
        id: 'EFF-001',
        changeNo: 'CHG-8902',
        reqDate: '2026-05-20',
        context: 'Upgrade database cluster to PG 16',
        startDate: '2026-05-22',
        monthWise: '2026-05',
        remarks: 'Database performance improved. Read latency reduced by 25%. Replication is stable.',
        attachment: 'db-perf-report.pdf',
        status: 'Effectiveness Ok',
        qaApproval: 'Approved'
      },
      {
        id: 'EFF-002',
        changeNo: 'CHG-8901',
        reqDate: '2026-05-19',
        context: 'Integrate Auth0 SSO provider',
        startDate: '2026-05-20',
        monthWise: '2026-05',
        remarks: 'SSO configuration complete. Active Directory synced successfully. All tests passed.',
        attachment: 'auth0-signoff.png',
        status: 'Effectiveness Ok',
        qaApproval: 'Approved'
      },
      {
        id: 'EFF-003',
        changeNo: 'CHG-8899',
        reqDate: '2026-05-18',
        context: 'Modify API Gateway route rules',
        startDate: '2026-05-19',
        monthWise: '2026-05',
        remarks: 'Response latency slightly increased. Cache hit ratio below expectations.',
        attachment: 'api-gateway-logs.txt',
        status: 'Effectiveness Not Ok',
        qaApproval: 'Rejected'
      }
    ];
    setEffectivenessLogs(defaultEff);
    localStorage.setItem('cms_effectiveness', JSON.stringify(defaultEff));
    setToastMsg('Effectiveness logs restored to default.');
    logAction('Effectiveness Restored', 'Restored default monitoring records.');
  };

  // Extract unique months for filter
  const uniqueMonths = Array.from(new Set(effectivenessLogs.map(l => formatMonthWise(l.monthWise)))).filter(Boolean);

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
        { id: 'users', label: 'Users', icon: Users },
        { id: 'settings', label: 'Settings', icon: Settings }
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
        <main className="flex-grow p-4 sm:p-6 lg:p-8 max-w-[1200px] w-full mx-auto">
          
          {/* TAB: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fade-in-up">
              {/* Overview Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-heading text-2xl font-bold text-slate-900">Dashboard Overview</h3>
                  <p className="text-slate-500 text-sm">Real-time status summaries and workflow metrics.</p>
                </div>
              </div>

              {/* KPIs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Pending Card */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-11 h-11 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Reviews</h4>
                    <div className="text-2xl font-bold text-slate-900 mt-0.5">
                      {isFetchingChanges ? <Loader2 className="animate-spin text-slate-400" size={20} /> : pendingCount}
                    </div>
                  </div>
                </div>

                {/* Evaluating Card */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-11 h-11 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center flex-shrink-0">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Evaluating</h4>
                    <div className="text-2xl font-bold text-slate-900 mt-0.5">
                      {isFetchingChanges ? <Loader2 className="animate-spin text-slate-400" size={20} /> : evaluatingCount}
                    </div>
                  </div>
                </div>

                {/* Approved Card */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Approved</h4>
                    <div className="text-2xl font-bold text-slate-900 mt-0.5">
                      {isFetchingChanges ? <Loader2 className="animate-spin text-slate-400" size={20} /> : approvedCount}
                    </div>
                  </div>
                </div>

                {/* Success Rate */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-11 h-11 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Success Rate</h4>
                    <div className="text-2xl font-bold text-slate-900 mt-0.5">
                      {completedCount + approvedCount > 0 
                        ? `${Math.round(((completedCount + approvedCount) / (changes.length || 1)) * 1000) / 10}%` 
                        : '100%'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Table card */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center flex-wrap gap-4">
                  <div>
                    <h3 className="font-heading text-lg font-bold text-slate-900">Recent Change Requests</h3>
                    <p className="text-slate-500 text-xs">Latest submissions awaiting evaluation or verification.</p>
                  </div>
                  <button
                    onClick={() => handleTabChange('new-request')}
                    className="flex items-center gap-1.5 bg-[#0066cc] hover:bg-[#0052a3] text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    <Plus size={14} /> Add Request
                  </button>
                </div>

                <div className="overflow-x-auto">
                  {isFetchingChanges ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                      <Loader2 className="animate-spin text-[#0066cc]" size={28} />
                      <span className="text-sm">Fetching changes...</span>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-150">
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Requester</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {changes.slice(0, 5).map(c => (
                          <tr key={c.id} className="hover:bg-slate-50/50">
                            <td className="p-4 text-xs font-mono text-slate-400 font-bold">{c.id}</td>
                            <td className="p-4 text-sm font-medium text-slate-800">{c.title}</td>
                            <td className="p-4 text-sm text-slate-500">{c.requester}</td>
                            <td className="p-4 text-sm text-slate-500">{c.date}</td>
                            <td className="p-4 text-sm font-semibold">
                              <span className={c.priority === 'High' ? 'text-rose-600' : c.priority === 'Medium' ? 'text-amber-600' : 'text-slate-500'}>
                                {c.priority}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                c.status === 'Pending' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                c.status === 'Approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                c.status === 'Evaluating' ? 'bg-cyan-50 border-cyan-200 text-cyan-700' :
                                'bg-indigo-50 border-indigo-200 text-indigo-700'
                              }`}>
                                <Zap size={10} className="fill-current" />
                                {c.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: NEW REQUEST */}
          {activeTab === 'new-request' && (
            <div className="max-w-[600px] mx-auto bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm relative animate-fade-in-up">
              <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#0066cc] to-sky-400 rounded-t-xl" />
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-[#0066cc]/10 text-[#0066cc] flex items-center justify-center">
                  <FilePlus size={20} />
                </div>
                <div>
                  <h3 className="font-heading text-xl font-bold text-slate-900">Request New Change</h3>
                  <p className="text-slate-500 text-sm">Register modification request details for CAB review.</p>
                </div>
              </div>

              <form onSubmit={handleCreateChange} className="space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="form-title" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Change Description / Title
                  </label>
                  <input
                    id="form-title"
                    type="text"
                    required
                    placeholder="e.g. Upgrade node runtime environment on cloud servers"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#0066cc] focus:ring-4 focus:ring-[#0066cc]/10 rounded-lg py-2.5 px-4 text-sm outline-none transition-all"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Priority Level</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Low', 'Medium', 'High'].map(prio => (
                      <button
                        key={prio}
                        type="button"
                        onClick={() => setNewPriority(prio)}
                        disabled={isSubmitting}
                        className={`py-2 px-3 rounded-lg text-sm font-medium border text-center transition-all cursor-pointer ${
                          newPriority === prio
                            ? prio === 'High'
                              ? 'bg-rose-50 border-rose-500 text-rose-700 font-semibold'
                              : prio === 'Medium'
                              ? 'bg-amber-50 border-amber-500 text-amber-700 font-semibold'
                              : 'bg-slate-100 border-slate-400 text-slate-700 font-semibold'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-500'
                        }`}
                      >
                        {prio}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="form-requester" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Requester
                  </label>
                  <input
                    id="form-requester"
                    type="text"
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg py-2.5 px-4 text-sm text-slate-500 outline-none cursor-not-allowed"
                    value={userEmail}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-150">
                  <button
                    type="button"
                    onClick={() => handleTabChange('dashboard')}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-medium transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newTitle.trim()}
                    className="flex items-center gap-1.5 bg-[#0066cc] hover:bg-[#0052a3] disabled:opacity-60 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-sm cursor-pointer"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                    Submit Request
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: ALL REQUESTS */}
          {activeTab === 'all-requests' && (
            <div className="space-y-6 animate-fade-in-up">
              {/* Header and filters */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div>
                    <h3 className="font-heading text-lg font-bold text-slate-900">All Change Requests</h3>
                    <p className="text-slate-500 text-xs">Examine, search, and filter all registered system records.</p>
                  </div>
                  <button
                    onClick={() => handleTabChange('new-request')}
                    className="flex items-center justify-center gap-1.5 bg-[#0066cc] hover:bg-[#0052a3] text-white px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer self-start"
                  >
                    <Plus size={14} /> New Request
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search ID, title, requester..."
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#0066cc] transition-colors"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div>
                    <select
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-[#0066cc]"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="All">All Statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="Evaluating">Evaluating</option>
                      <option value="Approved">Approved</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>

                  <div>
                    <select
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-[#0066cc]"
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                    >
                      <option value="All">All Priorities</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Table Card */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150">
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Title / Context</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Requester</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {changes.filter(c => {
                        const matchesQuery = c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.requester.toLowerCase().includes(searchQuery.toLowerCase());
                        const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
                        const matchesPriority = priorityFilter === 'All' || c.priority === priorityFilter;
                        return matchesQuery && matchesStatus && matchesPriority;
                      }).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-slate-400 text-sm">
                            No matching change requests found.
                          </td>
                        </tr>
                      ) : (
                        changes.filter(c => {
                          const matchesQuery = c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.requester.toLowerCase().includes(searchQuery.toLowerCase());
                          const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
                          const matchesPriority = priorityFilter === 'All' || c.priority === priorityFilter;
                          return matchesQuery && matchesStatus && matchesPriority;
                        }).map(c => (
                          <tr key={c.id} className="hover:bg-slate-50/50">
                            <td className="p-4 text-xs font-mono text-slate-400 font-bold">{c.id}</td>
                            <td className="p-4 text-sm font-medium text-slate-800">{c.title}</td>
                            <td className="p-4 text-sm text-slate-500">{c.requester}</td>
                            <td className="p-4 text-sm text-slate-500">{c.date}</td>
                            <td className="p-4 text-sm font-semibold">
                              <span className={c.priority === 'High' ? 'text-rose-600' : c.priority === 'Medium' ? 'text-amber-600' : 'text-slate-500'}>
                                {c.priority}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                c.status === 'Pending' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                c.status === 'Approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                c.status === 'Evaluating' ? 'bg-cyan-50 border-cyan-200 text-cyan-700' :
                                'bg-indigo-50 border-indigo-200 text-indigo-700'
                              }`}>
                                <Zap size={10} className="fill-current" />
                                {c.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: APPROVALS */}
          {activeTab === 'approvals' && (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <h3 className="font-heading text-2xl font-bold text-slate-900">Pending Approvals</h3>
                <p className="text-slate-500 text-sm">Review, evaluate, and authorize submitted change plans.</p>
              </div>

              {/* Authorization check */}
              {userRole !== 'Administrator' && userRole !== 'Change Manager' ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-3 text-amber-800">
                  <Info size={20} className="flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm">Restricted Access</h4>
                    <p className="text-xs mt-0.5">Only Administrators and Change Managers are authorized to review or approve change plans.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {changes.filter(c => c.status === 'Pending' || c.status === 'Evaluating').length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400">
                      <CheckCircle size={32} className="mx-auto text-emerald-500 mb-2" />
                      <p className="text-sm font-semibold">Zero Pending Requests</p>
                      <p className="text-xs text-slate-400 mt-0.5">All incoming requests are fully reviewed.</p>
                    </div>
                  ) : (
                    changes.filter(c => c.status === 'Pending' || c.status === 'Evaluating').map(c => (
                      <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-400">{c.id}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                              c.priority === 'High' ? 'bg-rose-50 border-rose-200 text-rose-600' :
                              c.priority === 'Medium' ? 'bg-amber-50 border-amber-200 text-amber-600' :
                              'bg-slate-50 border-slate-200 text-slate-600'
                            }`}>
                              {c.priority} Priority
                            </span>
                            <span className="text-[10px] font-medium text-slate-400">{c.date}</span>
                          </div>
                          <h4 className="text-base font-bold text-slate-800">{c.title}</h4>
                          <p className="text-xs text-slate-500">Submitted by: <span className="font-semibold">{c.requester}</span></p>
                        </div>

                        {/* Control actions */}
                        <div className="flex gap-2 self-end md:self-auto">
                          {c.status === 'Pending' && (
                            <button
                              onClick={() => handleStatusUpdate(c.id, 'Evaluating')}
                              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-250 text-slate-700 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                            >
                              Send to Evaluating
                            </button>
                          )}
                          <button
                            onClick={() => handleStatusUpdate(c.id, 'Approved')}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-all shadow-sm cursor-pointer"
                          >
                            Approve Change
                          </button>
                          {c.status === 'Evaluating' && (
                            <button
                              onClick={() => handleStatusUpdate(c.id, 'Completed')}
                              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-all shadow-sm cursor-pointer"
                            >
                              Mark Completed
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: EFFECTIVENESS MONITORING */}
          {activeTab === 'effectiveness' && (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <h3 className="font-heading text-2xl font-bold text-slate-900">Effectiveness Monitoring</h3>
                <p className="text-slate-500 text-sm">Add observations and track 3-month post-implementation effectiveness logs.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Form column */}
                <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 relative">
                  <div className="absolute inset-x-0 top-0 h-1 bg-[#0066cc] rounded-t-xl" />
                  
                  <h4 className="font-heading text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                    {editingEffLogId ? 'Edit Monitoring Log' : 'Add Monitoring Log'}
                  </h4>

                  <form onSubmit={handleAddOrEditEff} className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase">4M Change No *</label>
                      {editingEffLogId ? (
                        <input
                          type="text"
                          disabled
                          className="w-full bg-slate-100 border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-500 cursor-not-allowed"
                          value={effChangeNo}
                        />
                      ) : (
                        <select
                          required
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-[#0066cc]"
                          value={effChangeNo}
                          onChange={(e) => setEffChangeNo(e.target.value)}
                        >
                          <option value="">Select Approved Change</option>
                          {changes.filter(c => c.status === 'Approved' || c.status === 'Completed').map(c => (
                            <option key={c.id} value={c.id}>{c.id} - {c.title.substring(0, 30)}...</option>
                          ))}
                          {changes.filter(c => c.status === 'Approved' || c.status === 'Completed').length === 0 && (
                            <option value="CHG-DEMO">No Approved Changes (Create DEMO)</option>
                          )}
                        </select>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase">Month Wise *</label>
                      <input
                        type="month"
                        required
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#0066cc]"
                        value={effMonthWise}
                        onChange={(e) => setEffMonthWise(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase">Observation Remarks *</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Enter evaluation remarks/results..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#0066cc]"
                        value={effRemarks}
                        onChange={(e) => setEffRemarks(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase">Attachment Filename</label>
                      <input
                        type="text"
                        placeholder="e.g. proof-log.pdf"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#0066cc]"
                        value={effAttachment}
                        onChange={(e) => setEffAttachment(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase">Effectiveness Status *</label>
                      <select
                        required
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-[#0066cc]"
                        value={effStatus}
                        onChange={(e) => setEffStatus(e.target.value)}
                      >
                        <option value="Effectiveness Ok">Effectiveness Ok</option>
                        <option value="Effectiveness Not Ok">Effectiveness Not Ok</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase">QA Approval Decision *</label>
                      <select
                        required
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-[#0066cc]"
                        value={effQaApproval}
                        onChange={(e) => setEffQaApproval(e.target.value)}
                      >
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>

                    <div className="pt-2 flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-[#0066cc] hover:bg-[#0052a3] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        {editingEffLogId ? 'Save Changes' : 'Add Log Entry'}
                      </button>
                      {editingEffLogId && (
                        <button
                          type="button"
                          onClick={handleCancelEditing}
                          className="px-3 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-semibold rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Table column */}
                <div className="lg:col-span-8 space-y-4">
                  {/* Search and filters */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap gap-3 items-center">
                    <div className="flex-1 min-w-[200px] relative">
                      <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                      <input
                        type="text"
                        placeholder="Search logs..."
                        className="w-full pl-8 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0066cc]"
                        value={effSearch}
                        onChange={(e) => setEffSearch(e.target.value)}
                      />
                    </div>

                    <div>
                      <select
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none"
                        value={effFilterStatus}
                        onChange={(e) => setEffFilterStatus(e.target.value)}
                      >
                        <option value="All">All Statuses</option>
                        <option value="Effectiveness Ok">Effectiveness Ok</option>
                        <option value="Effectiveness Not Ok">Effectiveness Not Ok</option>
                      </select>
                    </div>

                    <div>
                      <select
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none"
                        value={effFilterMonth}
                        onChange={(e) => setEffFilterMonth(e.target.value)}
                      >
                        <option value="All">All Months</option>
                        {uniqueMonths.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleResetEffToDefaults}
                      className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw size={12} /> Reset
                    </button>
                  </div>

                  {/* Logs Table Card */}
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-150">
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Change No</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Requested</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Context</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Month Wise</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Remarks</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">File</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">QA</th>
                            <th className="p-3 w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {effectivenessLogs.filter(log => {
                            const query = effSearch.toLowerCase();
                            const matchesSearch = log.changeNo.toLowerCase().includes(query) ||
                              log.context.toLowerCase().includes(query) ||
                              log.remarks.toLowerCase().includes(query);
                            const matchesStatus = effFilterStatus === 'All' || log.status === effFilterStatus;
                            const matchesMonth = effFilterMonth === 'All' || formatMonthWise(log.monthWise) === effFilterMonth;
                            return matchesSearch && matchesStatus && matchesMonth;
                          }).length === 0 ? (
                            <tr>
                              <td colSpan={9} className="text-center py-10 text-slate-400">
                                No observations logs recorded.
                              </td>
                            </tr>
                          ) : (
                            effectivenessLogs.filter(log => {
                              const query = effSearch.toLowerCase();
                              const matchesSearch = log.changeNo.toLowerCase().includes(query) ||
                                log.context.toLowerCase().includes(query) ||
                                log.remarks.toLowerCase().includes(query);
                              const matchesStatus = effFilterStatus === 'All' || log.status === effFilterStatus;
                              const matchesMonth = effFilterMonth === 'All' || formatMonthWise(log.monthWise) === effFilterMonth;
                              return matchesSearch && matchesStatus && matchesMonth;
                            }).map(log => {
                              const isEditing = editingEffLogId === log.id;
                              return (
                                <tr
                                  key={log.id}
                                  className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${isEditing ? 'bg-sky-50/50' : ''}`}
                                  onClick={() => handleSelectRowForEdit(log)}
                                >
                                  <td className="p-3 font-mono font-bold text-slate-600">{log.changeNo}</td>
                                  <td className="p-3 text-slate-500">{formatDateShort(log.reqDate)}</td>
                                  <td className="p-3 font-medium text-slate-800">{log.context}</td>
                                  <td className="p-3 font-medium">{formatMonthWise(log.monthWise)}</td>
                                  <td className="p-3 max-w-[200px] truncate text-slate-500" title={log.remarks}>{log.remarks}</td>
                                  <td className="p-3 font-mono text-teal-600">
                                    {log.attachment ? `📎 ${log.attachment}` : '-'}
                                  </td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      log.status === 'Effectiveness Ok'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-rose-50 text-rose-700'
                                    }`}>
                                      {log.status}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      log.qaApproval === 'Approved'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-rose-50 text-rose-700'
                                    }`}>
                                      {log.qaApproval}
                                    </span>
                                  </td>
                                  <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => setDeleteEffLogId(log.id)}
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                                      title="Delete Log"
                                    >
                                      <Trash2 size={13} />
                                    </button>
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

              </div>

              {/* Delete Modal */}
              {deleteEffLogId && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white border border-slate-200 rounded-xl shadow-lg w-full max-w-sm overflow-hidden animate-fade-in-up">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                      <h4 className="font-heading font-bold text-slate-900">Delete Observation Log</h4>
                      <button onClick={() => setDeleteEffLogId(null)} className="text-slate-400 hover:text-slate-600">
                        <X size={16} />
                      </button>
                    </div>
                    <div className="p-5 flex gap-3.5 items-start">
                      <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle size={18} />
                      </div>
                      <div>
                        <h5 className="font-bold text-sm text-slate-950">Are you sure?</h5>
                        <p className="text-xs text-slate-500 mt-1 leading-normal">
                          This action will permanently delete the monitoring entry for log ID <strong>{deleteEffLogId}</strong>. This cannot be undone.
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                      <button
                        onClick={() => setDeleteEffLogId(null)}
                        className="px-3.5 py-1.5 border border-slate-250 text-slate-500 hover:bg-slate-100 text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteEff}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Delete Log
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: REPORTS */}
          {activeTab === 'reports' && (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <h3 className="font-heading text-2xl font-bold text-slate-900">Reporting Analytics</h3>
                <p className="text-slate-500 text-sm">System performance audits and change distribution summaries.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Priority Breakdown */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                  <h4 className="font-heading font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">Priority Distribution</h4>
                  <div className="space-y-3 pt-2">
                    {['High', 'Medium', 'Low'].map(prio => {
                      const count = changes.filter(c => c.priority === prio).length;
                      const percentage = changes.length > 0 ? Math.round((count / changes.length) * 100) : 0;
                      return (
                        <div key={prio} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-slate-700">{prio} Priority</span>
                            <span className="text-slate-400 font-mono">{count} requests ({percentage}%)</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${prio === 'High' ? 'bg-rose-500' : prio === 'Medium' ? 'bg-amber-500' : 'bg-slate-400'}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Status Distribution */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                  <h4 className="font-heading font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">Status Tracking</h4>
                  <div className="space-y-3 pt-2">
                    {['Pending', 'Evaluating', 'Approved', 'Completed'].map(status => {
                      const count = changes.filter(c => c.status === status).length;
                      const percentage = changes.length > 0 ? Math.round((count / changes.length) * 100) : 0;
                      return (
                        <div key={status} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-slate-700">{status}</span>
                            <span className="text-slate-400 font-mono">{count} requests ({percentage}%)</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                status === 'Pending' ? 'bg-amber-500' :
                                status === 'Evaluating' ? 'bg-cyan-500' :
                                status === 'Approved' ? 'bg-emerald-500' :
                                'bg-indigo-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Analytical Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-center">
                  <h5 className="text-[11px] font-bold text-slate-400 uppercase">Total Logged Changes</h5>
                  <p className="text-3xl font-extrabold text-slate-900 mt-1">{changes.length}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-center">
                  <h5 className="text-[11px] font-bold text-slate-400 uppercase">Active Monitoring logs</h5>
                  <p className="text-3xl font-extrabold text-slate-900 mt-1">{effectivenessLogs.length}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-center">
                  <h5 className="text-[11px] font-bold text-slate-400 uppercase">QA Approval Rate</h5>
                  <p className="text-3xl font-extrabold text-slate-900 mt-1">
                    {effectivenessLogs.length > 0
                      ? `${Math.round((effectivenessLogs.filter(l => l.qaApproval === 'Approved').length / effectivenessLogs.length) * 100)}%`
                      : '100%'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: AUDIT LOG */}
          {activeTab === 'audit-log' && (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <h3 className="font-heading text-2xl font-bold text-slate-900">System Audit Log</h3>
                <p className="text-slate-500 text-sm">Review security audits, session activities, and transaction logs.</p>
              </div>

              {/* Table */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase">Chronological Records</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150">
                        <th className="p-3.5 font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                        <th className="p-3.5 font-bold text-slate-500 uppercase tracking-wider">Action</th>
                        <th className="p-3.5 font-bold text-slate-500 uppercase tracking-wider">Trigger User</th>
                        <th className="p-3.5 font-bold text-slate-500 uppercase tracking-wider">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/50">
                          <td className="p-3.5 font-mono text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="p-3.5 font-bold text-slate-700">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                              log.action.includes('Created') ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                              log.action.includes('Updated') ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              log.action.includes('Start') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-600 font-semibold">{log.user}</td>
                          <td className="p-3.5 text-slate-500 font-medium">{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: USERS LIST */}
          {activeTab === 'users' && (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <h3 className="font-heading text-2xl font-bold text-slate-900">User Management</h3>
                <p className="text-slate-500 text-sm">System accounts, authentication privileges, and security roles.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* 1. Left Sidebar: Create User Account */}
                <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 relative">
                  <div className="absolute inset-x-0 top-0 h-1 bg-[#0066cc] rounded-t-xl" />
                  
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Users size={18} className="text-[#0066cc]" />
                    <h4 className="font-heading text-sm font-bold text-slate-900">Create User Account</h4>
                  </div>

                  <form onSubmit={handleCreateUser} className="space-y-4">
                    {/* Full Name */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. John Doe"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#0066cc] transition-colors"
                        value={createUserFullName}
                        onChange={(e) => setCreateUserFullName(e.target.value)}
                        disabled={isCreatingUser}
                      />
                    </div>

                    {/* Email Address */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Email Address *</label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. john.doe@plant.com"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#0066cc] transition-colors"
                        value={createUserEmail}
                        onChange={(e) => setCreateUserEmail(e.target.value)}
                        disabled={isCreatingUser}
                      />
                    </div>

                    {/* Password */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Password *</label>
                      <div className="relative">
                        <input
                          type={showFormPassword ? 'text' : 'password'}
                          required
                          placeholder="Min 6 characters"
                          className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#0066cc] transition-colors"
                          value={createUserPassword}
                          onChange={(e) => setCreateUserPassword(e.target.value)}
                          disabled={isCreatingUser}
                        />
                        <button
                          type="button"
                          onClick={() => setShowFormPassword(!showFormPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-650 cursor-pointer"
                        >
                          <Zap size={14} className={showFormPassword ? "text-[#0066cc] fill-[#0066cc]" : ""} />
                        </button>
                      </div>
                    </div>

                    {/* Role Selection */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Role *</label>
                      <div className="flex gap-2">
                        <select
                          required
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-[#0066cc]"
                          value={createUserRole}
                          onChange={(e) => setCreateUserRole(e.target.value)}
                          disabled={isCreatingUser}
                        >
                          <option value="">Select Role</option>
                          {customRoles.map(role => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleAddCustomRole}
                          className="px-3 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg text-sm font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Department Selection */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Department *</label>
                      <div className="flex gap-2">
                        <select
                          required
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-[#0066cc]"
                          value={createUserDept}
                          onChange={(e) => setCreateUserDept(e.target.value)}
                          disabled={isCreatingUser}
                        >
                          <option value="">Select Department</option>
                          {customDepts.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleAddCustomDept}
                          className="px-3 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg text-sm font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isCreatingUser}
                        className="w-full flex items-center justify-center gap-1.5 bg-[#0066cc] hover:bg-[#0052a3] disabled:opacity-60 text-white py-2 px-4 rounded-lg text-sm font-bold transition-all shadow-sm cursor-pointer"
                      >
                        {isCreatingUser ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          <Plus size={14} />
                        )}
                        <span>Create Account</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* 2. Right Panel: Users Directory Table */}
                <div className="lg:col-span-8 space-y-4">
                  {/* Search and Filters */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap gap-3 items-center">
                    <div className="flex-1 min-w-[200px] relative">
                      <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                      <input
                        type="text"
                        placeholder="Search by name or email..."
                        className="w-full pl-8 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0066cc]"
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                      />
                    </div>

                    <div>
                      <select
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none"
                        value={userRoleFilter}
                        onChange={(e) => setUserRoleFilter(e.target.value)}
                      >
                        <option value="All">All Roles</option>
                        {customRoles.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => {
                        setUserSearchQuery('');
                        setUserRoleFilter('All');
                      }}
                      className="px-3 py-1.5 border border-slate-200 text-slate-650 hover:bg-slate-50 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw size={12} /> Reset
                    </button>
                  </div>

                  {/* Users List Table */}
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      {isFetchingUsers ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                          <Loader2 className="animate-spin text-[#0066cc]" size={32} />
                          <span>Loading users...</span>
                        </div>
                      ) : (
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-150">
                              <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">User ID</th>
                              <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Name</th>
                              <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Email</th>
                              <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Password</th>
                              <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Role</th>
                              <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Department</th>
                              <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Status</th>
                              <th className="p-3 w-10 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {users.filter(u => {
                              const query = userSearchQuery.toLowerCase();
                              const nameMatch = (u.name || '').toLowerCase().includes(query);
                              const emailMatch = (u.email || '').toLowerCase().includes(query);
                              const matchesSearch = nameMatch || emailMatch;
                              const matchesRole = userRoleFilter === 'All' || u.role === userRoleFilter;
                              return matchesSearch && matchesRole;
                            }).length === 0 ? (
                              <tr>
                                <td colSpan={8} className="text-center py-10 text-slate-400">
                                  No accounts found in directory.
                                </td>
                              </tr>
                            ) : (
                              users.filter(u => {
                                const query = userSearchQuery.toLowerCase();
                                const nameMatch = (u.name || '').toLowerCase().includes(query);
                                const emailMatch = (u.email || '').toLowerCase().includes(query);
                                const matchesSearch = nameMatch || emailMatch;
                                const matchesRole = userRoleFilter === 'All' || u.role === userRoleFilter;
                                return matchesSearch && matchesRole;
                              }).map(u => {
                                // Initials for Avatar
                                const nameToUse = u.name && u.name.trim() ? u.name.trim() : u.email.split('@')[0];
                                const parts = nameToUse.split(/\s+/);
                                const initials = parts.length >= 2 
                                  ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                                  : parts[0].substring(0, 2).toUpperCase();

                                // Avatar styles
                                const getAvatarStyles = (role) => {
                                  const r = role.toLowerCase();
                                  if (r.includes('admin')) return 'bg-blue-900 text-white';
                                  if (r.includes('hod') || r.includes('manager')) return 'bg-purple-650 text-white';
                                  if (r.includes('operator')) return 'bg-emerald-650 text-white';
                                  if (r.includes('qa')) return 'bg-lime-600 text-white';
                                  return 'bg-slate-200 text-slate-800';
                                };

                                // Role Badge styling
                                const getRoleBadgeStyles = (role) => {
                                  const r = role.toLowerCase();
                                  if (r.includes('admin')) return 'bg-rose-50 border border-rose-150 text-rose-700';
                                  if (r.includes('hod')) return 'bg-purple-50 border border-purple-150 text-purple-700';
                                  if (r.includes('operator')) return 'bg-emerald-50 border border-emerald-150 text-emerald-700';
                                  if (r.includes('qa')) return 'bg-lime-50 border border-lime-200 text-lime-800';
                                  if (r.includes('manager')) return 'bg-amber-50 border border-amber-150 text-amber-700';
                                  return 'bg-slate-50 border border-slate-200 text-slate-700';
                                };

                                const isPasswordVisible = !!visiblePasswords[u.id];

                                return (
                                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                                    {/* User ID */}
                                    <td className="p-3 font-mono font-bold text-slate-400">
                                      USR-{String(u.id).padStart(3, '0')}
                                    </td>
                                    {/* Avatar + Name */}
                                    <td className="p-3 font-medium text-slate-800">
                                      <div className="flex items-center gap-2">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ${getAvatarStyles(u.role)}`}>
                                          {initials}
                                        </div>
                                        <span>{u.name || 'Unnamed User'}</span>
                                      </div>
                                    </td>
                                    {/* Email */}
                                    <td className="p-3 text-slate-500">{u.email}</td>
                                    {/* Password mask/unmask */}
                                    <td className="p-3 font-mono text-slate-500">
                                      <div className="flex items-center gap-1.5">
                                        <span>{isPasswordVisible ? u.password : '••••••••'}</span>
                                        <button
                                          onClick={() => togglePasswordVisibility(u.id)}
                                          className="text-slate-400 hover:text-slate-650 cursor-pointer"
                                          title={isPasswordVisible ? "Hide Password" : "Show Password"}
                                        >
                                          <Zap size={11} className={isPasswordVisible ? "text-[#0066cc]" : ""} />
                                        </button>
                                      </div>
                                    </td>
                                    {/* Role Badge */}
                                    <td className="p-3">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getRoleBadgeStyles(u.role)}`}>
                                        {u.role}
                                      </span>
                                    </td>
                                    {/* Department */}
                                    <td className="p-3 text-slate-600 font-semibold">{u.department || '-'}</td>
                                    {/* Status (Active) */}
                                    <td className="p-3">
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 border border-emerald-150 text-emerald-700">
                                        {u.status || 'Active'}
                                      </span>
                                    </td>
                                    {/* Actions */}
                                    <td className="p-3 text-center">
                                      {u.email !== userEmail && (
                                        <button
                                          onClick={() => handleDeleteUser(u.id, u.email, u.name)}
                                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                                          title="Delete Account"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-[650px] mx-auto animate-fade-in-up">
              <div>
                <h3 className="font-heading text-2xl font-bold text-slate-900">System Settings</h3>
                <p className="text-slate-500 text-sm">Configure parameters and adjust user preferences.</p>
              </div>

              {/* Profile Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <h4 className="font-heading font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">User Profile</h4>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">Account Email</span>
                    <span className="text-slate-800 font-semibold">{userEmail}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">Security Group</span>
                    <span className="text-slate-800 font-semibold">{userRole}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">Session Status</span>
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                    </span>
                  </div>
                </div>
              </div>

              {/* System Config Mock */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <h4 className="font-heading font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">General Settings</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h5 className="text-sm font-semibold text-slate-800">Email Notifications</h5>
                      <p className="text-xs text-slate-400">Send alerts for CAB reviews and approved plans.</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-[#0066cc] rounded focus:ring-0 cursor-pointer" />
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <h5 className="text-sm font-semibold text-slate-800">API Access</h5>
                      <p className="text-xs text-slate-400">Authorize automated integrations.</p>
                    </div>
                    <input type="checkbox" className="w-4 h-4 text-[#0066cc] rounded focus:ring-0 cursor-pointer" />
                  </div>
                </div>
              </div>
            </div>
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
