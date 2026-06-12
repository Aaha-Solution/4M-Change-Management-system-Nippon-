import { useState, useEffect } from 'react';
import { Save, Search, RotateCcw, Eye, Paperclip, X, AlertTriangle, Loader2, Calendar, Folder, Cpu, Clock, CheckCircle2, FileText, Download } from 'lucide-react';
import TablePagination from '@mui/material/TablePagination';
import { getL2ValidationLogs, createL2ValidationLog, getL1Details, getL1Attachment, getL2Attachment, getL2Details, getL3Approvals } from '../../api/apiRoutes';
import { formatDateToDDMMYYYY } from '../../utils/dateUtils';
import { exportL2ValidationLogsPDF, exportRequestDetailsPDF } from '../../utils/pdfExport';

export const L2Validation = ({
  changes,
  userRole,
  userEmail,
  userDept,
  setToastMsg,
  fetchChanges,
  fetchNotifications,
  autoOpenChangeNo,
  clearAutoOpen
}) => {
  // Modal states
  const [validationError, setValidationError] = useState('');

  // L1 Details Modal states
  const [selectedL1Details, setSelectedL1Details] = useState(null);
  const [selectedL2Details, setSelectedL2Details] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [isFetchingL1, setIsFetchingL1] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [fileUrls, setFileUrls] = useState({});

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

  // Inline field validation errors
  const [fieldErrors, setFieldErrors] = useState({});

  // File Upload states
  const [pedFiles, setPedFiles] = useState([]);
  const [qaFiles, setQaFiles] = useState([]);

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

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [decisionFilter, setDecisionFilter] = useState('All');

  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Reset page when search or filters change
  useEffect(() => {
    setPage(0);
  }, [searchQuery, decisionFilter]);

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

  // Auto-populate logic based on autoOpenChangeNo or first pending request
  useEffect(() => {
    if (changes && changes.length > 0) {
      const approvedChanges = changes.filter(c => c.hodStatus === 'Approved');
      
      if (autoOpenChangeNo) {
        const targetChange = approvedChanges.find(c => c.id.toLowerCase().trim() === autoOpenChangeNo.toLowerCase().trim());
        if (targetChange) {
          setFormChangeNo(targetChange.id);
          setFormDate(formatDateToDDMMYYYY(targetChange.date));
          setFormRequester(targetChange.requestBy || targetChange.requester || '');
        }
        if (clearAutoOpen) clearAutoOpen();
      } else if (!formChangeNo) {
        const validatedNos = new Set(validationLogs.map(log => log.changeNo?.toLowerCase().trim()));
        const firstPending = approvedChanges.find(c => !validatedNos.has(c.id.toLowerCase().trim())) || approvedChanges[0];
        if (firstPending) {
          setFormChangeNo(firstPending.id);
          setFormDate(formatDateToDDMMYYYY(firstPending.date));
          setFormRequester(firstPending.requestBy || firstPending.requester || '');
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changes, autoOpenChangeNo]);

  // Sync form inputs with saved validation logs when formChangeNo or validationLogs changes
  useEffect(() => {
    // Clear field-level errors and file selections whenever the selected record changes
    setFieldErrors({});
    setPedFiles([]);
    setQaFiles([]);

    if (formChangeNo) {
      // Sync date/requester from changes list
      const matchedChange = changes?.find(c => c.id.toLowerCase().trim() === formChangeNo.toLowerCase().trim());
      if (matchedChange) {
        setFormDate(formatDateToDDMMYYYY(matchedChange.date));
        setFormRequester(matchedChange.requestBy || matchedChange.requester || '');
      }
      // Sync status/remarks from saved log
      const savedLog = validationLogs.find(
        log => log.changeNo?.toLowerCase().trim() === formChangeNo.toLowerCase().trim()
      );
      if (savedLog) {
        setFormStatus(savedLog.status || '');
        setFormRemarks(savedLog.remarks === '-' ? '' : savedLog.remarks || '');
      } else {
        setFormStatus('');
        setFormRemarks('');
      }
    } else {
      setFormStatus('');
      setFormRemarks('');
    }
  }, [formChangeNo, validationLogs, changes]);

  const handleSaveLog = async (e) => {
    e.preventDefault();

    // Per-field validation
    const errors = {};
    const existingLog = validationLogs.find(
      log => log.changeNo?.toLowerCase().trim() === formChangeNo.toLowerCase().trim()
    );

    if (isQualityOrAdmin) {
      if (!formStatus) errors.status = 'Please select a validation status.';
      if (!formRemarks.trim()) errors.remarks = 'Remarks are required.';
      const hasQaInDb = existingLog && existingLog.qaTest && existingLog.qaTest !== '-';
      if (qaFiles.length === 0 && !hasQaInDb) {
        errors.qaFile = 'QA attachment is required.';
      }
      const hasPedInDb = existingLog && existingLog.weldTest && existingLog.weldTest !== '-';
      if (pedFiles.length === 0 && !hasPedInDb) {
        errors.pedFile = 'PED attachment is required.';
      }
    } else if (isRaisedByUserOrAdmin) {
      const hasPedInDb = existingLog && existingLog.weldTest && existingLog.weldTest !== '-';
      if (pedFiles.length === 0 && !hasPedInDb) {
        errors.pedFile = 'PED attachment is required.';
      }
    }

    if (!formDate.trim() || !formRequester.trim()) {
      setValidationError('Change request data is missing. Please select a valid row from the table.');
      return;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    setIsSubmitting(true);
    try {
      const attachments = [];
      for (const file of pedFiles) {
        const base64Data = await fileToBase64(file);
        attachments.push({
          fieldName: 'weld_test',
          name: file.name.replace(/,/g, '_'),
          type: file.type || 'application/octet-stream',
          data: base64Data
        });
      }
      for (const file of qaFiles) {
        const base64Data = await fileToBase64(file);
        attachments.push({
          fieldName: 'qa_test',
          name: file.name.replace(/,/g, '_'),
          type: file.type || 'application/octet-stream',
          data: base64Data
        });
      }

      const logData = {
        changeNo: formChangeNo.trim(),
        date: formDate.trim(),
        requester: formRequester.trim(),
        weldTest: pedFiles.map(f => f.name).join(', '),
        qaTest: qaFiles.map(f => f.name).join(', '),
        status: formStatus,
        remarks: formRemarks.trim()
      };

      await createL2ValidationLog(logData, attachments);

      if (fetchChanges) await fetchChanges();
      if (fetchNotifications) await fetchNotifications();

      if (setToastMsg) {
        setToastMsg(`Successfully saved L2 validation log for ${formChangeNo}`);
      }

      await fetchLogs();

      // Clear file upload states
      setPedFiles([]);
      setQaFiles([]);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || 'Error saving L2 validation log to database.';
      setValidationError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };



  const handleViewL1Details = async (changeNo) => {
    setIsFetchingL1(true);
    try {
      const [l1Res, l2Res, l3Res] = await Promise.all([
        getL1Details(changeNo),
        getL2Details(changeNo).catch(() => ({ data: null })),
        getL3Approvals().catch(() => ({ data: [] }))
      ]);
      setSelectedL1Details(l1Res.data);
      setSelectedL2Details(l2Res.data);
      
      const matchedChange = changes?.find(c => c.id === changeNo);
      const hodStatus = matchedChange ? matchedChange.hodStatus : 'Pending';
      const requester = matchedChange ? matchedChange.requester : '';
      const date = matchedChange ? matchedChange.date : '';
      
      const matchedL3 = l3Res.data?.find(log => log.changeNo === changeNo);
      const newLogData = matchedL3 ? { ...matchedL3, hodStatus } : {
        changeNo: changeNo,
        requester: requester,
        date: date,
        hodStatus: hodStatus,
        ped: 'Pending',
        quality: 'Pending',
        production: 'Pending',
        maintenance: 'Pending',
        pcl: 'Pending',
        materials: 'Pending',
        marketing: 'Pending',
        hr: 'Pending',
        safety: 'Pending',
        unitHead: 'Pending'
      };
      setSelectedLog(newLogData);
    } catch (err) {
      console.error(err);
      if (setToastMsg) setToastMsg('Error loading change request details.');
    } finally {
      setIsFetchingL1(false);
    }
  };

  const handleExportRequestDetailsPDF = () => {
    exportRequestDetailsPDF(selectedL1Details, selectedL2Details, selectedLog, setToastMsg);
  };

  const handleCloseModal = () => {
    setSelectedL1Details(null);
    setSelectedL2Details(null);
    setSelectedLog(null);
  };

  const handleViewAttachment = async (filename, changeNo, type = 'L1') => {
    if (!filename || filename === '-') return;
    setPreviewFile(filename);

    if (!fileUrls[filename]) {
      try {
        let response;
        if (type === 'L2') {
          response = await getL2Attachment(changeNo, filename);
        } else {
          response = await getL1Attachment(changeNo, filename);
        }
        const blobUrl = URL.createObjectURL(response.data);
        setFileUrls(prev => ({ ...prev, [filename]: blobUrl }));
      } catch (err) {
        console.error(`Error loading ${type} attachment from server:`, err);
      }
    }
  };

  const renderL1FilePill = (filename, changeNo) => {
    if (!filename) return null;
    const files = filename.split(',').map(s => s.trim()).filter(Boolean);
    return (
      <div className="mt-1 flex flex-wrap gap-2">
        {files.map((file, idx) => (
          <span 
            key={idx}
            className="inline-flex items-center gap-[6px] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md py-1 px-2.5 text-[11px] font-medium text-[#0066cc] cursor-pointer max-w-full"
            onClick={() => handleViewAttachment(file, changeNo)}
          >
            <Paperclip size={11} className="text-slate-400" />
            <span className="underline truncate max-w-[200px]">{file}</span>
          </span>
        ))}
      </div>
    );
  };

  const isAlreadyValidated = validationLogs.some(
    log => log.changeNo?.toLowerCase().trim() === formChangeNo?.toLowerCase().trim()
  );

  // Construct L2 table rows by combining changes and validationLogs
  const tableLogs = (changes || [])
    .filter(change => change.hodStatus === 'Approved')
    .map(change => {
    const savedLog = validationLogs.find(log => log.changeNo?.toLowerCase().trim() === change.id?.toLowerCase().trim());
    return {
      changeNo: change.id,
      date: change.date,
      requester: change.requestBy || change.requester || savedLog?.requester || 'Unknown',
      requesterEmail: change.requesterEmail || savedLog?.requesterEmail || '',
      weldTest: savedLog?.weldTest || '-',
      qaTest: savedLog?.qaTest || '-',
      status: savedLog?.status || 'Pending',
      remarks: savedLog?.remarks || '-',
      isPending: !savedLog
    };
  });

  const matchedChange = changes?.find(c => c.id.toLowerCase().trim() === formChangeNo.toLowerCase().trim());
  const isRaisedByUser = matchedChange && userEmail && 
    matchedChange.requesterEmail?.toLowerCase().trim() === userEmail.toLowerCase().trim();

  const isAdmin = userRole && (
    userRole.toLowerCase() === 'admin' ||
    userRole.toLowerCase() === 'administrator'
  );

  const isQuality = userDept && (
    userDept.toLowerCase() === 'quality' || 
    userDept.toLowerCase() === 'qad' || 
    userDept.toLowerCase() === 'qa'
  );

  const isQualityOrAdmin = isQuality || isAdmin;
  const isRaisedByUserOrAdmin = isRaisedByUser || isAdmin;

  const canEdit = isQualityOrAdmin || isRaisedByUser;

  // Filter logic
  const filteredLogs = tableLogs.filter(log => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      log.changeNo.toLowerCase().includes(q) ||
      (log.remarks && log.remarks.toLowerCase().includes(q)) ||
      log.requester.toLowerCase().includes(q);

    const matchesDecision = decisionFilter === 'All' || log.status === decisionFilter;

    return matchesSearch && matchesDecision;
  });

  const paginatedLogs = filteredLogs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleExportPDF = () => {
    exportL2ValidationLogsPDF(filteredLogs, { searchQuery, decisionFilter }, setToastMsg);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_2.5fr] gap-[24px] animate-fade-in-up text-slate-800">

      {/* LEFT COLUMN: Add L2 Validation Log Form */}
      <div className="bg-white border border-slate-200/60 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 space-y-[16px] h-fit">
        <div className="flex items-center gap-[8px] border-b border-slate-100 pb-[8px]">
          <Save size={16} className="text-[#0066cc]" />
          <h4 className="text-[13px] font-bold text-slate-900">Add L2 Validation Log</h4>
        </div>

        {formChangeNo && isRaisedByUser && !isQualityOrAdmin && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 text-[11px] flex items-start gap-2 animate-fade-in mb-3">
            <AlertTriangle size={14} className="text-blue-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Notice:</span> You raised this change request. You are authorized to upload the <span className="font-semibold">Requester Validation (PED) Attachment</span>. Quality department will review and complete the validation.
            </div>
          </div>
        )}

        {formChangeNo && !isRaisedByUser && isQualityOrAdmin && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 text-[11px] flex items-start gap-2 animate-fade-in mb-3">
            <AlertTriangle size={14} className="text-blue-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Notice:</span> You are logged in as {isAdmin ? 'Admin' : 'Quality'}. You are authorized to complete the L2 validation status, remarks, and upload the <span className="font-semibold">QA Setup Verification Attachment</span>.
            </div>
          </div>
        )}

        {formChangeNo && isRaisedByUser && isQualityOrAdmin && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 text-[11px] flex items-start gap-2 animate-fade-in mb-3">
            <AlertTriangle size={14} className="text-blue-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Notice:</span> You are the creator of this change request and {isAdmin ? 'an Admin' : 'a Quality'} member. You have full permissions to update all L2 validation fields.
            </div>
          </div>
        )}

        {formChangeNo && !isRaisedByUser && !isQualityOrAdmin && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-3 text-[11px] flex items-start gap-2 animate-fade-in mb-3">
            <AlertTriangle size={14} className="text-rose-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Access Restricted:</span> L2 validation can only be submitted by the person who raised this change request or Quality department members / Admins.
            </div>
          </div>
        )}

        <form onSubmit={handleSaveLog} className="space-y-[14px]">
          {/* 4M CHANGE NO */}
          <div className="space-y-[4px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">4M Change No <span className="text-rose-500">*</span></label>
            <input
              type="text"
              placeholder="Click a row on the right to select"
              value={formChangeNo}
              disabled
              className="w-full bg-slate-100 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none text-slate-550 select-none"
            />
          </div>

          {/* REQUESTED DATE */}
          <div className="space-y-[4px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Requested Date <span className="text-rose-500">*</span></label>
            <input
              type="text"
              placeholder="Click a row on the right to select"
              value={formDate}
              disabled
              className="w-full bg-slate-100 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none text-slate-550 select-none"
            />
          </div>

          {/* CHANGE REQUEST BY */}
          <div className="space-y-[4px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Change Request By <span className="text-rose-500">*</span></label>
            <input
              type="text"
              placeholder="Click a row on the right to select"
              value={formRequester}
              disabled
              className="w-full bg-slate-100 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none text-slate-550 select-none"
            />
          </div>

          {/* REQUESTER VALIDATION (PED) ATTACHMENT */}
          <div className="space-y-[4px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Requester Validation(PED) Attachment <span className="text-rose-500">*</span></label>
            <input
              key={`ped-${formChangeNo}`}
              type="file"
              multiple
              accept="image/*,application/pdf"
              disabled={!formChangeNo.trim() || !isRaisedByUserOrAdmin}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  const validFiles = [];
                  let hasInvalid = false;
                  Array.from(e.target.files).forEach(file => {
                    const isImage = file.type.startsWith('image/');
                    const isPdf = file.type === 'application/pdf';
                    const hasAllowedExt = /\.(jpg|jpeg|jfif|png|gif|webp|bmp|svg|tiff|tif|ico|heic|heif|avif|pdf)$/i.test(file.name);
                    if ((isImage || isPdf) && hasAllowedExt) {
                      validFiles.push(file);
                    } else {
                      hasInvalid = true;
                    }
                  });
                  if (hasInvalid) {
                    setFieldErrors(prev => ({ ...prev, pedFile: 'Some files were skipped (only PDF and image files are allowed).' }));
                  } else {
                    setFieldErrors(prev => ({ ...prev, pedFile: '' }));
                  }
                  setPedFiles(prev => [...prev, ...validFiles]);
                  e.target.value = '';
                }
              }}
              className={`w-full text-[11px] text-slate-550 file:mr-[8px] file:py-[4px] file:px-[8px] file:rounded-[4px] file:border file:bg-slate-50 file:text-[11px] file:font-semibold hover:file:bg-slate-100 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                fieldErrors.pedFile ? 'file:border-rose-400 border border-rose-300 rounded-[6px] p-1' : 'file:border-slate-200'
              }`}
            />
            {/* Selected PED file chips */}
            {pedFiles.length > 0 && (
              <div className="flex flex-wrap gap-[6px] mt-1">
                {pedFiles.map((file, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-[5px] bg-[#e6f0fa] border border-[#b2d1f0] text-[#0066cc] rounded-[5px] py-[3px] pl-[8px] pr-[5px] text-[10px] font-semibold max-w-full"
                  >
                    <Paperclip size={10} className="shrink-0" />
                    <span className="truncate max-w-[140px]" title={file.name}>{file.name}</span>
                    {formChangeNo.trim() && isRaisedByUserOrAdmin && (
                      <button
                        type="button"
                        onClick={() => setPedFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="ml-[2px] hover:bg-[#b2d1f0] rounded-full p-[2px] transition-colors cursor-pointer shrink-0"
                      >
                        <X size={9} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
            {fieldErrors.pedFile && (
              <p className="text-[11px] text-rose-500 flex items-center gap-1 mt-0.5">
                <span className="inline-block w-[3px] h-[3px] rounded-full bg-rose-500 mt-[1px]" />
                {fieldErrors.pedFile}
              </p>
            )}
          </div>

          {/* APPROVER SET UP VERIFICATION (QA) ATTACHMENT */}
          <div className="space-y-[4px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approver Set Up Verification(QA) Attachment <span className="text-rose-500">*</span></label>
            <input
              key={`qa-${formChangeNo}`}
              type="file"
              multiple
              accept="image/*,application/pdf"
              disabled={!formChangeNo.trim() || !isQualityOrAdmin}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  const validFiles = [];
                  let hasInvalid = false;
                  Array.from(e.target.files).forEach(file => {
                    const isImage = file.type.startsWith('image/');
                    const isPdf = file.type === 'application/pdf';
                    const hasAllowedExt = /\.(jpg|jpeg|jfif|png|gif|webp|bmp|svg|tiff|tif|ico|heic|heif|avif|pdf)$/i.test(file.name);
                    if ((isImage || isPdf) && hasAllowedExt) {
                      validFiles.push(file);
                    } else {
                      hasInvalid = true;
                    }
                  });
                  if (hasInvalid) {
                    setFieldErrors(prev => ({ ...prev, qaFile: 'Some files were skipped (only PDF and image files are allowed).' }));
                  } else {
                    setFieldErrors(prev => ({ ...prev, qaFile: '' }));
                  }
                  setQaFiles(prev => [...prev, ...validFiles]);
                  e.target.value = '';
                }
              }}
              className={`w-full text-[11px] text-slate-555 file:mr-[8px] file:py-[4px] file:px-[8px] file:rounded-[4px] file:border file:bg-slate-50 file:text-[11px] file:font-semibold hover:file:bg-slate-100 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                fieldErrors.qaFile ? 'file:border-rose-400 border border-rose-300 rounded-[6px] p-1' : 'file:border-slate-200'
              }`}
            />
            {/* Selected QA file chips */}
            {qaFiles.length > 0 && (
              <div className="flex flex-wrap gap-[6px] mt-1">
                {qaFiles.map((file, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-[5px] bg-[#e6f0fa] border border-[#b2d1f0] text-[#0066cc] rounded-[5px] py-[3px] pl-[8px] pr-[5px] text-[10px] font-semibold max-w-full"
                  >
                    <Paperclip size={10} className="shrink-0" />
                    <span className="truncate max-w-[140px]" title={file.name}>{file.name}</span>
                    {formChangeNo.trim() && isQualityOrAdmin && (
                      <button
                        type="button"
                        onClick={() => setQaFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="ml-[2px] hover:bg-[#b2d1f0] rounded-full p-[2px] transition-colors cursor-pointer shrink-0"
                      >
                        <X size={9} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
            {fieldErrors.qaFile && (
              <p className="text-[11px] text-rose-500 flex items-center gap-1 mt-0.5">
                <span className="inline-block w-[3px] h-[3px] rounded-full bg-rose-500 mt-[1px]" />
                {fieldErrors.qaFile}
              </p>
            )}
          </div>
 
          {/* APPROVER VALIDATION STATUS */}
          <div className="space-y-[4px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approver Validation Status <span className="text-rose-500">*</span></label>
            <select
              value={formStatus}
              disabled={!formChangeNo.trim() || !isQualityOrAdmin}
              onChange={(e) => {
                setFormStatus(e.target.value);
                setFieldErrors(prev => ({ ...prev, status: '' }));
              }}
              className={`w-full bg-slate-50 disabled:bg-slate-100 border rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] focus:ring-4 focus:ring-[#0066cc]/10 transition-all duration-200 disabled:cursor-not-allowed text-slate-555 ${
                fieldErrors.status ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
              }`}
            >
              <option value="">Select Status</option>
              <option value="Accepted">Accepted</option>
              <option value="Rejected">Rejected</option>
            </select>
            {fieldErrors.status && (
              <p className="text-[11px] text-rose-500 flex items-center gap-1 mt-0.5">
                <span className="inline-block w-[3px] h-[3px] rounded-full bg-rose-500 mt-[1px]" />
                {fieldErrors.status}
              </p>
            )}
          </div>
 
          {/* REMARKS */}
          <div className="space-y-[4px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remarks <span className="text-rose-500">*</span></label>
            <textarea
              placeholder="Enter Remarks..."
              rows={3}
              value={formRemarks}
              disabled={!formChangeNo.trim() || !isQualityOrAdmin}
              onChange={(e) => {
                setFormRemarks(e.target.value);
                setFieldErrors(prev => ({ ...prev, remarks: '' }));
              }}
              className={`w-full bg-slate-50 disabled:bg-slate-100 border rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] focus:ring-4 focus:ring-[#0066cc]/10 transition-all duration-200 resize-none disabled:cursor-not-allowed text-slate-555 ${
                fieldErrors.remarks ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
              }`}
            />
            {fieldErrors.remarks && (
              <p className="text-[11px] text-rose-500 flex items-center gap-1 mt-0.5">
                <span className="inline-block w-[3px] h-[3px] rounded-full bg-rose-500 mt-[1px]" />
                {fieldErrors.remarks}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || !formChangeNo.trim() || !canEdit}
            className="w-full flex items-center justify-center gap-[6px] bg-[#e6f0fa] hover:bg-[#d6e6f5] disabled:opacity-60 border border-[#b2d1f0] text-[#0066cc] py-[10px] rounded-[6px] text-[12px] font-bold transition-all transform active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={14} />
                <span>Saving Validation Log...</span>
              </>
            ) : isAlreadyValidated ? (
              <>
                <Save size={14} />
                <span>Update Validation Log</span>
              </>
            ) : !formChangeNo.trim() ? (
              <span>Select a Request to Validate</span>
            ) : !canEdit ? (
              <span>Access Restricted</span>
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
            <option value="Pending">Pending</option>
          </select>

          <button
            type="button"
            onClick={handleExportPDF}
            className="flex items-center gap-[6px] bg-[#0066cc] hover:bg-[#0052a3] text-white px-[12px] py-[8px] rounded-[6px] text-[12px] font-bold cursor-pointer transition-all shadow-sm duration-200 font-sans"
            title="Export L2 validation logs as PDF"
          >
            <Download size={14} />
            <span>Export PDF</span>
          </button>


        </div>

        {/* Table layout */}
        <div className="bg-white border border-slate-200/60 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
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
                  paginatedLogs.map((log, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/50 cursor-pointer"
                      onClick={() => {
                        setFormChangeNo(log.changeNo || '');
                        setFormDate(formatDateToDDMMYYYY(log.date));
                        setFormRequester(log.requester || '');
                      }}
                    >
                      <td className="p-[12px] font-bold text-[#0066cc]">{log.changeNo}</td>
                      <td className="p-[12px] text-slate-500">{formatDateToDDMMYYYY(log.date)}</td>
                      <td className="p-[12px] font-medium text-slate-700">{log.requester}</td>
                      <td className="p-[12px]">
                        <div className="flex flex-wrap gap-[4px]">
                          {(log.weldTest && log.weldTest !== '-'
                            ? log.weldTest.split(',').map(s => s.trim()).filter(Boolean)
                            : [log.weldTest || '-']
                          ).map((fname, fi) => (
                            <span
                              key={fi}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewAttachment(fname, log.changeNo, 'L2');
                              }}
                              className="inline-flex items-center gap-[4px] text-slate-500 hover:text-[#0066cc] cursor-pointer"
                            >
                              <Paperclip size={12} className="text-slate-400" />
                              <span className="underline truncate max-w-[120px]">{fname}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-[12px]">
                        <div className="flex flex-wrap gap-[4px]">
                          {(log.qaTest && log.qaTest !== '-'
                            ? log.qaTest.split(',').map(s => s.trim()).filter(Boolean)
                            : [log.qaTest || '-']
                          ).map((fname, fi) => (
                            <span
                              key={fi}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewAttachment(fname, log.changeNo, 'L2');
                              }}
                              className="inline-flex items-center gap-[4px] text-slate-500 hover:text-[#0066cc] cursor-pointer"
                            >
                              <Paperclip size={12} className="text-slate-400" />
                              <span className="underline truncate max-w-[120px]">{fname}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-[12px]">
                        <span className={`inline-flex items-center px-[8px] py-[2px] rounded-full text-[10px] font-semibold border ${
                            log.status === 'Accepted'
                              ? 'bg-emerald-50 border-emerald-250 text-emerald-700'
                              : log.status === 'Pending'
                              ? 'bg-amber-50 border-amber-250 text-amber-700'
                              : 'bg-rose-50 border-rose-250 text-rose-700'
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
                            handleViewL1Details(log.changeNo);
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

      {/* L1 Request Details Modal */}
      {selectedL1Details && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-[16px]">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedL1Details(null)}
          />

          {/* Modal Container */}
          <div className="relative bg-white w-full max-w-[800px] max-h-[90vh] rounded-[16px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-10 animate-fade-in-up">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 px-[24px] py-[18px] border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-[10px]">
                <span className="p-2 bg-[#e6f0fa] text-[#0066cc] rounded-lg">
                  <Eye size={18} />
                </span>
                <div>
                  <h4 className="text-[15px] font-bold text-slate-900">L1 Change Request Details</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Request details for change request: <span className="font-mono font-bold text-slate-600">{selectedL1Details.change_no}</span></p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-[6px] hover:bg-slate-200/60 rounded-full text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-[24px] overflow-y-auto space-y-[24px] text-[13px] text-slate-600">
              
              {/* Section 1: General Info */}
              <div className="space-y-[12px]">
                <h5 className="text-[12px] font-bold text-[#0066cc] uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <Folder size={14} />
                  <span>General Information</span>
                </h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-[16px]">
                  <div className="space-y-[4px]">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Change No</span>
                    <span className="font-mono font-bold text-slate-800">{selectedL1Details.change_no}</span>
                  </div>
                  <div className="space-y-[4px]">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Requested Date</span>
                    <span className="font-medium text-slate-700">{selectedL1Details.crDate ? formatDateToDDMMYYYY(selectedL1Details.crDate) : '-'}</span>
                  </div>
                  <div className="space-y-[4px]">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Requested Time</span>
                    <span className="font-medium text-slate-700">{selectedL1Details.requested_time}</span>
                  </div>
                  <div className="space-y-[4px]">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
                    <div className="flex gap-1.5 items-center mt-0.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        selectedL1Details.crStatus === 'Approved' 
                          ? 'bg-emerald-50 border-emerald-220 text-emerald-700' 
                          : 'bg-amber-50 border-amber-220 text-amber-700'
                      }`}>
                        {selectedL1Details.crStatus}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px] mt-[12px]">
                  <div className="space-y-[4px]">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Change Title / Context</span>
                    <span className="font-semibold text-slate-850">{selectedL1Details.title}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-[16px]">
                    <div className="space-y-[4px]">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unit</span>
                      <span className="font-medium text-slate-700">{selectedL1Details.unit}</span>
                    </div>
                    <div className="space-y-[4px]">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Change In</span>
                      <span className="font-medium text-slate-750">{selectedL1Details.change_in}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-[16px] mt-[12px]">
                  <div className="space-y-[4px] md:col-span-2">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Requested By</span>
                    <span className="font-semibold text-slate-800">{selectedL1Details.request_by}</span>
                    <span className="block text-[11px] text-slate-400 mt-0.5 font-mono">{selectedL1Details.crRequester}</span>
                  </div>
                  <div className="space-y-[4px]">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department</span>
                    <span className="font-medium text-slate-700">{selectedL1Details.dept}</span>
                  </div>
                  <div className="space-y-[4px]">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Change Type</span>
                    <span className="font-medium text-slate-700">{selectedL1Details.change_type}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-[16px] mt-[12px]">
                  <div className="space-y-[4px]">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Process Name</span>
                    <span className="font-medium text-slate-700">{selectedL1Details.process_name}</span>
                  </div>
                  <div className="space-y-[4px]">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Process Line</span>
                    <span className="font-medium text-slate-700">{selectedL1Details.process_line}</span>
                  </div>
                  <div className="space-y-[4px] col-span-2 md:col-span-1">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Machine No</span>
                    <span className="font-mono text-slate-700">{selectedL1Details.machine_no}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Details & Timeline */}
              <div className="space-y-[12px] pt-4 border-t border-slate-100">
                <h5 className="text-[12px] font-bold text-[#0066cc] uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <FileText size={14} />
                  <span>Details & Justification</span>
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                  <div className="space-y-[6px] min-w-0">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Change Description</span>
                    <div className="bg-slate-50 border border-slate-200 rounded-[8px] p-3 text-slate-700 min-h-[60px] leading-relaxed break-words">
                      {selectedL1Details.description}
                    </div>
                    {selectedL1Details.file_desc && renderL1FilePill(selectedL1Details.file_desc, selectedL1Details.change_no)}
                  </div>

                  <div className="space-y-[6px] min-w-0">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Area of Improvement / Benefit</span>
                    <div className="bg-slate-50 border border-slate-200 rounded-[8px] p-3 text-slate-700 min-h-[60px] leading-relaxed break-words">
                      {selectedL1Details.improvement_area}
                    </div>
                    {selectedL1Details.file_improvement && renderL1FilePill(selectedL1Details.file_improvement, selectedL1Details.change_no)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px] mt-4">
                  <div className="space-y-[4px]">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Date Start</span>
                    <span className="font-semibold text-slate-750 flex items-center gap-1.5 mt-0.5">
                      <Calendar size={13} className="text-slate-400" />
                      {selectedL1Details.date_start ? formatDateToDDMMYYYY(selectedL1Details.date_start) : '-'}
                    </span>
                  </div>
                  <div className="space-y-[4px]">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Date Close</span>
                    <span className="font-semibold text-slate-750 flex items-center gap-1.5 mt-0.5">
                      <Calendar size={13} className="text-slate-400" />
                      {selectedL1Details.date_close ? formatDateToDDMMYYYY(selectedL1Details.date_close) : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 3: Traceability & Risk */}
              <div className="space-y-[12px] pt-4 border-t border-slate-100">
                <h5 className="text-[12px] font-bold text-[#0066cc] uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <Cpu size={14} />
                  <span>Traceability, Risk & Approvals</span>
                </h5>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                  <div className="space-y-[6px] min-w-0">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Traceability FROM (Before Change)</span>
                    <div className="bg-slate-50 border border-slate-200 rounded-[8px] p-3 text-slate-700 min-h-[60px] leading-relaxed break-words">
                      {selectedL1Details.trace_from}
                    </div>
                    {selectedL1Details.file_trace_from && renderL1FilePill(selectedL1Details.file_trace_from, selectedL1Details.change_no)}
                  </div>

                  <div className="space-y-[6px] min-w-0">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Traceability TO (After Change)</span>
                    <div className="bg-slate-50 border border-slate-200 rounded-[8px] p-3 text-slate-700 min-h-[60px] leading-relaxed break-words">
                      {selectedL1Details.trace_to}
                    </div>
                    {selectedL1Details.file_trace_to && renderL1FilePill(selectedL1Details.file_trace_to, selectedL1Details.change_no)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px] mt-4">
                  <div className="space-y-[6px] min-w-0">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Risk Analysis & Mitigations</span>
                    <div className="bg-slate-50 border border-slate-200 rounded-[8px] p-3 text-slate-700 min-h-[60px] leading-relaxed break-words">
                      {selectedL1Details.risk_analysis}
                    </div>
                    {selectedL1Details.file_risk && renderL1FilePill(selectedL1Details.file_risk, selectedL1Details.change_no)}
                  </div>

                  <div className="space-y-[6px] min-w-0">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">SOP / WI / Control Plan Update</span>
                    <div className="bg-slate-50 border border-slate-200 rounded-[8px] p-3 text-slate-700 min-h-[60px] leading-relaxed break-words">
                      {selectedL1Details.sop_update}
                    </div>
                    {selectedL1Details.file_sop && renderL1FilePill(selectedL1Details.file_sop, selectedL1Details.change_no)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-[16px] mt-4">
                  <div className="space-y-[4px]">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">HOD Approval</span>
                    <span className="font-semibold text-slate-750 flex items-center gap-1.5 mt-0.5">
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      {selectedL1Details.hod_approval}
                    </span>
                  </div>
                  <div className="space-y-[4px]">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer Approval Required</span>
                    <span className="font-semibold text-slate-750 flex items-center gap-1.5 mt-0.5">
                      <Clock size={14} className="text-slate-400" />
                      {selectedL1Details.customer_approval}
                    </span>
                  </div>
                  <div className="space-y-[6px] md:col-span-1 min-w-0">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Effectiveness Monitoring</span>
                    <div className="font-semibold text-slate-750 leading-relaxed break-words">
                      {selectedL1Details.effectiveness_monitoring}
                    </div>
                    {selectedL1Details.file_effectiveness && renderL1FilePill(selectedL1Details.file_effectiveness, selectedL1Details.change_no)}
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-[24px] py-[16px] bg-slate-50 border-t border-slate-200 flex justify-end gap-[12px]">
              <button 
                onClick={handleExportRequestDetailsPDF}
                className="px-[16px] py-[8px] bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-[6px] text-[12px] font-semibold transition-colors shadow-sm cursor-pointer flex items-center gap-[6px] whitespace-nowrap"
                title="Export this request's full details (L1, L2, L3) as PDF"
              >
                <Download size={14} />
                <span>Export PDF</span>
              </button>
              <button
                onClick={handleCloseModal}
                className="px-[16px] py-[8px] bg-white border border-slate-200 rounded-[6px] text-slate-650 hover:bg-slate-50 hover:text-slate-800 text-[12px] font-semibold transition-colors shadow-sm cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading spinner for L1 details */}
      {isFetchingL1 && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xl flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-[#0066cc]" size={32} />
            <span className="text-sm font-semibold text-slate-700">Loading L1 Request details...</span>
          </div>
        </div>
      )}

      {/* Attachment Preview Modal (opens in the same page) */}
      {previewFile && (
        <div 
          className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div 
            className="bg-white border border-slate-200 rounded-xl shadow-lg w-full max-w-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-[#e6f0fa] text-[#0066cc] rounded">
                  <Paperclip size={16} />
                </span>
                <span className="font-bold text-slate-800 text-sm">{previewFile}</span>
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
                          <h3 className="font-extrabold text-base text-slate-900 mt-0.5">Change Request Attachment</h3>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono text-right">
                          DOC: L1-ATT-VER<br />
                          REV: 03 (2026)
                        </div>
                      </div>
                      <div className="border-t border-slate-100 pt-3 space-y-2.5 text-xs text-slate-600">
                        <div className="flex justify-between border-b border-slate-50 pb-1.5"><span className="font-bold">Filename:</span> <span>{previewFile}</span></div>
                        <div className="flex justify-between border-b border-slate-50 pb-1.5"><span className="font-bold">System Status:</span> <span className="text-emerald-600 font-bold">Verified File</span></div>
                      </div>
                      <div className="pt-2 space-y-2">
                        <div className="font-bold text-xs text-slate-800">Observation Summary:</div>
                        <p className="text-[11px] leading-relaxed text-slate-500">
                          This attachment supports the change request validation details for change no {selectedL1Details?.change_no}. The document or image content was uploaded during the Level 1 submission phase.
                        </p>
                      </div>
                    </div>
                    <div className="border-t border-slate-150 pt-3 flex justify-between items-center text-[10px] text-slate-400 font-mono">
                      <span>OFFICIAL ELECTRONIC ATTACHMENT</span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-bold">VERIFIED</span>
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
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 w-full h-[50vh] font-mono text-xs text-slate-355 overflow-auto text-left shadow-inner flex flex-col">
                    <div className="text-[10px] text-slate-555 pb-2 border-b border-slate-800 flex justify-between">
                      <span>{previewFile}</span>
                      <span>UTF-8 PLAINTEXT</span>
                    </div>
                    <pre className="mt-2 flex-1 leading-relaxed text-slate-300">
                      {`=== Attachment Plaintext Evidence ===\n\n[INFO] - Supporting document for Change No: ${selectedL1Details?.change_no}\n[SUCCESS] - Document content loaded successfully.\n\n==========================================`}
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
