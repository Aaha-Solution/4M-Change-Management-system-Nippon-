import { useState, useEffect } from 'react';
import {
  getUsers,
  deleteUser,
  signup,
  getRoles,
  addRole,
  deleteRole,
  getDepartments,
  addDepartment,
  deleteDepartment,
  updateUser
} from '../api/apiRoutes';
import {
  AlertTriangle,
  Edit,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users as UsersIcon,
  X
} from 'lucide-react';

export const Users = ({
  userRole,
  userEmail,
  logAction,
  setToastMsg,
  onLocalSignOut
}) => {
  const [users, setUsers] = useState([]);
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);
  const [customRoles, setCustomRoles] = useState([]);
  const [customDepts, setCustomDepts] = useState([]);

  // Form states
  const [createUserFullName, setCreateUserFullName] = useState('');
  const [createUserEmail, setCreateUserEmail] = useState('');
  const [createUserPassword, setCreateUserPassword] = useState('');
  const [createUserRole, setCreateUserRole] = useState('');
  const [createUserDept, setCreateUserDept] = useState('');
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('All');
  
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Modals
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [newCustomRoleInput, setNewCustomRoleInput] = useState('');
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [newCustomDeptInput, setNewCustomDeptInput] = useState('');
  const [userToDelete, setUserToDelete] = useState(null);

  // Edit User
  const [userToEdit, setUserToEdit] = useState(null);
  const [editUserFullName, setEditUserFullName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserRole, setEditUserRole] = useState('');
  const [editUserDept, setEditUserDept] = useState('');
  const [editUserStatus, setEditUserStatus] = useState('Active');
  const [showEditFormPassword, setShowEditFormPassword] = useState(false);

  const fetchRoles = async () => {
    try {
      const response = await getRoles();
      setCustomRoles(response.data);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await getDepartments();
      setCustomDepts(response.data);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const fetchUsers = async () => {
    setIsFetchingUsers(true);
    try {
      const response = await getUsers();
      setUsers(response.data);
    } catch (error) {
      console.error(error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        onLocalSignOut();
      } else {
        setToastMsg('Error loading users from backend.');
      }
    } finally {
      setIsFetchingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleDeleteUser = (id, email, name) => {
    setUserToDelete({ id, email, name });
  };

  const executeDeleteUser = async () => {
    if (!userToDelete) return;
    const { id, email, name } = userToDelete;
    try {
      await deleteUser(id);
      setToastMsg('User deleted successfully.');
      logAction('User Deleted', `Removed account for ${name || email} (${email}).`);
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      console.error(err);
      setToastMsg('Error deleting user.');
    }
  };

  const handleStartEditUser = (u) => {
    setUserToEdit(u);
    setEditUserFullName(u.name || '');
    setEditUserEmail(u.email || '');
    setEditUserPassword('');
    setEditUserRole(u.role || '');
    setEditUserDept(u.department || '');
    setEditUserStatus(u.status || 'Active');
    setShowEditFormPassword(false);
  };

  const executeEditUser = async (e) => {
    e.preventDefault();
    if (!userToEdit) return;
    try {
      const payload = {
        name: editUserFullName.trim(),
        email: editUserEmail.trim(),
        role: editUserRole,
        department: editUserDept,
        status: editUserStatus
      };
      if (editUserPassword.trim()) {
        payload.password = editUserPassword.trim();
      }
      await updateUser(userToEdit.id, payload);
      setToastMsg('User updated successfully.');
      logAction('User Updated', `Modified account for ${editUserFullName.trim()} (${editUserEmail.trim()}).`);
      setUserToEdit(null);
      fetchUsers();
    } catch (err) {
      console.error(err);
      setToastMsg(err.response?.data?.error || 'Error updating user.');
    }
  };

  const togglePasswordVisibility = (userId) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleAddCustomRole = () => {
    setShowAddRoleModal(true);
    setNewCustomRoleInput('');
  };

  const executeAddCustomRole = async (e) => {
    e.preventDefault();
    if (newCustomRoleInput && newCustomRoleInput.trim()) {
      const trimmed = newCustomRoleInput.trim();
      try {
        await addRole(trimmed);
        setCreateUserRole(trimmed);
        fetchRoles();
      } catch (err) {
        console.error(err);
        setToastMsg(err.response?.data?.error || 'Error saving custom role.');
      }
    }
    setShowAddRoleModal(false);
    setNewCustomRoleInput('');
  };

  const handleAddCustomDept = () => {
    setShowAddDeptModal(true);
    setNewCustomDeptInput('');
  };

  const executeAddCustomDept = async (e) => {
    e.preventDefault();
    if (newCustomDeptInput && newCustomDeptInput.trim()) {
      const trimmed = newCustomDeptInput.trim();
      try {
        await addDepartment(trimmed);
        setCreateUserDept(trimmed);
        fetchDepartments();
      } catch (err) {
        console.error(err);
        setToastMsg(err.response?.data?.error || 'Error saving custom department.');
      }
    }
    setShowAddDeptModal(false);
    setNewCustomDeptInput('');
  };

  const handleDeleteCustomRole = async (roleToDelete) => {
    try {
      await deleteRole(roleToDelete);
      if (createUserRole === roleToDelete) {
        setCreateUserRole('');
      }
      fetchRoles();
    } catch (err) {
      console.error(err);
      setToastMsg('Error deleting role option.');
    }
  };

  const handleDeleteCustomDept = async (deptToDelete) => {
    try {
      await deleteDepartment(deptToDelete);
      if (createUserDept === deptToDelete) {
        setCreateUserDept('');
      }
      fetchDepartments();
    } catch (err) {
      console.error(err);
      setToastMsg('Error deleting department option.');
    }
  };

  // Initials for Avatar
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

  const filteredUsers = users.filter(u => {
    const query = userSearchQuery.toLowerCase();
    const nameMatch = (u.name || '').toLowerCase().includes(query);
    const emailMatch = (u.email || '').toLowerCase().includes(query);
    const matchesSearch = nameMatch || emailMatch;
    const matchesRole = userRoleFilter === 'All' || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  return (
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
            <UsersIcon size={18} className="text-[#0066cc]" />
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
                  {showFormPassword ? <EyeOff size={14} /> : <Eye size={14} />}
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
                {userRole && userRole.toLowerCase().includes('admin') && (
                  <button
                    type="button"
                    onClick={handleAddCustomRole}
                    className="px-3 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg text-sm font-bold cursor-pointer"
                  >
                    +
                  </button>
                )}
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
                {userRole && userRole.toLowerCase().includes('admin') && (
                  <button
                    type="button"
                    onClick={handleAddCustomDept}
                    className="px-3 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg text-sm font-bold cursor-pointer"
                  >
                    +
                  </button>
                )}
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
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-10 text-slate-400">
                          No accounts found in directory.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(u => {
                        const nameToUse = u.name && u.name.trim() ? u.name.trim() : u.email.split('@')[0];
                        const parts = nameToUse.split(/\s+/);
                        const initials = parts.length >= 2 
                          ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                          : parts[0].substring(0, 2).toUpperCase();

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
                                  {isPasswordVisible ? <EyeOff size={11} /> : <Eye size={11} />}
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
                            <td className="p-3 text-slate-650 font-semibold">{u.department || '-'}</td>
                            {/* Status */}
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                (u.status || 'Active') === 'Active'
                                  ? 'bg-emerald-50 border border-emerald-150 text-emerald-700'
                                  : 'bg-rose-50 border border-rose-150 text-rose-700'
                              }`}>
                                {u.status || 'Active'}
                              </span>
                            </td>
                            {/* Actions */}
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleStartEditUser(u)}
                                  className="p-1 text-slate-400 hover:text-sky-650 rounded hover:bg-sky-50 transition-colors cursor-pointer"
                                  title="Edit Account"
                                >
                                  <Edit size={13} />
                                </button>
                                {u.email !== userEmail && (
                                  <button
                                    onClick={() => handleDeleteUser(u.id, u.email, u.name)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="Delete Account"
                                  >
                                    <Trash2 size={13} />
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
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Custom Role Modal */}
      {showAddRoleModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 max-w-sm w-full mx-auto animate-scale-in relative">
            <button
              onClick={() => setShowAddRoleModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-655 cursor-pointer"
            >
              <X size={18} />
            </button>
            <h4 className="font-heading text-lg font-bold text-slate-900 mb-2">Create Custom Role</h4>
            <p className="text-slate-500 text-xs mb-4">Enter a name for the new custom role to register in the system.</p>
            <form onSubmit={executeAddCustomRole} className="space-y-4">
              <div>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Lead Engineer"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#0066cc] transition-colors"
                  value={newCustomRoleInput}
                  onChange={(e) => setNewCustomRoleInput(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddRoleModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Add Role
                </button>
              </div>
            </form>

            {/* List of current roles */}
            <div className="mt-4 border-t border-slate-100 pt-3">
              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Existing Roles (Selectable)</h5>
              <div className="max-h-[140px] overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                {customRoles.map(role => {
                  const isDefault = ['Admin', 'User'].includes(role);
                  return (
                    <div key={role} className="flex items-center justify-between bg-slate-50 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 border border-slate-100">
                      <span>{role}</span>
                      {!isDefault && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomRole(role)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Remove role option"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Department Modal */}
      {showAddDeptModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 max-w-sm w-full mx-auto animate-scale-in relative">
            <button
              onClick={() => setShowAddDeptModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-655 cursor-pointer"
            >
              <X size={18} />
            </button>
            <h4 className="font-heading text-lg font-bold text-slate-900 mb-2">Create Custom Department</h4>
            <p className="text-slate-500 text-xs mb-4">Enter a name for the new department to register in the system.</p>
            <form onSubmit={executeAddCustomDept} className="space-y-4">
              <div>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. DevOps Team"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#0066cc] transition-colors"
                  value={newCustomDeptInput}
                  onChange={(e) => setNewCustomDeptInput(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddDeptModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Add Department
                </button>
              </div>
            </form>

            {/* List of current departments */}
            <div className="mt-4 border-t border-slate-100 pt-3">
              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Existing Departments (Selectable)</h5>
              <div className="max-h-[140px] overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                {customDepts.map(dept => {
                  const isDefault = ['General'].includes(dept);
                  return (
                    <div key={dept} className="flex items-center justify-between bg-slate-50 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 border border-slate-100">
                      <span>{dept}</span>
                      {!isDefault && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomDept(dept)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Remove department option"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Account Modal */}
      {userToEdit && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 max-w-md w-full mx-auto animate-scale-in relative">
            <div className="absolute inset-x-0 top-0 h-1 bg-[#0066cc] rounded-t-xl" />
            <button
              onClick={() => setUserToEdit(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-655 cursor-pointer"
            >
              <X size={18} />
            </button>
            <h4 className="font-heading text-lg font-bold text-slate-900 mb-2">Edit User Account</h4>
            <p className="text-slate-500 text-xs mb-4">Modify account details, change role/department, or reset password.</p>
            <form onSubmit={executeEditUser} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#0066cc] transition-colors"
                  value={editUserFullName}
                  onChange={(e) => setEditUserFullName(e.target.value)}
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Email Address *</label>
                <input
                  type="email"
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-500 cursor-not-allowed"
                  value={editUserEmail}
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Password (Optional)</label>
                <div className="relative">
                  <input
                    type={showEditFormPassword ? 'text' : 'password'}
                    placeholder="Leave blank to keep current password"
                    className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#0066cc] transition-colors"
                    value={editUserPassword}
                    onChange={(e) => setEditUserPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditFormPassword(!showEditFormPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-655 cursor-pointer"
                  >
                    {showEditFormPassword ? <EyeOff size={14} /> : <Eye size={14} />}
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
                    value={editUserRole}
                    onChange={(e) => setEditUserRole(e.target.value)}
                  >
                    <option value="">Select Role</option>
                    {customRoles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  {userRole && userRole.toLowerCase().includes('admin') && (
                    <button
                      type="button"
                      onClick={handleAddCustomRole}
                      className="px-3 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg text-sm font-bold cursor-pointer"
                    >
                      +
                    </button>
                  )}
                </div>
              </div>

              {/* Department Selection */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Department *</label>
                <div className="flex gap-2">
                  <select
                    required
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-[#0066cc]"
                    value={editUserDept}
                    onChange={(e) => setEditUserDept(e.target.value)}
                  >
                    <option value="">Select Department</option>
                    {customDepts.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  {userRole && userRole.toLowerCase().includes('admin') && (
                    <button
                      type="button"
                      onClick={handleAddCustomDept}
                      className="px-3 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg text-sm font-bold cursor-pointer"
                    >
                      +
                    </button>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status *</label>
                <select
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-[#0066cc]"
                  value={editUserStatus}
                  onChange={(e) => setEditUserStatus(e.target.value)}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setUserToEdit(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-655 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 max-w-sm w-full mx-auto animate-scale-in relative">
            <button
              onClick={() => setUserToDelete(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-655 cursor-pointer"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-3 text-rose-600 mb-2">
              <AlertTriangle size={24} />
              <h4 className="font-heading text-lg font-bold text-slate-900">Delete Account</h4>
            </div>
            <p className="text-slate-500 text-xs mb-4">
              Are you sure you want to delete the user account for <strong>{userToDelete.name || userToDelete.email}</strong> ({userToDelete.email})? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-655 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteUser}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
