import { useState } from 'react';
import { Save, Search, RotateCcw, Eye, X } from 'lucide-react';

export const L3RequestTracker = ({
  userEmail,
  onTabChange,
  changes,
  setChanges,
  logAction,
  setToastMsg
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  // Baseline data from L3 mockup
  const [approvalLogs, setApprovalLogs] = useState([
    { changeNo: '4M-2026-248', date: '20 May', requester: 'Kumar Selvam', ped: 'Accepted', quality: 'Accepted', production: 'Approved', maintenance: 'Pending', pcl: 'Pending', materials: 'Pending', marketing: 'Pending', hrSafety: 'Pending', unitHead: 'Approved' },
    { changeNo: '4M-2026-247', date: '19 May', requester: 'Ravi QA', ped: 'Accepted', quality: 'Accepted', production: 'Approved', maintenance: 'Pending', pcl: 'Pending', materials: 'Pending', marketing: 'Pending', hrSafety: 'Pending', unitHead: 'Approved' },
    { changeNo: '4M-2026-246', date: '18 May', requester: 'Kumar S.', ped: 'Accepted', quality: 'Accepted', production: 'Pending', maintenance: 'Pending', pcl: 'Pending', materials: 'Pending', marketing: 'Pending', hrSafety: 'Pending', unitHead: 'Pending' },
    { changeNo: '4M-2026-244', date: '17 May', requester: 'John Doe', ped: 'Rejected', quality: 'Rejected', production: 'Pending', maintenance: 'Pending', pcl: 'Pending', materials: 'Pending', marketing: 'Pending', hrSafety: 'Pending', unitHead: 'Pending' },
    { changeNo: '4M-2026-243', date: '16 May', requester: 'Ravi QA', ped: 'Accepted', quality: 'Accepted', production: 'Approved', maintenance: 'Pending', pcl: 'Pending', materials: 'Pending', marketing: 'Pending', hrSafety: 'Pending', unitHead: 'Approved' },
    { changeNo: '4M-2026-241', date: '14 May', requester: 'Kumar S.', ped: 'Accepted', quality: 'Accepted', production: 'Approved', maintenance: 'Pending', pcl: 'Pending', materials: 'Pending', marketing: 'Pending', hrSafety: 'Pending', unitHead: 'Approved' }
  ]);

  // Form states
  const [formChangeNo, setFormChangeNo] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formRequester, setFormRequester] = useState('');
  const [formStatus, setFormStatus] = useState('');

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const handleSaveApproval = (e) => {
    e.preventDefault();

    if (!formChangeNo.trim() || !formDate.trim() || !formRequester.trim() || !formStatus) {
      setToastMsg('Please fill out all required L3 approval log details.');
      return;
    }

    setIsSubmitting(true);

    const newLog = {
      changeNo: formChangeNo.trim(),
      date: formDate.trim(),
      requester: formRequester.trim(),
      ped: formStatus === 'Approved' ? 'Accepted' : formStatus === 'Rejected' ? 'Rejected' : 'Pending',
      quality: formStatus === 'Approved' ? 'Accepted' : formStatus === 'Rejected' ? 'Rejected' : 'Pending',
      production: formStatus,
      maintenance: 'Pending',
      pcl: 'Pending',
      materials: 'Pending',
      marketing: 'Pending',
      hrSafety: 'Pending',
      unitHead: formStatus
    };

    setApprovalLogs([newLog, ...approvalLogs]);
    setToastMsg(`Successfully saved L3 approval log for ${formChangeNo}`);
    logAction('L3 Log Saved', `Successfully logged L3 approval status: "${formStatus}" for Change No: ${formChangeNo}`);

    // Reset Form Fields
    setFormChangeNo('');
    setFormDate('');
    setFormRequester('');
    setFormStatus('');
    setIsSubmitting(false);
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
          {/* LOGGED-IN USER ROLE */}
          <div className="space-y-[4px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Logged-in User Role</label>
            <div className="w-full bg-slate-50 border border-slate-200 text-[#0066cc] font-bold rounded-[6px] py-[8px] px-[12px] text-[12px] select-none">
              Quality Approver
            </div>
          </div>

          {/* 4M CHANGE NO */}
          <div className="space-y-[4px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">4M Change No <span className="text-rose-500">*</span></label>
            <input 
              type="text" 
              placeholder="e.g. 4M-2026-246"
              value={formChangeNo}
              onChange={(e) => setFormChangeNo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] transition-colors"
            />
          </div>

          {/* REQUESTED DATE */}
          <div className="space-y-[4px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Requested Date <span className="text-rose-500">*</span></label>
            <input 
              type="text" 
              placeholder="e.g. 18 May"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] transition-colors"
            />
          </div>

          {/* CHANGE REQUEST BY */}
          <div className="space-y-[4px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Change Request By <span className="text-rose-500">*</span></label>
            <input 
              type="text" 
              placeholder="e.g. Kumar Selvam"
              value={formRequester}
              onChange={(e) => setFormRequester(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] transition-colors"
            />
          </div>

          {/* APPROVAL STATUS */}
          <div className="space-y-[4px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approval Status <span className="text-rose-500">*</span></label>
            <select 
              value={formStatus} 
              onChange={(e) => setFormStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] transition-colors"
            >
              <option value="">Select Status</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Submit */}
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-[6px] bg-[#e6f0fa] hover:bg-[#d6e6f5] border border-[#b2d1f0] text-[#0066cc] py-[10px] rounded-[6px] text-[12px] font-bold transition-all transform active:scale-[0.98] cursor-pointer"
          >
            <Save size={14} />
            <span>Save Approval Log</span>
          </button>
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
              placeholder="Search by change no or remarks..." 
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
            <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
              <thead>
                <tr className="bg-[#fdfaf5] border-b border-slate-150 text-[10px]">
                  <th className="p-[8px] font-bold text-slate-500 uppercase tracking-wider w-[100px]">4M Change No</th>
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
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center py-[48px] text-slate-400">
                      No L3 validation approval records found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
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

                      <td className="p-[8px] text-center">
                        <button 
                          onClick={() => setSelectedLog(log)}
                          className="p-[4px] hover:bg-slate-100 rounded text-slate-400 hover:text-[#0066cc] transition-colors cursor-pointer"
                        >
                          <Eye size={12} />
                        </button>
                      </td>
                    </tr>
                  ))
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
    </div>
  );
};
