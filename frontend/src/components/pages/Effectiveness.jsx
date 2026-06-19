import { useState, useEffect } from 'react';
import { Paperclip, Search, X, Eye, Save, Download, AlertTriangle } from 'lucide-react';
import TablePagination from '@mui/material/TablePagination';
import {
  createEffectivenessLog,
  updateEffectivenessLog,
  getEffectivenessAttachment
} from '../../api/apiRoutes';
import { formatDateToDDMMYY } from '../../utils/dateUtils';
import { exportEffectivenessLogsPDF } from '../../utils/pdfExport';
import { CustomDatePicker } from '../ui/CustomDatePicker';
import { useWebSocket } from '../../hooks/useWebSocket';

const generateEffId = () => `EFF-${Date.now().toString().substring(7)}`;

const getDefaultDateString = () => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};


export const Effectiveness = ({
  changes,
  effectivenessLogs,
  setEffectivenessLogs,
  logAction,
  setToastMsg,
  userRole,
  userDept
}) => {
  const isAdmin = userRole && (
    userRole.toLowerCase() === 'admin' ||
    userRole.toLowerCase() === 'administrator'
  );
  const isQADept = userDept && (
    userDept.toLowerCase() === 'quality' ||
    userDept.toLowerCase() === 'qad' ||
    userDept.toLowerCase() === 'qa'
  );
  const canUpdate = isAdmin || isQADept;
  // Effectiveness Monitoring Form States
  const [effChangeNo, setEffChangeNo] = useState('');
  const [effMonthWise, setEffMonthWise] = useState(() => getDefaultDateString());
  const [effRemarks, setEffRemarks] = useState('');
  const [effAttachment, setEffAttachment] = useState('');
  const [effStatus, setEffStatus] = useState('');
  const [effQaApproval, setEffQaApproval] = useState('');
  const [editingEffLogId, setEditingEffLogId] = useState(null);
  const [viewingLog, setViewingLog] = useState(null);
  const [fileUrls, setFileUrls] = useState({});
  const [previewFile, setPreviewFile] = useState(null);
  const [uploadedFilesList, setUploadedFilesList] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    if (effChangeNo) {
      const savedLog = effectivenessLogs.find(
        log => log.changeNo?.toLowerCase().trim() === effChangeNo.toLowerCase().trim()
      );
      if (savedLog) {
        setEditingEffLogId(savedLog.id);
        setEffMonthWise(savedLog.monthWise || getDefaultDateString());
        setEffRemarks(savedLog.remarks || '');
        setEffAttachment(savedLog.attachment || '');
        setEffStatus(savedLog.status || '');
        setEffQaApproval(savedLog.qaApproval || '');
      } else {
        setEditingEffLogId(null);
      }
    } else {
      setEditingEffLogId(null);
    }
  }, [effChangeNo, effectivenessLogs]);

  // Keep viewingLog in sync when effectivenessLogs updates in the background
  useEffect(() => {
    if (viewingLog) {
      const updatedLog = effectivenessLogs.find(log => log.id === viewingLog.id);
      if (updatedLog) {
        setViewingLog(updatedLog);
      } else {
        setViewingLog(null);
      }
    }
  }, [effectivenessLogs, viewingLog]);

  // Hook WebSocket listener for real-time effectiveness monitoring
  useWebSocket((data) => {
    console.log('📩 Received WebSocket message in Effectiveness:', data);
  });

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

  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [effSearch, effFilterStatus, effFilterMonth]);

  // Format month names (e.g. "2026-05" -> "May-26" or "12/06/2026" -> "Jun-26")
  const formatMonthWise = (val) => {
    if (!val) return "-";
    if (val.includes('/')) {
      const parts = val.split('/');
      if (parts.length === 3) {
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        const date = new Date(year, month - 1, 1);
        if (!isNaN(date.getTime())) {
          const monthName = date.toLocaleDateString("en-US", { month: "short" });
          const yearShort = String(year).slice(-2);
          return `${monthName}-${yearShort}`;
        }
      }
    }
    if (val.includes('-')) {
      const parts = val.split("-");
      if (parts.length >= 2) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const date = new Date(year, month - 1, 1);
        if (!isNaN(date.getTime())) {
          const monthName = date.toLocaleDateString("en-US", { month: "short" });
          const yearShort = String(year).slice(-2);
          return `${monthName}-${yearShort}`;
        }
      }
    }
    return val;
  };

  // Formatted date (e.g., "2026-05-20" -> "20/05/26")
  const formatDateShort = (dateStr) => {
    return formatDateToDDMMYY(dateStr);
  };

  // Add or Edit Effectiveness Log
  const handleAddOrEditEff = async (e) => {
    e.preventDefault();
    if (!effChangeNo) {
      setToastMsg('Please select a Change Request.');
      return;
    }
    if (!effMonthWise) {
      setToastMsg('Please select Month Wise.');
      return;
    }
    if (!effRemarks || !effRemarks.trim()) {
      setToastMsg('Please enter Observation Remarks.');
      return;
    }
    if (!effAttachment) {
      setToastMsg('Please upload an Attachment.');
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
    const reqDate = selectedChange ? (selectedChange.rawDate || selectedChange.date) : new Date().toISOString().split('T')[0];
    const startDate = selectedChange ? (selectedChange.dateStart || selectedChange.rawDate || selectedChange.date) : new Date().toISOString().split('T')[0];

    const savedLog = effectivenessLogs.find(
      log => log.changeNo?.toLowerCase().trim() === effChangeNo.toLowerCase().trim()
    );

    if (savedLog) {
      // Edit mode
      const logData = {
        monthWise: effMonthWise,
        remarks: effRemarks,
        attachment: effAttachment,
        status: effStatus,
        qaApproval: effQaApproval
      };
      try {
        const response = await updateEffectivenessLog(savedLog.id, logData, uploadedFilesList);
        setEffectivenessLogs(prev => prev.map(log => log.id === savedLog.id ? response.data.log : log));
        logAction('Effectiveness Log Updated', `Updated monitoring observations for change ${effChangeNo}.`);
        setToastMsg(`Log entry updated for ${effChangeNo}`);
        handleCancelEditing();
      } catch (err) {
        console.error("Error updating log:", err);
        const errMsg = err.response?.data?.error || 'Failed to update effectiveness log.';
        setToastMsg(errMsg);
      }
    } else {
      // Create mode
      const newId = generateEffId();
      const logData = {
        id: newId,
        changeNo: effChangeNo,
        reqDate: reqDate,
        context: context,
        startDate: startDate,
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
        handleCancelEditing();
      } catch (err) {
        console.error("Error creating log:", err);
        const errMsg = err.response?.data?.error || 'Failed to create effectiveness log.';
        setToastMsg(errMsg);
      }
    }
  };

  // Cancel selection
  const handleCancelEditing = () => {
    setEffChangeNo('');
    setEditingEffLogId(null);
    setEffMonthWise(getDefaultDateString());
    setEffRemarks('');
    setEffAttachment('');
    setEffStatus('');
    setEffQaApproval('');
    setUploadedFilesList([]);
  };

  const handleSelectChangeNo = (val) => {
    setEffChangeNo(val);
    const savedLog = effectivenessLogs.find(
      log => log.changeNo?.toLowerCase().trim() === val.toLowerCase().trim()
    );
    if (savedLog) {
      setEditingEffLogId(savedLog.id);
      setEffMonthWise(savedLog.monthWise || getDefaultDateString());
      setEffRemarks(savedLog.remarks || '');
      setEffAttachment(savedLog.attachment || '');
      setEffStatus(savedLog.status || '');
      setEffQaApproval(savedLog.qaApproval || '');
    } else {
      setEditingEffLogId(null);
      setEffMonthWise(getDefaultDateString());
      setEffRemarks('');
      setEffAttachment('');
      setEffStatus('');
      setEffQaApproval('');
    }
    setUploadedFilesList([]);
  };



  // Construct table logs combining changes and effectivenessLogs
  const tableLogs = (changes || [])
    .filter(change => change.isL3Approved)
    .map(change => {
      const savedLog = effectivenessLogs.find(
        log => log.changeNo?.toLowerCase().trim() === change.id?.toLowerCase().trim()
      );
      return {
        id: savedLog?.id || `EFF-PENDING-${change.id}`,
        changeNo: change.id,
        reqDate: change.rawDate || change.date,
        context: change.title,
        startDate: change.dateStart || change.rawDate || change.date,
        monthWise: savedLog?.monthWise || '',
        remarks: savedLog?.remarks || '',
        attachment: savedLog?.attachment || '',
        status: savedLog?.status || 'Pending',
        qaApproval: savedLog?.qaApproval || 'Pending',
        qaUpdateCount: savedLog?.qaUpdateCount || 0,
        isPending: !savedLog
      };
    });

  // Extract unique months for filter from both saved logs and pending change requests
  const uniqueMonthsRaw = Array.from(
    new Set(
      tableLogs.map(log => {
        const val = log.monthWise || log.startDate || log.reqDate;
        return val ? formatMonthWise(val) : null;
      }).filter(Boolean)
    )
  ).filter(m => m !== '-' && m !== 'All' && m !== 'Pending');

  // Sort unique months chronologically
  const monthOrder = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
  };
  const uniqueMonths = uniqueMonthsRaw.sort((a, b) => {
    const [aMonth, aYear] = a.split('-');
    const [bMonth, bYear] = b.split('-');
    const yearDiff = parseInt(aYear, 10) - parseInt(bYear, 10);
    if (yearDiff !== 0) return yearDiff;
    return monthOrder[aMonth] - monthOrder[bMonth];
  });

  const filteredLogs = tableLogs.filter(log => {
    const query = effSearch.toLowerCase();
    const matchesSearch = (log.changeNo || '').toLowerCase().includes(query) ||
      (log.context || '').toLowerCase().includes(query) ||
      (log.remarks || '').toLowerCase().includes(query);
    
    const matchesStatus = effFilterStatus === 'All' || log.status === effFilterStatus;
    
    let matchesMonth = true;
    if (effFilterMonth !== 'All') {
      if (effFilterMonth === 'Pending') {
        matchesMonth = log.isPending;
      } else {
        const logMonth = log.monthWise ? formatMonthWise(log.monthWise) : formatMonthWise(log.startDate || log.reqDate);
        matchesMonth = logMonth === effFilterMonth;
      }
    }
    return matchesSearch && matchesStatus && matchesMonth;
  });

  const paginatedLogs = filteredLogs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleExportPDF = () => {
    // Only export logs that are already validated (have a valid non-pending status)
    const savedLogsOnly = filteredLogs.filter(l => !l.isPending).map(l => ({
      ...l,
      reqDate: l.reqDate,
      startDate: l.startDate,
      qaApproval: l.qaApproval
    }));
    exportEffectivenessLogsPDF(savedLogsOnly, {
      searchQuery: effSearch,
      statusFilter: effFilterStatus,
      monthFilter: effFilterMonth
    }, setToastMsg);
  };


  const selectedChange = changes.find(c => c.id === effChangeNo);

  const matchedLog = effectivenessLogs.find(
    log => log.changeNo?.toLowerCase().trim() === effChangeNo?.toLowerCase().trim()
  );

  const isAlreadyValidated = !!matchedLog;
  const isQaUpdateBlocked = !!(matchedLog && !isAdmin && isQADept && (matchedLog.qaUpdateCount >= 1));
  const isUpdateBlocked = !canUpdate || isQaUpdateBlocked;

  // Derive display values for requested date, context, start date
  const displayReqDate = selectedChange ? formatDateShort(selectedChange.rawDate || selectedChange.date) : '';
  const displayContext = selectedChange ? selectedChange.title : '';
  const displayStartDate = selectedChange ? formatDateShort(selectedChange.dateStart || selectedChange.rawDate || selectedChange.date) : '';

  return (
    <div className="space-y-[16px] animate-fade-in-up text-slate-800 pb-[40px]">
      <div>
        <h3 className="font-heading text-2xl font-bold text-slate-900">Effectiveness Monitoring</h3>
        <p className="text-slate-500 text-sm">Add observations and track 3-month post-implementation effectiveness logs.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[24px] items-start">

        {/* LEFT COLUMN: Add Effectiveness Log Form */}
        {canUpdate && (
          <div className="lg:col-span-4 bg-white border border-slate-200/60 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 space-y-[16px] h-fit">
          <div className="flex items-center gap-[8px] border-b border-slate-100 pb-[8px]">
            <Save size={16} className="text-[#0066cc]" />
            <h4 className="text-[13px] font-bold text-slate-900">Add Monitoring Log</h4>
          </div>

          <form onSubmit={handleAddOrEditEff} className="space-y-[14px]">
            {/* 4M CHANGE NO */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">4M Change No <span className="text-rose-500">*</span></label>
              <input
                type="text"
                disabled
                placeholder="Click a row on the right to select"
                className="w-full bg-slate-100 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none text-slate-500 cursor-not-allowed select-none animate-fade-in-up"
                value={effChangeNo}
              />
            </div>

            {effChangeNo && isAlreadyValidated && isQaUpdateBlocked && (
              <div className="bg-amber-50 border border-amber-250 text-amber-800 rounded-lg p-3 text-[11px] leading-relaxed flex items-start gap-2 animate-fade-in-up">
                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <span className="font-bold">Log Locked:</span> You have already updated this effectiveness log once. Unlimited updates are allowed only for Administrators.
                </div>
              </div>
            )}

            {effChangeNo && isAlreadyValidated && isAdmin && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 text-[11px] leading-relaxed flex items-start gap-2 animate-fade-in-up">
                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-blue-600" />
                <div>
                  <span className="font-bold">Admin Edit Mode:</span> You have unlimited update access to modify this effectiveness log.
                </div>
              </div>
            )}

            {effChangeNo && isAlreadyValidated && isQADept && !isAdmin && !isQaUpdateBlocked && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 text-[11px] leading-relaxed flex items-start gap-2 animate-fade-in-up">
                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-blue-600" />
                <div>
                  <span className="font-bold">Edit Mode:</span> This effectiveness log has already been submitted. As a QA user, you can update it once.
                </div>
              </div>
            )}

            {/* REQUESTED DATE */}
            <div className="space-y-[4px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Requested Date <span className="text-rose-500">*</span></label>
              <input
                type="text"
                disabled
                placeholder="Click a row on the right to select"
                className="w-full bg-slate-100 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none text-slate-500 cursor-not-allowed select-none"
                value={displayReqDate}
              />
            </div>

            {/* CONTEXT OF CHANGE */}
            <div className="space-y-[4px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Context of Change <span className="text-rose-500">*</span></label>
              <input
                type="text"
                disabled
                placeholder="Click a row on the right to select"
                className="w-full bg-slate-100 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none text-slate-500 cursor-not-allowed select-none"
                value={displayContext}
              />
            </div>

            {/* CHANGE DATE START */}
            <div className="space-y-[4px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Change Date Start <span className="text-rose-500">*</span></label>
              <input
                type="text"
                disabled
                placeholder="Click a row on the right to select"
                className="w-full bg-slate-100 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none text-slate-500 cursor-not-allowed select-none"
                value={displayStartDate}
              />
            </div>

            {/* MONTH WISE */}
            <div className="space-y-[4px] relative">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Month Wise <span className="text-rose-500">*</span></label>
              <CustomDatePicker
                value={effMonthWise}
                onChange={setEffMonthWise}
                readOnly={true}
                disabled={!effChangeNo || (isAlreadyValidated && isUpdateBlocked)}
                inputClassName={`w-full bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] pl-[12px] pr-[30px] text-[12px] outline-none focus:border-[#0066cc] ${(!effChangeNo || (isAlreadyValidated && isUpdateBlocked)) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-200 cursor-pointer'}`}
                buttonClassName="right-[10px] top-[50%] -translate-y-1/2"
              />
            </div>

            {/* OBSERVATION REMARKS */}
            <div className="space-y-[4px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Observation Remarks <span className="text-rose-500">*</span></label>
              <textarea
                required
                disabled={!effChangeNo || (isAlreadyValidated && isUpdateBlocked)}
                rows={3}
                placeholder="Enter evaluation remarks/results..."
                maxLength={1000}
                className={`w-full border rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] ${(!effChangeNo || (isAlreadyValidated && isUpdateBlocked)) ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-200'
                  }`}
                value={effRemarks}
                onChange={(e) => setEffRemarks(e.target.value)}
              />
              <div className="flex justify-between items-center text-[9px] text-slate-400">
                <span>Enter observation remarks</span>
                <span className={`${1000 - effRemarks.length <= 15 ? 'text-amber-600 font-bold animate-pulse' : 'text-slate-400'}`}>
                  {1000 - effRemarks.length} characters remaining (max 1000 chars)
                </span>
              </div>
            </div>

            {/* ATTACHMENTS */}
            <div className="space-y-[4px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attachments <span className="text-rose-500">*</span></label>
              <div className="flex gap-[8px]">
                <div className="relative flex-1">
                  <input
                    type="text"
                    required
                    readOnly
                    disabled={!effChangeNo || (isAlreadyValidated && isUpdateBlocked)}
                    placeholder="e.g. proof-log.pdf, image.png"
                    className={`w-full border rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none pr-[30px] ${(!effChangeNo || (isAlreadyValidated && isUpdateBlocked)) ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-200'
                      }`}
                    value={effAttachment}
                  />
                  {effAttachment && (!isAlreadyValidated || !isUpdateBlocked) && (
                    <button
                      type="button"
                      disabled={!effChangeNo || (isAlreadyValidated && isUpdateBlocked)}
                      onClick={() => {
                        setDeleteConfirm({
                          title: 'Clear All Attachments?',
                          message: 'Are you sure you want to clear all attachments from this field?',
                          onConfirm: () => {
                            setEffAttachment('');
                          }
                        });
                      }}
                      className="absolute right-[10px] top-[10px] text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Clear all attachments"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <label className={`flex items-center justify-center gap-[6px] px-[12px] py-[8px] border border-slate-200 rounded-[6px] text-[12px] font-bold transition-all cursor-pointer ${(!effChangeNo || (isAlreadyValidated && isUpdateBlocked)) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white hover:bg-slate-50 text-slate-700'
                  }`}>
                  <Paperclip size={14} />
                  <span>Upload</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    disabled={!effChangeNo || (isAlreadyValidated && isUpdateBlocked)}
                    className="hidden"
                    onChange={async (e) => {
                      const target = e.target;
                      if (target.files && target.files.length > 0) {
                        const files = Array.from(target.files);
                        
                        // Validate file type
                        const allowedFiles = files.filter(file => {
                          const isImage = file.type.startsWith('image/');
                          const isPdf = file.type === 'application/pdf';
                          const hasAllowedExt = /\.(jpg|jpeg|jfif|png|gif|webp|bold|png|gif|webp|bmp|svg|tiff|tif|ico|heic|heif|avif|pdf)$/i.test(file.name);
                          return (isImage || isPdf) && hasAllowedExt;
                        });

                        if (allowedFiles.length !== files.length) {
                          if (setToastMsg) {
                            setToastMsg('Only PDF and image files are allowed. Invalid files were skipped.');
                          }
                        }

                        if (allowedFiles.length === 0) {
                          target.value = '';
                          return;
                        }

                        const names = allowedFiles.map(f => f.name);

                        // Reset input value synchronously immediately to allow uploading the same file again
                        target.value = '';

                        // Store object URLs for preview
                        const newUrls = {};
                        allowedFiles.forEach(file => {
                          newUrls[file.name] = URL.createObjectURL(file);
                        });
                        setFileUrls(prev => ({ ...prev, ...newUrls }));

                        // Convert files to base64 for server upload
                        const base64Files = await Promise.all(
                          allowedFiles.map(async (file) => ({
                            name: file.name.replace(/,/g, '_'),
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

              {/* Selected File Pills */}
              {effAttachment && (
                <div className="flex flex-wrap gap-[6px] pt-[6px]">
                  {effAttachment.split(',').map(s => s.trim()).filter(Boolean).map((file, i) => (
                    <span key={i} className="inline-flex items-center gap-[4px] bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-700 px-[8px] py-[2px] rounded-[4px] select-none">
                      <span
                        onClick={() => handleViewAttachment(file)}
                        className="truncate max-w-[150px] cursor-pointer hover:underline text-[#0066cc]"
                        title="Click to view file"
                      >
                        📎 {file}
                      </span>
                      {(!isAlreadyValidated || !isUpdateBlocked) && (
                        <button
                          type="button"
                          disabled={!effChangeNo || (isAlreadyValidated && isUpdateBlocked)}
                          onClick={() => {
                            setDeleteConfirm({
                              title: 'Delete Attachment?',
                              message: `Are you sure you want to delete "${file}"? This action cannot be undone.`,
                              onConfirm: () => {
                                const existing = effAttachment.split(',').map(s => s.trim()).filter(Boolean);
                                const updated = existing.filter(f => f !== file).join(', ');
                                setEffAttachment(updated);
                              }
                            });
                          }}
                          className="text-slate-400 hover:text-rose-600 font-bold ml-[2px] cursor-pointer text-xs"
                        >
                          &times;
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* EFFECTIVENESS STATUS */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Effectiveness Status <span className="text-rose-500">*</span></label>
              <select
                required
                disabled={!effChangeNo || (isAlreadyValidated && isUpdateBlocked)}
                className={`w-full border rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] ${(!effChangeNo || (isAlreadyValidated && isUpdateBlocked)) ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-200 cursor-pointer'
                  }`}
                value={effStatus}
                onChange={(e) => setEffStatus(e.target.value)}
              >
                <option value="">Select Status</option>
                <option value="Effectiveness Ok">Effectiveness Ok</option>
                <option value="Effectiveness Not Ok">Effectiveness Not Ok</option>
              </select>
            </div>

            {/* QA APPROVAL DECISION */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">QA Approval Decision <span className="text-rose-500">*</span></label>
              <select
                required
                disabled={!effChangeNo || (isAlreadyValidated && isUpdateBlocked)}
                className={`w-full border rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] ${(!effChangeNo || (isAlreadyValidated && isUpdateBlocked)) ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-200 cursor-pointer'
                  }`}
                value={effQaApproval}
                onChange={(e) => setEffQaApproval(e.target.value)}
              >
                <option value="">Select QA Decision</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            {/* Buttons */}
            <div className="space-y-[8px] pt-[4px]">
              <button
                type="submit"
                disabled={!effChangeNo || (isAlreadyValidated && isUpdateBlocked)}
                className="w-full flex items-center justify-center gap-[6px] bg-[#e6f0fa] hover:bg-[#d6e6f5] disabled:opacity-50 disabled:cursor-not-allowed border border-[#b2d1f0] text-[#0066cc] py-[10px] rounded-[6px] text-[12px] font-bold transition-all transform active:scale-[0.98] cursor-pointer"
              >
                {!effChangeNo ? (
                  <span>Select a Request to Evaluate</span>
                ) : (isAlreadyValidated && isUpdateBlocked) ? (
                  <span>Log Update Limit Reached</span>
                ) : isAlreadyValidated ? (
                  <>
                    <Save size={14} />
                    <span>Update Log Entry</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Add Log Entry</span>
                  </>
                )}
              </button>
              {(editingEffLogId || effChangeNo) && (
                <button
                  type="button"
                  onClick={handleCancelEditing}
                  className="w-full text-center py-[6px] text-slate-500 hover:text-slate-800 text-[11px] font-semibold cursor-pointer"
                >
                  Cancel Selection
                </button>
              )}
            </div>
          </form>
        </div>
        )}

        {/* RIGHT COLUMN: Table Column */}
        <div className={`${canUpdate ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-[16px]`}>
          {/* Search and Filters */}
          <div className="bg-white border border-slate-200/60 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 flex flex-wrap gap-3 items-center w-full">
            <div className="flex-grow min-w-[200px] relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search logs by change no or remarks..."
                className="w-full pl-8 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0066cc]"
                value={effSearch}
                onChange={(e) => setEffSearch(e.target.value)}
              />
            </div>

            <div>
              <select
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none min-w-[150px] focus:border-[#0066cc]"
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
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none min-w-[150px] focus:border-[#0066cc]"
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
              type="button"
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-sm duration-200 font-sans"
              title="Export effectiveness monitoring logs as PDF"
            >
              <Download size={12} />
              <span>Export PDF</span>
            </button>
          </div>

          {/* Logs Table Card */}
          <div className="bg-white border border-slate-200/60 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-[10px]">
                    <th className="p-[8px] font-bold text-slate-500 uppercase tracking-wider">4M Change No</th>
                    <th className="p-[8px] font-bold text-slate-500 uppercase tracking-wider">Requested Date</th>
                    <th className="p-[8px] font-bold text-slate-500 uppercase tracking-wider w-[320px] min-w-[320px] max-w-[320px]">Context of Change</th>
                    <th className="p-[8px] font-bold text-slate-500 uppercase tracking-wider">Change Date Start</th>
                    <th className="p-[8px] font-bold text-slate-500 uppercase tracking-wider">Month Wise</th>
                    <th className="p-[8px] font-bold text-slate-500 uppercase tracking-wider">Remarks</th>
                    <th className="p-[8px] font-bold text-slate-500 uppercase tracking-wider">Attachment</th>
                    <th className="p-[8px] font-bold text-slate-500 uppercase tracking-wider">Effectiveness Status</th>
                    <th className="p-[8px] font-bold text-slate-500 uppercase tracking-wider">QA Approval</th>
                    <th className="p-[8px] w-10 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-10 text-slate-400">
                        No observations logs recorded.
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map(log => {
                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                          onClick={() => handleSelectChangeNo(log.changeNo)}
                        >
                          <td className="p-3 font-bold text-[#0066cc]">{log.changeNo}</td>
                          <td className="p-3 text-slate-500">{formatDateShort(log.reqDate)}</td>
                          <td className="p-3 font-medium text-slate-700 whitespace-normal break-words w-[320px] min-w-[320px] max-w-[320px]" title={log.context}>{log.context}</td>
                          <td className="p-3 text-slate-500">{formatDateShort(log.startDate)}</td>
                          <td className="p-3 font-medium text-slate-600">{log.monthWise || '-'}</td>
                          <td className="p-3 max-w-[200px] truncate text-slate-500" title={log.remarks}>{log.remarks}</td>

                          <td className="p-3 font-mono text-teal-655" onClick={(e) => e.stopPropagation()}>
                            {log.attachment ? (
                              <div className="flex flex-col gap-[4px]">
                                {log.attachment.split(',').map(s => s.trim()).filter(Boolean).map((file, idx) => (
                                  <span
                                    key={idx}
                                    onClick={() => handleViewAttachment(file, log)}
                                    className="inline-flex items-center gap-[4px] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md py-[2px] px-[6px] text-[10px] font-medium text-[#0066cc] cursor-pointer max-w-[120px] truncate"
                                    title="Click to view file"
                                  >
                                    <Paperclip size={10} className="text-slate-400" />
                                    <span className="underline truncate">{file}</span>
                                  </span>
                                ))}
                              </div>
                            ) : '-'}
                          </td>

                          <td className="p-3">
                            <span className={`inline-block w-full text-center px-[4px] py-[2px] rounded-[4px] border text-[9px] font-bold ${log.status === 'Effectiveness Ok'
                                ? 'bg-emerald-50 border-emerald-250 text-emerald-700'
                                : log.status === 'Pending'
                                ? 'bg-slate-50 border-slate-200 text-slate-500'
                                : 'bg-rose-50 border-rose-250 text-rose-700'
                              }`}>
                              {log.status}
                            </span>
                          </td>

                          <td className="p-3">
                            <span className={`inline-block w-full text-center px-[4px] py-[2px] rounded-[4px] border text-[9px] font-bold ${log.qaApproval === 'Approved'
                                ? 'bg-emerald-50 border-emerald-250 text-emerald-700'
                                : log.qaApproval === 'Pending'
                                ? 'bg-slate-50 border-slate-200 text-slate-500'
                                : 'bg-rose-50 border-rose-250 text-rose-700'
                              }`}>
                              {log.qaApproval}
                            </span>
                          </td>

                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            {!log.isPending ? (
                              <button
                                type="button"
                                onClick={() => setViewingLog(log)}
                                className="p-[4px] hover:bg-slate-100 rounded text-slate-400 hover:text-[#0066cc] transition-colors cursor-pointer"
                                title="View Details"
                              >
                                <Eye size={12} />
                              </button>
                            ) : (
                              <span className="text-slate-300 text-[10px] font-medium">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={filteredLogs.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(event, newPage) => setPage(newPage)}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
              className="border-t border-slate-100"
            />
          </div>
        </div>

      </div>



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
                    <span className={`inline-flex items-center px-[8px] py-[2px] rounded-full text-[10px] font-semibold border ${viewingLog.status === 'Effectiveness Ok'
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
                    <span className={`inline-flex items-center px-[8px] py-[2px] rounded-full text-[10px] font-semibold border ${viewingLog.qaApproval === 'Approved'
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
                previewFile.toLowerCase().match(/\.(jpg|jpeg|jfif|png|gif|webp|bmp|svg|tiff|tif|ico|heic|heif|avif)$/) ? (
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
                        <div className="flex justify-between border-b border-slate-50 pb-1.5"><span className="font-bold">Verification Date:</span> <span>{formatDateToDDMMYY(new Date())}</span></div>
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
                ) : previewFile.toLowerCase().match(/\.(jpg|jpeg|jfif|png|gif|webp|bmp|svg|tiff|tif|ico|heic|heif|avif)$/) ? (
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

      {/* Attachment Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-[16px]">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white w-full max-w-[320px] rounded-[16px] shadow-2xl border border-slate-200 flex flex-col z-10 p-[24px] text-center animate-fade-in-up">
            <div className="mx-auto bg-rose-100 text-rose-600 p-[12px] rounded-full mb-[16px]">
              <AlertTriangle size={24} />
            </div>
            <h4 className="text-[16px] font-bold text-slate-800 mb-[8px]">
              {deleteConfirm.title || 'Delete Attachment?'}
            </h4>
            <p className="text-[13px] text-slate-500 mb-[24px]">
              {deleteConfirm.message || 'Are you sure you want to delete this attachment? This action cannot be undone.'}
            </p>
            <div className="flex gap-[12px] w-full">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-[10px] rounded-[8px] text-[13px] font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteConfirm.onConfirm();
                  setDeleteConfirm(null);
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-[10px] rounded-[8px] text-[13px] font-bold transition-colors shadow-sm cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
