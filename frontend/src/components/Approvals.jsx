import { useState } from 'react';
import { Save, Search, RotateCcw, Eye, Paperclip } from 'lucide-react';

export const Approvals = ({
  userRole,
  changes,
  onStatusUpdate
}) => {
  // Mock validation log baseline
  const [validationLogs, setValidationLogs] = useState([
    { changeNo: '4M-2026-248', date: '20 May', requester: 'Kumar Selvam', weldTest: 'weld-test.png', qaTest: 'weld-test.png', status: 'Accepted', remarks: 'Zero alignment issues reported in shift logs. Production output exceeds threshold.' },
    { changeNo: '4M-2026-247', date: '19 May', requester: 'Ravi QA', weldTest: 'calib-report.pdf', qaTest: 'calib-report.pdf', status: 'Accepted', remarks: 'Calibration setup validated. GR&R is within 5%.' },
    { changeNo: '4M-2026-246', date: '18 May', requester: 'Kumar S.', weldTest: 'mock-run-logs.xls', qaTest: 'mock-run-logs.xls', status: 'Accepted', remarks: 'PED validation completed successfully on mock runs.' },
    { changeNo: '4M-2026-244', date: '17 May', requester: 'John Doe', weldTest: 'training-log.pdf', qaTest: 'training-log.pdf', status: 'Rejected', remarks: 'Evidence of training incomplete for Operator B. Training records missing.' },
    { changeNo: '4M-2026-243', date: '16 May', requester: 'Ravi QA', weldTest: 'gauge-rr-may20.pdf', qaTest: 'gauge-rr-may20.pdf', status: 'Accepted', remarks: 'Gauge repeatability improved by 14%. Zero repeat defects. Implementation consistent.' },
    { changeNo: '4M-2026-241', date: '14 May', requester: 'Kumar S.', weldTest: 'coolant-spec.pdf', qaTest: 'coolant-spec.pdf', status: 'Accepted', remarks: 'Coolant viscosity specs match engineering standard.' }
  ]);

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

  const handleSaveLog = (e) => {
    e.preventDefault();

    if (!formChangeNo.trim() || !formDate.trim() || !formRequester.trim() || !formStatus || !formRemarks.trim()) {
      alert('Please fill out all required validation log details.');
      return;
    }

    const newLog = {
      changeNo: formChangeNo.trim(),
      date: formDate.trim(),
      requester: formRequester.trim(),
      weldTest: formPedFile,
      qaTest: formQaFile,
      status: formStatus,
      remarks: formRemarks.trim()
    };

    setValidationLogs([newLog, ...validationLogs]);

    // Reset Form Fields
    setFormChangeNo('');
    setFormDate('');
    setFormRequester('');
    setFormStatus('');
    setFormRemarks('');
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
              type="text" 
              placeholder="e.g. 20 May"
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
            className="w-full flex items-center justify-center gap-[6px] bg-[#e6f0fa] hover:bg-[#d6e6f5] border border-[#b2d1f0] text-[#0066cc] py-[10px] rounded-[6px] text-[12px] font-bold transition-all transform active:scale-[0.98] cursor-pointer"
          >
            <Save size={14} />
            <span>Save Validation Log</span>
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
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-[48px] text-slate-400">
                      No L2 validation records found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
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
                          onClick={() => alert(`Log details for ${log.changeNo}:\n\nRequester: ${log.requester}\nDate: ${log.date}\nStatus: ${log.status}\nRemarks: ${log.remarks}`)}
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
    </div>
  );
};
