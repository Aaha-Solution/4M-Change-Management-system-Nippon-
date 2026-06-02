import { useState, useEffect } from 'react';
import { Save, Search, RotateCcw, Eye, X, Loader2, AlertTriangle } from 'lucide-react';
import { getL3Approvals, createL3Approval } from '../api/apiRoutes';

export const L3RequestTracker = ({
  userEmail,
  userRole,
  logAction,
  setToastMsg
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingLogs, setIsFetchingLogs] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [validationError, setValidationError] = useState('');

  // Database approval logs
  const [approvalLogs, setApprovalLogs] = useState([]);

  // Selected row for editing
  const [selectedChangeId, setSelectedChangeId] = useState(null);

  // Form states
  const [formChangeNo, setFormChangeNo] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formRequester, setFormRequester] = useState('');
  const [formStatus, setFormStatus] = useState('');

  // Acting Department mapping
  const [actingDept, setActingDept] = useState('Quality');

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Fetch L3 logs from database
  const fetchLogs = async () => {
    setIsFetchingLogs(true);
    try {
      const response = await getL3Approvals();
      setApprovalLogs(response.data);
    } catch (err) {
      console.error(err);
      if (setToastMsg) setToastMsg('Error loading L3 approvals from database.');
    } finally {
      setIsFetchingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Map logged-in user email/role to initial acting department
  useEffect(() => {
    if (userEmail) {
      const email = userEmail.toLowerCase();
      if (email.includes('ravi.qa')) {
        setActingDept('Quality');
      } else if (email.includes('kumar.s')) {
        setActingDept('Production');
      } else if (email.includes('ped')) {
        setActingDept('PED');
      } else if (email.includes('manager')) {
        setActingDept('Production');
      } else {
        setActingDept('Quality');
      }
    }
  }, [userEmail]);

  // Dynamic form status prefill based on selected change request and acting department
  useEffect(() => {
    if (selectedChangeId) {
      const currentLog = approvalLogs.find(log => log.changeNo === selectedChangeId);
      if (currentLog) {
        let currentStatus = 'Pending';
        if (actingDept === 'PED') currentStatus = currentLog.ped;
        else if (actingDept === 'Quality') currentStatus = currentLog.quality;
        else if (actingDept === 'Production') currentStatus = currentLog.production;
        else if (actingDept === 'Maintenance') currentStatus = currentLog.maintenance;
        else if (actingDept === 'PC & L') currentStatus = currentLog.pcl;
        else if (actingDept === 'Materials') currentStatus = currentLog.materials;
        else if (actingDept === 'Marketing') currentStatus = currentLog.marketing;
        else if (actingDept === 'HR & Safety') currentStatus = currentLog.hrSafety;
        else if (actingDept === 'Unit Head') currentStatus = currentLog.unitHead;
        
        setFormStatus(currentStatus || 'Pending');
      }
    }
  }, [actingDept, selectedChangeId, approvalLogs]);

  // Click row to select it
  const handleSelectRow = (log) => {
    if (log.l2Decision !== 'Accepted') {
      setValidationError(`Error: Change Request ${log.changeNo} is awaiting L2 Validation before L3 Sign-off (Current L2 Status: ${log.l2Decision || 'Pending'}).`);
      return;
    }

    setSelectedChangeId(log.changeNo);
    setFormChangeNo(log.changeNo);
    setFormDate(log.date);
    setFormRequester(log.requester);
  };

  const handleCancelEdit = () => {
    setSelectedChangeId(null);
    setFormChangeNo('');
    setFormDate('');
    setFormRequester('');
    setFormStatus('');
  };

  const handleSaveApproval = async (e) => {
    e.preventDefault();

    if (!selectedChangeId || !formChangeNo.trim() || !formStatus) {
      setValidationError('Please select a change request and choose an approval status.');
      return;
    }

    // Find the log in state
    const currentLog = approvalLogs.find(log => log.changeNo === formChangeNo);
    if (!currentLog) {
      setValidationError('Selected change request was not found.');
      return;
    }

    setIsSubmitting(true);
    setValidationError('');

    const updatedLog = {
      changeNo: currentLog.changeNo,
      date: currentLog.date,
      requester: currentLog.requester,
      ped: actingDept === 'PED' ? formStatus : currentLog.ped,
      quality: actingDept === 'Quality' ? formStatus : currentLog.quality,
      production: actingDept === 'Production' ? formStatus : currentLog.production,
      maintenance: actingDept === 'Maintenance' ? formStatus : currentLog.maintenance,
      pcl: actingDept === 'PC & L' ? formStatus : currentLog.pcl,
      materials: actingDept === 'Materials' ? formStatus : currentLog.materials,
      marketing: actingDept === 'Marketing' ? formStatus : currentLog.marketing,
      hrSafety: actingDept === 'HR & Safety' ? formStatus : currentLog.hrSafety,
      unitHead: actingDept === 'Unit Head' ? formStatus : currentLog.unitHead
    };

    try {
      await createL3Approval(updatedLog);
      
      if (setToastMsg) {
        setToastMsg(`Successfully saved ${actingDept} approval log for ${formChangeNo}`);
      }
      if (logAction) {
        logAction('L3 Log Saved', `Successfully logged L3 approval status: "${formStatus}" for department: ${actingDept} and Change No: ${formChangeNo}`);
      }

      await fetchLogs();
      handleCancelEdit();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || 'Error saving L3 approval log to database.';
      setValidationError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
  };

  // Filter logic
  const filteredLogs = approvalLogs.filter(log => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      log.changeNo.toLowerCase().includes(q) ||
      log.requester.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'All' || 
      log.production === statusFilter || 
      log.unitHead === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_3.5fr] gap-[24px] animate-fade-in-up text-slate-800 pb-[40px]">
      
      {/* LEFT COLUMN: Add L3 Approval Log Form */}
      <div className="bg-white border border-slate-200 rounded-[12px] p-[20px] shadow-sm space-y-[16px] h-fit">
        <div className="flex items-center gap-[8px] border-b border-slate-100 pb-[8px]">
          <Save size={16} className="text-[#0066cc]" />
          <h4 className="text-[13px] font-bold text-slate-900">Add L3 Approval Log</h4>
        </div>

        <form onSubmit={handleSaveApproval} className="space-y-[14px]">
          {/* LOGGED-IN USER ROLE DISPLAY */}
          <div className="bg-slate-50 border border-slate-200 rounded-[8px] p-[10px_12px] mb-[4px] select-none">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-[2px]">LOGGED-IN USER ROLE</div>
            <div className="text-[14px] font-bold text-[#0066cc]">
              {actingDept === 'Production' ? 'Production HOD' : actingDept === 'Unit Head' ? 'Plant Unit Head' : `${actingDept} Approver`}
            </div>
          </div>

          {/* Acting Department (Admin) Select dropdown */}
          {(userRole === 'Admin' || userRole === 'Administrator' || (userRole && userRole.toLowerCase() === 'admin')) && (
            <div className="space-y-[4px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Acting Department (Admin) <span className="text-rose-500">*</span></label>
              <select
                value={actingDept}
                onChange={(e) => setActingDept(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] cursor-pointer"
              >
                <option value="PED">PED</option>
                <option value="Quality">Quality</option>
                <option value="Production">Production</option>
                <option value="Maintenance">Maintenance</option>
                <option value="PC & L">PC & L</option>
                <option value="Materials">Materials</option>
                <option value="Marketing">Marketing</option>
                <option value="HR & Safety">HR & Safety</option>
                <option value="Unit Head">Unit Head</option>
              </select>
            </div>
          )}

          {/* 4M CHANGE NO */}
          <div className="space-y-[4px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">4M Change No</label>
            <input 
              type="text" 
              placeholder="Click a row to select"
              value={formChangeNo}
              disabled
              className="w-full bg-slate-100 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none text-slate-550 select-none"
            />
          </div>

          {/* REQUESTED DATE */}
          <div className="space-y-[4px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Requested Date</label>
            <input 
              type="text" 
              placeholder="Click a row to select"
              value={formDate}
              disabled
              className="w-full bg-slate-100 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none text-slate-550 select-none"
            />
          </div>

          {/* CHANGE REQUEST BY */}
          <div className="space-y-[4px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Change Request By</label>
            <input 
              type="text" 
              placeholder="Click a row to select"
              value={formRequester}
              disabled
              className="w-full bg-slate-100 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none text-slate-550 select-none"
            />
          </div>

          {/* APPROVAL STATUS */}
          <div className="space-y-[4px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approval Status <span className="text-rose-500">*</span></label>
            <select 
              value={formStatus} 
              disabled={!selectedChangeId}
              onChange={(e) => setFormStatus(e.target.value)}
              className="w-full bg-slate-50 disabled:bg-slate-100 disabled:cursor-not-allowed border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] cursor-pointer"
            >
              <option value="">Select Status</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Submit / Cancel row */}
          <div className="space-y-[8px] pt-[4px]">
            <button 
              type="submit" 
              disabled={isSubmitting || !selectedChangeId}
              className="w-full flex items-center justify-center gap-[6px] bg-[#e6f0fa] hover:bg-[#d6e6f5] disabled:opacity-50 disabled:cursor-not-allowed border border-[#b2d1f0] text-[#0066cc] py-[10px] rounded-[6px] text-[12px] font-bold transition-all transform active:scale-[0.98] cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  <span>Saving Log...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Save Approval Log</span>
                </>
              )}
            </button>

            {selectedChangeId && (
              <button 
                type="button" 
                onClick={handleCancelEdit}
                className="w-full text-center py-[6px] text-slate-500 hover:text-slate-800 text-[11px] font-semibold cursor-pointer"
              >
                Cancel Selection
              </button>
            )}
          </div>
        </form>
      </div>

      {/* RIGHT COLUMN: Table area */}
      <div className="space-y-[16px]">
        {/* Search & Actions bar */}
        <div className="flex gap-[8px] items-center text-[11px] flex-wrap">
          <div className="relative flex-grow min-w-[200px]">
            <Search className="absolute left-[10px] top-[10px] text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search by change no or requester..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-[30px] pr-[12px] py-[8px] border border-slate-200 rounded-[6px] outline-none bg-white text-[12px] focus:border-[#0066cc]"
            />
          </div>
          
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-[12px] py-[8px] border border-slate-200 bg-white rounded-[6px] outline-none text-[12px] min-w-[150px] focus:border-[#0066cc]"
          >
            <option value="All">All Approval Status</option>
            <option value="Approved">Approved</option>
            <option value="Pending">Pending</option>
            <option value="Rejected">Rejected</option>
          </select>

          <button 
            onClick={handleResetFilters}
            className="flex items-center gap-[6px] bg-white border border-slate-200 hover:bg-slate-50 px-[14px] py-[8px] rounded-[6px] text-[12px] font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        </div>

        {/* Table Matrix */}
        <div className="bg-white border border-slate-200 rounded-[12px] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed min-w-[950px]">
              <thead>
                <tr className="bg-[#fdfaf5] border-b border-slate-150 text-[10px]">
                  <th className="p-[8px] font-bold text-slate-500 uppercase tracking-wider w-[105px]">4M Change No</th>
                  <th className="p-[8px] font-bold text-slate-500 uppercase tracking-wider w-[90px]">Requested Date</th>
                  <th className="p-[8px] font-bold text-slate-500 uppercase tracking-wider w-[110px]">Change Request By</th>
                  <th className="p-[8px] font-bold text-slate-500 uppercase tracking-wider text-center w-[75px]">PED</th>
                  <th className="p-[8px] font-bold text-slate-500 uppercase tracking-wider text-center w-[75px]">Quality</th>
                  <th className="p-[8px] font-bold text-slate-500 uppercase tracking-wider text-center w-[85px]">Production</th>
                  <th className="p-[8px] font-bold text-slate-500 uppercase tracking-wider text-center w-[85px]">Maintenance</th>
                  <th className="p-[8px] font-bold text-slate-500 uppercase tracking-wider text-center w-[75px]">PC & L</th>
                  <th className="p-[8px] font-bold text-slate-500 uppercase tracking-wider text-center w-[85px]">Materials</th>
                  <th className="p-[8px] font-bold text-slate-500 uppercase tracking-wider text-center w-[85px]">Marketing</th>
                  <th className="p-[8px] font-bold text-slate-500 uppercase tracking-wider text-center w-[90px]">HR & Safety</th>
                  <th className="p-[8px] font-bold text-slate-500 uppercase tracking-wider text-center w-[85px]">Unit Head</th>
                  <th className="p-[8px] font-bold text-slate-500 uppercase tracking-wider text-center w-[65px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {isFetchingLogs ? (
                  <tr>
                    <td colSpan={13} className="text-center py-[48px] text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-[8px]">
                        <Loader2 className="animate-spin text-[#0066cc]" size={20} />
                        <span>Fetching approvals data...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center py-[48px] text-slate-400">
                      No L3 validation approval records found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, idx) => {
                    const isSelected = selectedChangeId === log.changeNo;
                    return (
                      <tr 
                        key={idx} 
                        onClick={() => handleSelectRow(log)}
                        className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${
                          isSelected ? 'bg-sky-50/60 hover:bg-sky-50/60 border-l-[3px] border-l-[#0066cc]' : ''
                        }`}
                      >
                        <td className="p-[8px] font-bold text-[#0066cc]">{log.changeNo}</td>
                        <td className="p-[8px] text-slate-500">{log.date}</td>
                        <td className="p-[8px] font-medium text-slate-700 truncate" title={log.requester}>{log.requester}</td>
                        
                        {/* Department Badges */}
                        {[
                          { val: log.ped, type: 'ped' },
                          { val: log.quality, type: 'quality' },
                          { val: log.production, type: 'production' },
                          { val: log.maintenance, type: 'maintenance' },
                          { val: log.pcl, type: 'pcl' },
                          { val: log.materials, type: 'materials' },
                          { val: log.marketing, type: 'marketing' },
                          { val: log.hrSafety, type: 'hrSafety' },
                          { val: log.unitHead, type: 'unitHead' }
                        ].map((cell, cIdx) => {
                          const status = cell.val;
                          const isAccepted = status === 'Accepted' || status === 'Approved';
                          const isRejected = status === 'Rejected';
                          return (
                            <td key={cIdx} className="p-[8px] text-center">
                              <span className={`inline-block w-full text-center px-[4px] py-[2px] rounded-[4px] border text-[9px] font-bold ${
                                isAccepted 
                                  ? 'bg-emerald-50 border-emerald-250 text-emerald-700' 
                                  : isRejected 
                                  ? 'bg-rose-50 border-rose-250 text-rose-700' 
                                  : 'bg-amber-50 border-amber-250 text-amber-700'
                              }`}>
                                {status}
                              </span>
                            </td>
                          );
                        })}

                        <td className="p-[8px] text-center" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => setSelectedLog(log)}
                            className="p-[4px] hover:bg-slate-100 rounded text-slate-400 hover:text-[#0066cc] transition-colors cursor-pointer"
                          >
                            <Eye size={12} />
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

      {/* L3 Matrix Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-[16px]">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setSelectedLog(null)}
          />
          
          {/* Modal Container */}
          <div className="relative bg-white w-full max-w-[600px] rounded-[16px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-10">
            {/* Header */}
            <div className="bg-slate-50 px-[24px] py-[18px] border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-[8px]">
                <Eye size={16} className="text-[#0066cc]" />
                <h4 className="text-[14px] font-bold text-slate-800">L3 Approval Matrix</h4>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="p-[4px] hover:bg-slate-200/60 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-[24px] space-y-[20px] text-[13px] text-slate-650">
              {/* Metadata */}
              <div className="grid grid-cols-3 gap-[16px] pb-[16px] border-b border-slate-100">
                <div className="space-y-[4px]">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">4M Change No</span>
                  <span className="font-bold text-[#0066cc] text-[13px]">{selectedLog.changeNo}</span>
                </div>
                <div className="space-y-[4px]">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Change Request By</span>
                  <span className="font-medium text-slate-700">{selectedLog.requester}</span>
                </div>
                <div className="space-y-[4px]">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Requested Date</span>
                  <span className="font-medium text-slate-700">{selectedLog.date}</span>
                </div>
              </div>

              {/* Matrix Grid */}
              <div className="space-y-[10px]">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department Matrix Approval Status</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-[12px]">
                  {[
                    { label: 'PED', value: selectedLog.ped },
                    { label: 'Quality', value: selectedLog.quality },
                    { label: 'Production', value: selectedLog.production },
                    { label: 'Maintenance', value: selectedLog.maintenance },
                    { label: 'PC & L', value: selectedLog.pcl },
                    { label: 'Materials', value: selectedLog.materials },
                    { label: 'Marketing', value: selectedLog.marketing },
                    { label: 'HR & Safety', value: selectedLog.hrSafety },
                    { label: 'Unit Head', value: selectedLog.unitHead }
                  ].map((dept, index) => {
                    const status = dept.value;
                    const isAccepted = status === 'Accepted' || status === 'Approved';
                    const isRejected = status === 'Rejected';
                    const badgeClass = isAccepted 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                      : isRejected 
                      ? 'bg-rose-50 border-rose-200 text-rose-700' 
                      : 'bg-amber-50 border-amber-200 text-amber-700';

                    return (
                      <div 
                        key={index} 
                        className="bg-slate-50 border border-slate-150 rounded-[10px] p-[12px] flex flex-col items-center justify-center text-center gap-[6px] shadow-sm hover:shadow transition-shadow"
                      >
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{dept.label}</span>
                        <span className={`inline-block px-[10px] py-[3px] rounded-full border text-[10px] font-bold shadow-sm ${badgeClass}`}>
                          {status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-[24px] py-[16px] bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setSelectedLog(null)}
                className="px-[16px] py-[8px] bg-white border border-slate-200 rounded-[6px] text-slate-600 hover:bg-slate-50 hover:text-slate-800 text-[12px] font-semibold transition-colors shadow-sm cursor-pointer"
              >
                Close Matrix
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Warning Modal */}
      {validationError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-[16px]">
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs" onClick={() => setValidationError('')} />
          <div className="relative bg-white w-full max-w-[400px] rounded-[12px] shadow-xl border border-slate-200 p-[20px] z-10 flex flex-col items-center text-center gap-[12px] animate-fade-in-up">
            <div className="w-[48px] h-[48px] rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500">
              <AlertTriangle size={24} />
            </div>
            <h4 className="text-[14px] font-bold text-slate-950">Validation Warning</h4>
            <p className="text-[12px] text-slate-500 leading-relaxed">{validationError}</p>
            <button 
              onClick={() => setValidationError('')} 
              className="mt-[4px] w-full py-[8px] bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-[6px] text-[12px] transition-colors cursor-pointer"
            >
              Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
