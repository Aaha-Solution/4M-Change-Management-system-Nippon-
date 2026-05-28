import { useState } from 'react';
import { AlertTriangle, Paperclip, RefreshCw, Search, Trash2, X } from 'lucide-react';

export const Effectiveness = ({
  changes,
  effectivenessLogs,
  setEffectivenessLogs,
  logAction,
  setToastMsg
}) => {
  // Effectiveness Monitoring Form States
  const [effChangeNo, setEffChangeNo] = useState('');
  const [effMonthWise, setEffMonthWise] = useState('2026-05');
  const [effRemarks, setEffRemarks] = useState('');
  const [effAttachment, setEffAttachment] = useState('');
  const [effStatus, setEffStatus] = useState('');
  const [effQaApproval, setEffQaApproval] = useState('');
  const [editingEffLogId, setEditingEffLogId] = useState(null);
  const [deleteEffLogId, setDeleteEffLogId] = useState(null);
  const [fileUrls, setFileUrls] = useState({});

  const handleViewAttachment = (filename) => {
    if (!filename) return;
    const url = fileUrls[filename];
    if (url) {
      window.open(url, '_blank');
    } else {
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head>
              <title>Preview - ${filename}</title>
              <script src="https://cdn.tailwindcss.com"></script>
              <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
              <style>
                body { font-family: 'Inter', sans-serif; }
              </style>
            </head>
            <body class="bg-slate-50 flex flex-col items-center justify-center min-h-screen p-6">
              <div class="bg-white border border-slate-200 rounded-2xl p-8 shadow-xl max-w-md w-full text-center space-y-6">
                <div class="w-20 h-20 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto text-4xl">
                  📄
                </div>
                <div>
                  <h2 class="text-xl font-bold text-slate-800">${filename}</h2>
                  <p class="text-sm text-slate-500 mt-1">Mock Attachment Document</p>
                </div>
                <div class="border-t border-b border-slate-100 py-4 text-left text-xs text-slate-500 space-y-2">
                  <div class="flex justify-between"><span class="font-semibold text-slate-600">File Type:</span> <span>${filename.split('.').pop().toUpperCase()} File</span></div>
                  <div class="flex justify-between"><span class="font-semibold text-slate-600">Storage:</span> <span>Local Mock System</span></div>
                  <div class="flex justify-between"><span class="font-semibold text-slate-600">Verification Status:</span> <span class="text-emerald-600 font-bold">Verified</span></div>
                </div>
                <p class="text-xs text-slate-400 italic">This is a mock visualization of the uploaded evidence log file for demonstration purposes.</p>
                <button onclick="window.close()" class="w-full py-2 bg-[#0066cc] hover:bg-[#0052a3] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer">
                  Close Preview
                </button>
              </div>
            </body>
          </html>
        `);
        newWindow.document.close();
      }
    }
  };

  // Search & Filter States
  const [effSearch, setEffSearch] = useState('');
  const [effFilterStatus, setEffFilterStatus] = useState('All');
  const [effFilterMonth, setEffFilterMonth] = useState('All');

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
    if (!effStatus) {
      setToastMsg('Please select Effectiveness Status.');
      return;
    }
    if (!effQaApproval) {
      setToastMsg('Please select QA Approval Decision.');
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
      setEffStatus('');
      setEffQaApproval('');
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
    setEffStatus('');
    setEffQaApproval('');
  };

  const handleSelectChangeNo = (val) => {
    setEffChangeNo(val);
    setEffMonthWise('2026-05');
    setEffRemarks('');
    setEffAttachment('');
    setEffStatus('');
    setEffQaApproval('');
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

  const filteredLogs = effectivenessLogs.filter(log => {
    const query = effSearch.toLowerCase();
    const matchesSearch = log.changeNo.toLowerCase().includes(query) ||
      log.context.toLowerCase().includes(query) ||
      log.remarks.toLowerCase().includes(query);
    const matchesStatus = effFilterStatus === 'All' || log.status === effFilterStatus;
    const matchesMonth = effFilterMonth === 'All' || formatMonthWise(log.monthWise) === effFilterMonth;
    return matchesSearch && matchesStatus && matchesMonth;
  });

  const selectedChange = changes.find(c => c.id === effChangeNo);
  const currentLog = effectivenessLogs.find(l => l.id === editingEffLogId);

  // Derive values for requested date, context, start date
  let displayReqDate = '';
  let displayContext = '';
  let displayStartDate = '';

  if (editingEffLogId && currentLog) {
    displayReqDate = formatDateShort(currentLog.reqDate);
    displayContext = currentLog.context;
    displayStartDate = formatDateShort(currentLog.startDate);
  } else if (selectedChange) {
    displayReqDate = formatDateShort(selectedChange.date);
    displayContext = selectedChange.title;
    displayStartDate = formatDateShort(selectedChange.date);
  }

  return (
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
              {editingEffLogId || effChangeNo ? (
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
                  onChange={(e) => handleSelectChangeNo(e.target.value)}
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

            {/* Requested Date (Read Only) */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase">Requested Date *</label>
              <input
                type="text"
                disabled
                placeholder="e.g. 16 May"
                className="w-full bg-slate-100 border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-500 cursor-not-allowed"
                value={displayReqDate}
              />
            </div>

            {/* Context of Change (Read Only) */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase">Context of Change *</label>
              <input
                type="text"
                disabled
                placeholder="e.g. Gauge R&R Study"
                className="w-full bg-slate-100 border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-500 cursor-not-allowed"
                value={displayContext}
              />
            </div>

            {/* Change Date Start (Read Only) */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase">Change Date Start *</label>
              <input
                type="text"
                disabled
                placeholder="e.g. 17 May"
                className="w-full bg-slate-100 border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-500 cursor-not-allowed"
                value={displayStartDate}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase">Month Wise *</label>
              <input
                type="month"
                required
                disabled={!effChangeNo}
                className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#0066cc] ${!effChangeNo ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-white'}`}
                value={effMonthWise}
                onChange={(e) => setEffMonthWise(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase">Observation Remarks *</label>
              <textarea
                required
                disabled={!effChangeNo}
                rows={3}
                placeholder="Enter evaluation remarks/results..."
                className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#0066cc] ${!effChangeNo ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-white'}`}
                value={effRemarks}
                onChange={(e) => setEffRemarks(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase">Attachments</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    disabled={!effChangeNo}
                    placeholder="e.g. proof-log.pdf"
                    className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#0066cc] pr-8 ${!effChangeNo ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-white'}`}
                    value={effAttachment}
                    onChange={(e) => setEffAttachment(e.target.value)}
                  />
                  {effAttachment && (
                    <button
                      type="button"
                      disabled={!effChangeNo}
                      onClick={() => setEffAttachment('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Clear all attachments"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <label className={`flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer ${!effChangeNo ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-white hover:bg-slate-50 text-slate-700'}`}>
                  <Paperclip size={14} />
                  <span>Upload</span>
                  <input
                    type="file"
                    multiple
                    disabled={!effChangeNo}
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        const names = Array.from(e.target.files).map(f => f.name);
                        
                        // Store object URLs for preview
                        const newUrls = {};
                        Array.from(e.target.files).forEach(file => {
                          newUrls[file.name] = URL.createObjectURL(file);
                        });
                        setFileUrls(prev => ({ ...prev, ...newUrls }));

                        const existing = effAttachment ? effAttachment.split(',').map(s => s.trim()).filter(Boolean) : [];
                        const updated = Array.from(new Set([...existing, ...names])).join(', ');
                        setEffAttachment(updated);
                      }
                    }}
                  />
                </label>
              </div>

              {/* Render Selected File Pills */}
              {effAttachment && (
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {effAttachment.split(',').map(s => s.trim()).filter(Boolean).map((file, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-700 px-2 py-0.5 rounded-full select-none">
                      <span 
                        onClick={() => handleViewAttachment(file)}
                        className="truncate max-w-[150px] cursor-pointer hover:underline text-teal-700 font-semibold" 
                        title="Click to view file"
                      >
                        📎 {file}
                      </span>
                      <button
                        type="button"
                        disabled={!effChangeNo}
                        onClick={() => {
                          const existing = effAttachment.split(',').map(s => s.trim()).filter(Boolean);
                          const updated = existing.filter(f => f !== file).join(', ');
                          setEffAttachment(updated);
                        }}
                        className="text-slate-400 hover:text-rose-650 font-bold ml-0.5 cursor-pointer text-xs"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase">Effectiveness Status *</label>
              <select
                required
                disabled={!effChangeNo}
                className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#0066cc] ${!effChangeNo ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-white'}`}
                value={effStatus}
                onChange={(e) => setEffStatus(e.target.value)}
              >
                <option value="">Select Status</option>
                <option value="Effectiveness Ok">Effectiveness Ok</option>
                <option value="Effectiveness Not Ok">Effectiveness Not Ok</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase">QA Approval Decision *</label>
              <select
                required
                disabled={!effChangeNo}
                className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#0066cc] ${!effChangeNo ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-white'}`}
                value={effQaApproval}
                onChange={(e) => setEffQaApproval(e.target.value)}
              >
                <option value="">Select QA Decision</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="submit"
                disabled={!effChangeNo}
                className={`flex-1 py-2 text-white text-xs font-bold rounded-lg transition-colors ${!effChangeNo ? 'bg-[#0066cc]/50 cursor-not-allowed' : 'bg-[#0066cc] hover:bg-[#0052a3] cursor-pointer'}`}
              >
                {editingEffLogId ? 'Save Changes' : 'Add Log Entry'}
              </button>
              {(editingEffLogId || effChangeNo) && (
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
              className="px-3 py-1.5 border border-slate-200 text-slate-650 hover:bg-slate-50 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
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
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-400">
                        No observations logs recorded.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map(log => {
                      const isEditing = editingEffLogId === log.id;
                      return (
                        <tr
                          key={log.id}
                          className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${isEditing ? 'bg-sky-50/50' : ''}`}
                          onClick={() => handleSelectRowForEdit(log)}
                        >
                          <td className="p-3 font-mono font-bold text-slate-650">{log.changeNo}</td>
                          <td className="p-3 text-slate-500">{formatDateShort(log.reqDate)}</td>
                          <td className="p-3 font-medium text-slate-800">{log.context}</td>
                          <td className="p-3 font-medium">{formatMonthWise(log.monthWise)}</td>
                          <td className="p-3 max-w-[200px] truncate text-slate-500" title={log.remarks}>{log.remarks}</td>
                          <td className="p-3 font-mono text-teal-655">
                            {log.attachment ? (
                              <div className="flex flex-col gap-1">
                                {log.attachment.split(',').map(s => s.trim()).filter(Boolean).map((file, idx) => (
                                  <span 
                                    key={idx} 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewAttachment(file);
                                    }}
                                    className="inline-flex items-center gap-1 bg-slate-50 border border-slate-150 text-[10px] font-medium text-slate-700 px-1.5 py-0.5 rounded-full w-max max-w-[120px] truncate hover:bg-slate-100 hover:border-teal-500 hover:text-teal-700 cursor-pointer" 
                                    title="Click to view file"
                                  >
                                    📎 {file}
                                  </span>
                                ))}
                              </div>
                            ) : '-'}
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
              <button onClick={() => setDeleteEffLogId(null)} className="text-slate-400 hover:text-slate-655">
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
  );
};
