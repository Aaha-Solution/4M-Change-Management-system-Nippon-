import { useState, useEffect } from 'react';
import { Save, Search, RotateCcw, Eye, Paperclip, X, AlertTriangle, Loader2 } from 'lucide-react';
import { getL2ValidationLogs, createL2ValidationLog } from '../api/apiRoutes';

export const L2Validation = ({
  userRole,
  setToastMsg,
  fetchChanges
}) => {
  // Modal states
  const [selectedLog, setSelectedLog] = useState(null);
  const [validationError, setValidationError] = useState('');

  // DB Logs states
  const [validationLogs, setValidationLogs] = useState([]);
  const [isFetchingLogs, setIsFetchingLogs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [formChangeNo, setFormChangeNo] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formRequester, setFormRequester] = useState('');
  const [formStatus, setFormStatus] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [formPedFile, setFormPedFile] = useState('weld-test.png');
  const [formQaFile, setFormQaFile] = useState('weld-test.png');

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [decisionFilter, setDecisionFilter] = useState('All');

  const fetchLogs = async () => {
    setIsFetchingLogs(true);
    try {
      const response = await getL2ValidationLogs();
      setValidationLogs(response.data);
    } catch (err) {
      console.error(err);
      if (setToastMsg) setToastMsg('Error loading L2 validation logs from backend.');
    } finally {
      setIsFetchingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveLog = async (e) => {
    e.preventDefault();

    if (!formChangeNo.trim() || !formDate.trim() || !formRequester.trim() || !formStatus || !formRemarks.trim()) {
      setValidationError('Please fill out all required validation log details.');
      return;
    }

    const logData = {
      changeNo: formChangeNo.trim(),
      date: formDate.trim(),
      requester: formRequester.trim(),
      weldTest: formPedFile,
      qaTest: formQaFile,
      status: formStatus,
      remarks: formRemarks.trim()
    };

    setIsSubmitting(true);
    try {
      await createL2ValidationLog(logData);
      
      if (fetchChanges) await fetchChanges();
      
      if (setToastMsg) {
        setToastMsg(`Successfully saved L2 validation log for ${formChangeNo}`);
      }

      await fetchLogs();

      // Reset Form Fields
      setFormChangeNo('');
      setFormDate('');
      setFormRequester('');
      setFormStatus('');
      setFormRemarks('');
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || 'Error saving L2 validation log to database.';
      setValidationError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setDecisionFilter('All');
  };

  // Filter logic
  const filteredLogs = validationLogs.filter(log => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      log.changeNo.toLowerCase().includes(q) ||
      log.remarks.toLowerCase().includes(q) ||
      log.requester.toLowerCase().includes(q);

    const matchesDecision = decisionFilter === 'All' || log.status === decisionFilter;

    return matchesSearch && matchesDecision;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_2.5fr] gap-[24px] animate-fade-in-up text-slate-800">
      
      {/* LEFT COLUMN: Add L2 Validation Log Form */}
      <div className="bg-white border border-slate-200 rounded-[12px] p-[20px] shadow-sm space-y-[16px] h-fit">
        <div className="flex items-center gap-[8px] border-b border-slate-100 pb-[8px]">
          <Save size={16} className="text-[#0066cc]" />
          <h4 className="text-[13px] font-bold text-slate-900">Add L2 Validation Log</h4>
        </div>

        <form onSubmit={handleSaveLog} className="space-y-[14px]">
          {/* 4M CHANGE NO */}
          <div className="space-y-[4px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">4M Change No <span className="text-rose-500">*</span></label>
            <input 
              type="text" 
              placeholder="e.g. 4M-2026-248"
              value={formChangeNo}
              onChange={(e) => setFormChangeNo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] transition-colors"
            />
          </div>

          {/* REQUESTED DATE */}
          <div className="space-y-[4px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Requested Date <span className="text-rose-500">*</span></label>
            <input 
              type="date" 
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] transition-colors text-slate-500"
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

          {/* REQUESTER VALIDATION (PED) ATTACHMENT */}
          <div className="space-y-[4px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Requester Validation(PED) Attachment <span className="text-rose-500">*</span></label>
            <input 
              type="file" 
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setFormPedFile(e.target.files[0].name);
                }
              }}
              className="w-full text-[11px] text-slate-500 file:mr-[8px] file:py-[4px] file:px-[8px] file:rounded-[4px] file:border file:border-slate-200 file:bg-slate-50 file:text-[11px] file:font-semibold hover:file:bg-slate-100 cursor-pointer"
            />
          </div>

          {/* APPROVER SET UP VERIFICATION (QA) ATTACHMENT */}
          <div className="space-y-[4px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approver Set Up Verification(QA) Attachment <span className="text-rose-500">*</span></label>
            <input 
              type="file" 
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setFormQaFile(e.target.files[0].name);
                }
              }}
              className="w-full text-[11px] text-slate-500 file:mr-[8px] file:py-[4px] file:px-[8px] file:rounded-[4px] file:border file:border-slate-200 file:bg-slate-50 file:text-[11px] file:font-semibold hover:file:bg-slate-100 cursor-pointer"
            />
          </div>

          {/* APPROVER VALIDATION STATUS */}
          <div className="space-y-[4px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approver Validation Status <span className="text-rose-500">*</span></label>
            <select 
              value={formStatus} 
              onChange={(e) => setFormStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] transition-colors"
            >
              <option value="">Select Status</option>
              <option value="Accepted">Accepted</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* REMARKS */}
          <div className="space-y-[4px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remarks <span className="text-rose-500">*</span></label>
            <textarea 
              placeholder="Enter Remarks..."
              rows={3}
              value={formRemarks}
              onChange={(e) => setFormRemarks(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] transition-colors resize-none"
            />
          </div>

          {/* Submit */}
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-[6px] bg-[#e6f0fa] hover:bg-[#d6e6f5] disabled:opacity-60 border border-[#b2d1f0] text-[#0066cc] py-[10px] rounded-[6px] text-[12px] font-bold transition-all transform active:scale-[0.98] cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={14} />
                <span>Saving Validation Log...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Save Validation Log</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* RIGHT COLUMN: Table Area */}
      <div className="space-y-[16px]">
        {/* Search & Action bar */}
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
            value={decisionFilter} 
            onChange={(e) => setDecisionFilter(e.target.value)}
            className="px-[12px] py-[8px] border border-slate-200 bg-white rounded-[6px] outline-none text-[12px] min-w-[120px] focus:border-[#0066cc]"
          >
            <option value="All">All Decisions</option>
            <option value="Accepted">Accepted</option>
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

        {/* Table layout */}
        <div className="bg-white border border-slate-200 rounded-[12px] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#fdfaf5] border-b border-slate-150">
                  <th className="p-[12px] text-[10px] font-bold text-slate-500 uppercase tracking-wider">4M Change No</th>
                  <th className="p-[12px] text-[10px] font-bold text-slate-500 uppercase tracking-wider">Requested Date</th>
                  <th className="p-[12px] text-[10px] font-bold text-slate-500 uppercase tracking-wider">Change Request By</th>
                  <th className="p-[12px] text-[10px] font-bold text-slate-500 uppercase tracking-wider">Requester Validation(PED)</th>
                  <th className="p-[12px] text-[10px] font-bold text-slate-500 uppercase tracking-wider">Approver Set Up Verification(QA)</th>
                  <th className="p-[12px] text-[10px] font-bold text-slate-500 uppercase tracking-wider">Approver Validation Status</th>
                  <th className="p-[12px] text-[10px] font-bold text-slate-500 uppercase tracking-wider">Remarks</th>
                  <th className="p-[12px] text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[12px]">
                {isFetchingLogs ? (
                  <tr>
                    <td colSpan={8} className="text-center py-[48px] text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-[8px]">
                        <Loader2 className="animate-spin text-[#0066cc]" size={20} />
                        <span>Fetching validation logs...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-[48px] text-slate-400">
                      No L2 validation records found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, idx) => (
                    <tr 
                      key={idx} 
                      className="hover:bg-slate-50/50 cursor-pointer"
                      onClick={() => {
                        setFormChangeNo(log.changeNo || '');
                        setFormDate(log.date || '');
                        setFormRequester(log.requester || '');
                        setFormStatus(log.status || '');
                        setFormRemarks(log.remarks || '');
                        setFormPedFile(log.weldTest || 'weld-test.png');
                        setFormQaFile(log.qaTest || 'weld-test.png');
                      }}
                    >
                      <td className="p-[12px] font-bold text-[#0066cc]">{log.changeNo}</td>
                      <td className="p-[12px] text-slate-500">{log.date}</td>
                      <td className="p-[12px] font-medium text-slate-700">{log.requester}</td>
                      <td className="p-[12px]">
                        <span className="inline-flex items-center gap-[4px] text-slate-500 hover:text-[#0066cc] cursor-pointer">
                          <Paperclip size={12} className="text-slate-400" />
                          <span className="underline truncate max-w-[120px]">{log.weldTest}</span>
                        </span>
                      </td>
                      <td className="p-[12px]">
                        <span className="inline-flex items-center gap-[4px] text-slate-500 hover:text-[#0066cc] cursor-pointer">
                          <Paperclip size={12} className="text-slate-400" />
                          <span className="underline truncate max-w-[120px]">{log.qaTest}</span>
                        </span>
                      </td>
                      <td className="p-[12px]">
                        <span className={`inline-flex items-center px-[8px] py-[2px] rounded-full text-[10px] font-semibold border ${
                          log.status === 'Accepted' 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                            : 'bg-rose-50 border-rose-200 text-rose-700'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="p-[12px] text-slate-500 max-w-[220px] truncate" title={log.remarks}>
                        {log.remarks}
                      </td>
                      <td className="p-[12px] text-center">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="p-[4px] hover:bg-slate-100 rounded text-slate-400 hover:text-[#0066cc] transition-colors cursor-pointer"
                        >
                          <Eye size={14} />
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

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-[16px]">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setSelectedLog(null)}
          />
          
          {/* Modal Container */}
          <div className="relative bg-white w-full max-w-[500px] rounded-[16px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-10">
            {/* Header */}
            <div className="bg-slate-50 px-[24px] py-[18px] border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-[8px]">
                <Eye size={16} className="text-[#0066cc]" />
                <h4 className="text-[14px] font-bold text-slate-800">Validation Log Details</h4>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="p-[4px] hover:bg-slate-200/60 rounded-full text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-[24px] space-y-[16px] text-[13px] text-slate-600">
              <div className="grid grid-cols-2 gap-[16px]">
                <div className="space-y-[4px]">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">4M Change No</span>
                  <span className="font-bold text-[#0066cc] text-[13px]">{selectedLog.changeNo}</span>
                </div>
                <div className="space-y-[4px]">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Requested Date</span>
                  <span className="font-medium text-slate-700">{selectedLog.date}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-[16px] pt-[8px] border-t border-slate-100">
                <div className="space-y-[4px]">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Change Request By</span>
                  <span className="font-medium text-slate-700">{selectedLog.requester}</span>
                </div>
                <div className="space-y-[4px]">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Validation Status</span>
                  <div>
                    <span className={`inline-flex items-center px-[8px] py-[2px] rounded-full text-[10px] font-semibold border ${
                      selectedLog.status === 'Accepted' 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}>
                      {selectedLog.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-[6px] pt-[8px] border-t border-slate-100">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attachments</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px]">
                  <div className="bg-slate-50 border border-slate-150 rounded-[8px] p-[10px] flex items-center justify-between">
                    <div className="flex items-center gap-[6px] min-w-0">
                      <Paperclip size={14} className="text-slate-400 flex-shrink-0" />
                      <span className="text-[11px] font-medium text-slate-600 truncate" title={selectedLog.weldTest}>
                        {selectedLog.weldTest}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-200/50 px-[4px] py-[2px] rounded">
                      PED
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-150 rounded-[8px] p-[10px] flex items-center justify-between">
                    <div className="flex items-center gap-[6px] min-w-0">
                      <Paperclip size={14} className="text-slate-400 flex-shrink-0" />
                      <span className="text-[11px] font-medium text-slate-600 truncate" title={selectedLog.qaTest}>
                        {selectedLog.qaTest}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-200/50 px-[4px] py-[2px] rounded">
                      QA
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-[4px] pt-[8px] border-t border-slate-100">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remarks / Comments</span>
                <div className="bg-slate-50 border border-slate-150 rounded-[8px] p-[12px] text-[12px] text-slate-600 leading-relaxed max-h-[120px] overflow-y-auto">
                  {selectedLog.remarks}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-[24px] py-[16px] bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setSelectedLog(null)}
                className="px-[16px] py-[8px] bg-white border border-slate-200 rounded-[6px] text-slate-600 hover:bg-slate-50 hover:text-slate-800 text-[12px] font-semibold transition-colors shadow-sm cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Warning Modal */}
      {validationError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-[16px]">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setValidationError('')}
          />
          
          {/* Modal Container */}
          <div className="relative bg-white w-full max-w-[400px] rounded-[16px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-10">
            {/* Header */}
            <div className="bg-rose-50 px-[20px] py-[14px] border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-[8px] text-rose-800">
                <AlertTriangle size={16} className="text-rose-600" />
                <h4 className="text-[13px] font-bold">Validation Alert</h4>
              </div>
              <button 
                onClick={() => setValidationError('')}
                className="p-[4px] hover:bg-rose-100/60 rounded-full text-rose-450 hover:text-rose-650 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-[20px] text-[12px] text-slate-600 leading-relaxed">
              {validationError}
            </div>

            {/* Footer */}
            <div className="px-[20px] py-[12px] bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setValidationError('')}
                className="px-[14px] py-[6px] bg-rose-600 hover:bg-rose-700 text-white rounded-[6px] text-[12px] font-semibold transition-colors shadow-sm cursor-pointer"
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
