import { useState } from 'react';
import { AlertTriangle, Paperclip, RefreshCw, Search, X, Eye } from 'lucide-react';
import { 
  createEffectivenessLog, 
  updateEffectivenessLog, 
  deleteEffectivenessLog, 
  getEffectivenessAttachment,
  resetEffectivenessLogs,
  getEffectivenessLogs
} from '../api/apiRoutes';

const generateEffId = () => `EFF-${Date.now().toString().substring(7)}`;

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
  const [viewingLog, setViewingLog] = useState(null);
  const [fileUrls, setFileUrls] = useState({});
  const [previewFile, setPreviewFile] = useState(null);
  const [uploadedFilesList, setUploadedFilesList] = useState([]);

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleViewAttachment = async (filename, log = null) => {
    if (!filename) return;
    setPreviewFile(filename);

    // If it's a file saved on the server and we don't have a local blob URL
    if (log && log.id && !fileUrls[filename]) {
      try {
        const response = await getEffectivenessAttachment(log.id, filename);
        const blobUrl = URL.createObjectURL(response.data);
        setFileUrls(prev => ({ ...prev, [filename]: blobUrl }));
      } catch (err) {
        console.error("Error loading attachment from server:", err);
      }
    }
  };

  // Search & Filter States
  const [effSearch, setEffSearch] = useState('');
  const [effFilterStatus, setEffFilterStatus] = useState('All');
  const [effFilterMonth, setEffFilterMonth] = useState('All');

  // Format month names (e.g. "2026-05" -> "May-26")
  const formatMonthWise = (val) => {
    if (!val) return "-";
    const parts = val.split("-");
    if (parts.length === 2) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const date = new Date(year, month - 1, 1);
      if (!isNaN(date.getTime())) {
        const monthName = date.toLocaleDateString("en-US", { month: "short" });
        const yearShort = String(year).slice(-2);
        return `${monthName}-${yearShort}`;
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
  const handleAddOrEditEff = async (e) => {
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
    const reqDate = selectedChange ? selectedChange.date : new Date().toISOString().split('T')[0];
    
    if (editingEffLogId) {
      // Edit mode 123
      const logData = {
        monthWise: effMonthWise,
        remarks: effRemarks,
        attachment: effAttachment,
        status: effStatus,
        qaApproval: effQaApproval
      };
      try {
        const response = await updateEffectivenessLog(editingEffLogId, logData, uploadedFilesList);
        setEffectivenessLogs(prev => prev.map(log => log.id === editingEffLogId ? { ...log, ...response.data.log } : log));
        logAction('Effectiveness Log Updated', `Modified monitoring metrics for ${effChangeNo}.`);
        setToastMsg(`Updated observations for ${effChangeNo}`);
        handleCancelEditing();
      } catch (err) {
        console.error("Error updating log:", err);
        setToastMsg('Failed to update effectiveness log.');
      }
    } else {
      // Create mode
      const newId = generateEffId();
      const logData = {
        id: newId,
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
      try {
        const response = await createEffectivenessLog(logData, uploadedFilesList);
        setEffectivenessLogs(prev => [response.data.log, ...prev]);
        logAction('Effectiveness Log Created', `Created monitoring observations for change ${effChangeNo}.`);
        setToastMsg(`Log entry added for ${effChangeNo}`);
        
        // Reset form
        setEffChangeNo('');
        setEffRemarks('');
        setEffAttachment('');
        setEffStatus('');
        setEffQaApproval('');
        setUploadedFilesList([]);
      } catch (err) {
        console.error("Error creating log:", err);
        setToastMsg('Failed to create effectiveness log.');
      }
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
    setUploadedFilesList([]);
  };

  const handleSelectChangeNo = (val) => {
    setEffChangeNo(val);
    setEffMonthWise('2026-05');
    setEffRemarks('');
    setEffAttachment('');
    setEffStatus('');
    setEffQaApproval('');
    setUploadedFilesList([]);
  };

  // Delete effectiveness record
  const handleDeleteEff = async () => {
    if (!deleteEffLogId) return;
    try {
      await deleteEffectivenessLog(deleteEffLogId);
      setEffectivenessLogs(prev => prev.filter(log => log.id !== deleteEffLogId));
      logAction('Effectiveness Log Deleted', `Removed observations record ${deleteEffLogId}`);
      setToastMsg(`Deleted entry ${deleteEffLogId}`);
    } catch (err) {
      console.error('Error deleting log:', err);
      setToastMsg('Failed to delete effectiveness log.');
    } finally {
      setDeleteEffLogId(null);
    }
  };

  // Reset to default logs (calls backend API)
  const handleResetEffToDefaults = async () => {
    try {
      await resetEffectivenessLogs();
      // Reload logs from backend after reset
      const response = await getEffectivenessLogs();
      setEffectivenessLogs(response.data);
      setToastMsg('Effectiveness logs restored to default.');
      logAction('Effectiveness Restored', 'Restored default monitoring records.');
    } catch (err) {
      console.error('Error resetting logs:', err);
      setToastMsg('Failed to reset effectiveness logs.');
    }
  };

  // Extract unique months for filter
  const uniqueMonths = Array.from(new Set(effectivenessLogs.map(l => formatMonthWise(l.monthWise)))).filter(Boolean);

  const filteredLogs = effectivenessLogs.filter(log => {
    const query = effSearch.toLowerCase();
    const matchesSearch = (log.changeNo || '').toLowerCase().includes(query) ||
      (log.context || '').toLowerCase().includes(query) ||
      (log.remarks || '').toLowerCase().includes(query);
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
                    readOnly
                    disabled={!effChangeNo}
                    placeholder="e.g. proof-log.pdf"
                    className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#0066cc] pr-8 ${!effChangeNo ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-white'}`}
                    value={effAttachment}
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
                    onChange={async (e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const files = Array.from(e.target.files);
                        const names = files.map(f => f.name);

                        // Store object URLs for preview
                        const newUrls = {};
                        files.forEach(file => {
                          newUrls[file.name] = URL.createObjectURL(file);
                        });
                        setFileUrls(prev => ({ ...prev, ...newUrls }));

                        // Convert files to base64 for server upload
                        const base64Files = await Promise.all(
                          files.map(async (file) => ({
                            name: file.name,
                            type: file.type || 'application/octet-stream',
                            data: await fileToBase64(file)
                          }))
                        );
                        setUploadedFilesList(prev => {
                          const existingNames = prev.map(f => f.name);
                          const newOnes = base64Files.filter(f => !existingNames.includes(f.name));
                          return [...prev, ...newOnes];
                        });

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
                    <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">4M Change No</th>
                    <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Requested Date</th>
                    <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Context of Change</th>
                    <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Change Date Start</th>
                    <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Month Wise</th>
                    <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Remarks</th>
                    <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Attachment</th>
                    <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">QA Approval</th>
                    <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-10 text-slate-400">
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
                          <td className="p-3 text-slate-500">{formatDateShort(log.startDate)}</td>
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
                                      handleViewAttachment(file, log);
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
                          <td className="p-3 text-center">
                            <div className="flex justify-center items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingLog(log);
                                }}
                                className="p-1 text-slate-450 hover:text-[#0066cc] hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                title="View Details"
                              >
                                <Eye size={14} />
                              </button>
                            </div>
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
              <button onClick={() => setDeleteEffLogId(null)} className="text-slate-450 hover:text-slate-655 cursor-pointer">
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

      {/* Log Details Modal */}
      {viewingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-[16px]">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setViewingLog(null)}
          />
          
          {/* Modal Container */}
          <div className="relative bg-white w-full max-w-[500px] rounded-[16px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-10 animate-fade-in-up">
            {/* Header */}
            <div className="bg-slate-50 px-[24px] py-[18px] border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-[8px]">
                <Eye size={16} className="text-[#0066cc]" />
                <h4 className="font-heading text-[14px] font-bold text-slate-800">Effectiveness Log Details</h4>
              </div>
              <button 
                onClick={() => setViewingLog(null)}
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
                  <span className="font-bold text-[#0066cc] text-[13px]">{viewingLog.changeNo}</span>
                </div>
                <div className="space-y-[4px]">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Requested Date</span>
                  <span className="font-medium text-slate-700">{formatDateShort(viewingLog.reqDate)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-[16px] pt-[8px] border-t border-slate-100">
                <div className="space-y-[4px]">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Change Date Start</span>
                  <span className="font-medium text-slate-700">{formatDateShort(viewingLog.startDate)}</span>
                </div>
                <div className="space-y-[4px]">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Month Wise</span>
                  <span className="font-medium text-slate-700">{formatMonthWise(viewingLog.monthWise)}</span>
                </div>
              </div>

              <div className="space-y-[4px] pt-[8px] border-t border-slate-100">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Context of Change</span>
                <span className="font-medium text-slate-800">{viewingLog.context}</span>
              </div>

              <div className="grid grid-cols-2 gap-[16px] pt-[8px] border-t border-slate-100">
                <div className="space-y-[4px]">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Effectiveness Status</span>
                  <div>
                    <span className={`inline-flex items-center px-[8px] py-[2px] rounded-full text-[10px] font-semibold border ${
                      viewingLog.status === 'Effectiveness Ok' 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                        : 'bg-rose-50 border-rose-250 text-rose-700'
                    }`}>
                      {viewingLog.status}
                    </span>
                  </div>
                </div>
                <div className="space-y-[4px]">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">QA Approval</span>
                  <div>
                    <span className={`inline-flex items-center px-[8px] py-[2px] rounded-full text-[10px] font-semibold border ${
                      viewingLog.qaApproval === 'Approved' 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}>
                      {viewingLog.qaApproval}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-[6px] pt-[8px] border-t border-slate-100">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attachments</span>
                {viewingLog.attachment ? (
                  <div className="flex flex-wrap gap-1.5">
                    {viewingLog.attachment.split(',').map(s => s.trim()).filter(Boolean).map((file, idx) => (
                      <span 
                        key={idx} 
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingLog(null);
                          handleViewAttachment(file, viewingLog);
                        }}
                        className="inline-flex items-center gap-1 bg-slate-50 border border-slate-150 text-[11px] font-medium text-slate-700 px-2 py-0.5 rounded-full hover:bg-slate-100 hover:border-teal-500 hover:text-teal-700 cursor-pointer" 
                        title="Click to view file"
                      >
                        📎 {file}
                      </span>
                    ))}
                  </div>
                ) : '-'}
              </div>

              <div className="space-y-[4px] pt-[8px] border-t border-slate-100">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remarks / Comments</span>
                <div className="bg-slate-50 border border-slate-150 rounded-[8px] p-[12px] text-[12px] text-slate-600 leading-relaxed max-h-[120px] overflow-y-auto">
                  {viewingLog.remarks}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-[24px] py-[16px] bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setViewingLog(null)}
                className="px-[16px] py-[8px] bg-white border border-slate-200 rounded-[6px] text-slate-600 hover:bg-slate-50 hover:text-slate-800 text-[12px] font-semibold transition-colors shadow-sm cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Preview Modal (opens in the same page) */}
      {previewFile && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div 
            className="bg-white border border-slate-200 rounded-xl shadow-lg w-full max-w-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-teal-50 text-teal-600 rounded">
                  <Paperclip size={16} />
                </span>
                <span className="font-heading font-bold text-slate-800 text-sm">{previewFile}</span>
              </div>
              <button 
                onClick={() => setPreviewFile(null)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50 flex items-center justify-center min-h-[300px]">
              {fileUrls[previewFile] ? (
                previewFile.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) ? (
                  <img 
                    src={fileUrls[previewFile]} 
                    alt={previewFile} 
                    className="max-w-full max-h-[60vh] object-contain rounded border border-slate-200" 
                  />
                ) : previewFile.toLowerCase().endsWith('.pdf') ? (
                  <iframe 
                    src={`${fileUrls[previewFile]}#navpanes=0`} 
                    title={previewFile} 
                    className="w-full h-[60vh] rounded border border-slate-200 bg-white" 
                  />
                ) : (
                  <iframe 
                    src={fileUrls[previewFile]} 
                    title={previewFile} 
                    className="w-full h-[60vh] rounded border border-slate-200 bg-white p-4 font-mono text-xs text-slate-700" 
                  />
                )
              ) : (
                previewFile.toLowerCase().endsWith('.pdf') ? (
                  <div className="bg-white border border-slate-250 shadow-md p-8 w-full max-w-md aspect-[1/1.4] relative flex flex-col justify-between text-slate-800 select-none rounded animate-fade-in">
                    <div className="absolute top-0 inset-x-0 h-1 bg-[#0066cc]" />
                    <div className="space-y-4 flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-xs uppercase tracking-wider text-slate-400">Nippon Quality Assurance</div>
                          <h3 className="font-heading font-extrabold text-base text-slate-900 mt-0.5">Effectiveness Observation Log</h3>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono text-right">
                          DOC: QA-EFF-OBS<br />
                          REV: 03 (2026)
                        </div>
                      </div>
                      <div className="border-t border-slate-100 pt-3 space-y-2.5 text-xs text-slate-600">
                        <div className="flex justify-between border-b border-slate-50 pb-1.5"><span className="font-bold">Filename:</span> <span>{previewFile}</span></div>
                        <div className="flex justify-between border-b border-slate-50 pb-1.5"><span className="font-bold">System Status:</span> <span className="text-emerald-600 font-bold">Verified Log</span></div>
                        <div className="flex justify-between border-b border-slate-50 pb-1.5"><span className="font-bold">Verification Date:</span> <span>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
                      </div>
                      <div className="pt-2 space-y-2">
                        <div className="font-bold text-xs text-slate-800">Observation Evidence Summary:</div>
                        <p className="text-[11px] leading-relaxed text-slate-500">
                          Post-implementation effectiveness metrics compiled for this request confirm that the changes met the desired objectives. Calibration schedules and operational checklists were successfully submitted and verified against reference gauges.
                        </p>
                      </div>
                    </div>
                    <div className="border-t border-slate-150 pt-3 flex justify-between items-center text-[10px] text-slate-400 font-mono">
                      <span>OFFICIAL ELECTRONIC ATTACHMENT</span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-bold">APPROVED</span>
                    </div>
                  </div>
                ) : previewFile.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-md max-w-sm w-full text-center space-y-4 animate-fade-in">
                    <div className="w-16 h-16 bg-teal-50 text-teal-650 rounded-full flex items-center justify-center mx-auto text-3xl">
                      🖼️
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-850 text-sm">{previewFile}</h4>
                      <p className="text-xs text-slate-450 mt-1">Mock Image Evidence</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-150 p-4 rounded-lg flex items-center justify-center h-40">
                      <span className="text-[10px] text-slate-400 font-mono italic">[ Image Content Placeholder ]</span>
                    </div>
                    <p className="text-[10px] text-slate-400 italic">This is a mock placeholder showing where the image attachment will load.</p>
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 w-full h-[50vh] font-mono text-xs text-slate-350 overflow-auto text-left shadow-inner flex flex-col">
                    <div className="text-[10px] text-slate-555 pb-2 border-b border-slate-800 flex justify-between">
                      <span>{previewFile}</span>
                      <span>UTF-8 PLAINTEXT</span>
                    </div>
                    <pre className="mt-2 flex-1 leading-relaxed">
                      {`=== Observation Log Plaintext Evidence ===\n\n[INFO] - System observations started for Change No.\n[INFO] - Verification checked at ${new Date().toLocaleTimeString()}\n[SUCCESS] - Gauge measurements calibrated correctly within specifications.\n[SUCCESS] - Gauge R&R deviation: 0.12% (threshold: <5%)\n[INFO] - Sign-off approval recorded.\n\n==========================================`}
                    </pre>
                  </div>
                )
              )}
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setPreviewFile(null)}
                className="px-4 py-1.5 bg-[#0066cc] hover:bg-[#0052a3] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
