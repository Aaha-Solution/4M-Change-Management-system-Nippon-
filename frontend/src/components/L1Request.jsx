import { useState, useEffect } from 'react';
import { 
  Upload, 
  Loader2,
  Plus,
  X,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { createL1Request, getProcesses, addProcess, deleteProcess, getMachines, addMachine, deleteMachine, getNextChangeNo, getUsers, getDepartments } from '../api/apiRoutes';
import { CustomDatePicker } from './CustomDatePicker';
import { formatDateToDDMMYYYY } from '../utils/dateUtils';

export const L1Request = ({
  userEmail,
  onTabChange,
  changes,
  setChanges,
  logAction,
  setToastMsg
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [tempProcessName, setTempProcessName] = useState('');
  const [tempMachineNo, setTempMachineNo] = useState('');
  const [itemToDelete, setItemToDelete] = useState(null);

  const [dbProcesses, setDbProcesses] = useState([]);
  const [dbMachines, setDbMachines] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [dbDepartments, setDbDepartments] = useState([]);

  // Fallback list of users matching seed data if database fetch hasn't completed or returned nothing
  const fallbackUsers = [
    { name: 'Ramanan Prabakaran', department: 'General', email: 'ramanan.p@plant.com' },
    { name: 'Priya Venkat', department: 'PRODUCTION', email: 'priya.v@plant.com' },
    { name: 'Kumar Selvam', department: 'PED', email: 'kumar.s@plant.com' },
    { name: 'Ravi QA', department: 'QAD', email: 'ravi.qa@plant.com' },
    { name: 'Admin User', department: 'General', email: 'admin@cms.com' },
    { name: 'Manager User', department: 'General', email: 'manager@cms.com' },
    { name: 'Requester User', department: 'General', email: 'requester@cms.com' }
  ];

  useEffect(() => {
    fetchOptions();
    fetchNextChangeNo();
  }, []);

  async function fetchNextChangeNo() {
    try {
      const res = await getNextChangeNo();
      setChangeNo(res.data.nextNo);
    } catch (e) {
      console.error('Error fetching next change number:', e);
      setChangeNo(`4M-2026-${Date.now().toString().slice(-8)}`);
    }
  }

  async function fetchOptions() {
    try {
      const [pRes, mRes, uRes, dRes] = await Promise.all([
        getProcesses(),
        getMachines(),
        getUsers(),
        getDepartments()
      ]);
      setDbProcesses(pRes.data);
      setDbMachines(mRes.data);
      setSystemUsers(uRes.data || []);
      setDbDepartments(dRes.data || []);
    } catch (e) {
      console.error('Error fetching options:', e);
    }
  }

  const handleAddProcess = async () => {
    if (tempProcessName.trim()) {
      try {
        await addProcess(tempProcessName.trim());
        setProcessName(tempProcessName.trim());
        setTempProcessName('');
        setIsProcessModalOpen(false);
        fetchOptions();
      } catch (e) {
        console.error('Error adding process:', e);
      }
    }
  };

  const handleDeleteProcess = (name, e) => {
    e.stopPropagation();
    setItemToDelete({ type: 'process', name });
  };

  const handleDeleteMachine = (name, e) => {
    e.stopPropagation();
    setItemToDelete({ type: 'machine', name });
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === 'process') {
        await deleteProcess(itemToDelete.name);
        if (processName === itemToDelete.name) setProcessName('');
      } else {
        await deleteMachine(itemToDelete.name);
        if (machineNo === itemToDelete.name) setMachineNo('');
      }
      fetchOptions();
    } catch (err) {
      console.error('Error deleting:', err);
    } finally {
      setItemToDelete(null);
    }
  };

  // Identifiers State
  const [unit, setUnit] = useState('');
  const [changeNo, setChangeNo] = useState('');
  const [requestedDate] = useState(() => formatDateToDDMMYYYY(new Date()));
  const [requestedTime, setRequestedTime] = useState(() => {
    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    return `${hrs}:${mins}`;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setRequestedTime(`${hrs}:${mins}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  const [changeIn, setChangeIn] = useState({
    Man: false,
    Machine: false,
    Material: false,
    Method: false,
    Measurement: false,
    'Mother Nature': false
  });

  // File states for supporting uploads (Effectiveness style)
  const [fileDesc, setFileDesc] = useState('');
  const [fileImprovement, setFileImprovement] = useState('');
  const [fileTraceFrom, setFileTraceFrom] = useState('');
  const [fileTraceTo, setFileTraceTo] = useState('');
  const [fileRisk, setFileRisk] = useState('');
  const [fileSop, setFileSop] = useState('');
  const [fileEffectiveness, setFileEffectiveness] = useState('');

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

  // Request Details State
  const [dept, setDept] = useState(() => {
    if (userEmail) {
      if (userEmail.toLowerCase().includes('kumar')) return 'PED';
      if (userEmail.toLowerCase().includes('ravi')) return 'QAD';
      if (userEmail.toLowerCase().includes('priya')) return 'PRODUCTION';
      if (userEmail.toLowerCase().includes('ramanan')) return 'General';
    }
    return '';
  });
  const [requestBy, setRequestBy] = useState(() => {
    if (userEmail) {
      if (userEmail.toLowerCase().includes('ramanan')) return 'Ramanan Prabakaran';
      if (userEmail.toLowerCase().includes('priya')) return 'Priya Venkat';
      if (userEmail.toLowerCase().includes('kumar')) return 'Kumar Selvam';
      if (userEmail.toLowerCase().includes('ravi')) return 'Ravi QA';
      return userEmail;
    }
    return '';
  });

  const activeUsersList = systemUsers.length > 0 ? systemUsers : fallbackUsers;

  const filteredUsers = activeUsersList.filter(u => {
    if (!dept) return true;
    return (u.department || '').toLowerCase() === dept.toLowerCase();
  });

  useEffect(() => {
    if (userEmail && systemUsers.length > 0) {
      const currentUser = systemUsers.find(u => u.email.toLowerCase() === userEmail.toLowerCase());
      if (currentUser && currentUser.department && currentUser.department !== 'General') {
        setDept(prev => prev || currentUser.department);
      }
    }
  }, [userEmail, systemUsers]);

  const [processName, setProcessName] = useState('');
  const [processLine, setProcessLine] = useState('');
  const [machineNo, setMachineNo] = useState('');

  // Change Description State
  const [context, setContext] = useState('');
  const [description, setDescription] = useState('');

  // Implementation Timeline State
  const [improvementArea, setImprovementArea] = useState('');
  const [changeType, setChangeType] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [traceFrom, setTraceFrom] = useState('');
  const [dateClose, setDateClose] = useState('');
  const [traceTo, setTraceTo] = useState('');

  // Risk Analysis State
  const [riskAnalysis, setRiskAnalysis] = useState('');
  const [sopUpdate, setSopUpdate] = useState('');
  const [hodApproval, setHodApproval] = useState('');
  const [customerApproval, setCustomerApproval] = useState('');
  const [effectivenessMonitoring, setEffectivenessMonitoring] = useState('');



  const handleCheckboxChange = (name) => {
    setChangeIn(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!unit) {
      setToastMsg('Please select a Unit.');
      return;
    }

    const selectedChangesIn = Object.keys(changeIn).filter(k => changeIn[k]).join(', ');
    if (!selectedChangesIn) {
      setToastMsg('Please select at least one Change In option.');
      return;
    }

    if (!dept) {
      setToastMsg('Please select a Department.');
      return;
    }

    if (!requestBy) {
      setToastMsg('Please select a Requester Name.');
      return;
    }

    if (!processName || !processName.trim()) {
      setToastMsg('Please select a Process Name.');
      return;
    }

    if (!processLine || !processLine.trim()) {
      setToastMsg('Please enter a Process Line.');
      return;
    }

    if (!machineNo || !machineNo.trim()) {
      setToastMsg('Please select a Machine No.');
      return;
    }

    if (!context || context.trim().length < 10) {
      setToastMsg('Context of Change must be at least 10 characters.');
      return;
    }

    if (!description || description.trim().length < 20) {
      setToastMsg('Detailed Change Description must be at least 20 characters.');
      return;
    }

    if (!improvementArea) {
      setToastMsg('Please select a Change Improvement Area.');
      return;
    }

    if (!changeType) {
      setToastMsg('Please select a Permanent / Temporary Change option.');
      return;
    }

    if (!dateStart || !dateStart.trim()) {
      setToastMsg('Please enter an Implement / Change Date Start.');
      return;
    }

    if (!traceFrom || traceFrom.trim().length < 20) {
      setToastMsg('Part Traceability Details (From Changes) must be at least 20 characters.');
      return;
    }

    if (!dateClose || !dateClose.trim()) {
      setToastMsg('Please enter a Change Date Close.');
      return;
    }

    if (!traceTo || traceTo.trim().length < 20) {
      setToastMsg('Part Traceability Details (To Changes) must be at least 20 characters.');
      return;
    }

    if (!riskAnalysis || !riskAnalysis.trim()) {
      setToastMsg('Please enter a Risk Analysis.');
      return;
    }

    if (!sopUpdate || !sopUpdate.trim()) {
      setToastMsg('Please describe the Update in SOP / WI / Control Plan / FMEA.');
      return;
    }

    if (!hodApproval || !hodApproval.trim()) {
      setToastMsg('Please describe the User Dept HOD Approval.');
      return;
    }

    if (!customerApproval) {
      setToastMsg('Please select if Customer Approval is Required.');
      return;
    }

    if (!effectivenessMonitoring || !effectivenessMonitoring.trim()) {
      setToastMsg('Please describe the Effectiveness Monitoring plan.');
      return;
    }

    setIsSubmitting(true);
    
    const l1Data = {
      changeNo,
      unit,
      requestedTime,
      changeIn: selectedChangesIn,
      dept,
      requestBy,
      processName,
      processLine,
      machineNo,
      context,
      description,
      improvementArea,
      changeType,
      dateStart,
      traceFrom,
      dateClose,
      traceTo,
      riskAnalysis,
      sopUpdate,
      hodApproval,
      customerApproval,
      effectivenessMonitoring,
      fileDesc,
      fileImprovement,
      fileTraceFrom,
      fileTraceTo,
      fileRisk,
      fileSop,
      fileEffectiveness
    };
    
    try {
      const response = await createL1Request(l1Data, uploadedFilesList);
      const newChange = response.data.change;

      setChanges([newChange, ...changes]);
      setToastMsg(`Successfully submitted L1 Change Request: ${changeNo}`);
      logAction('L1 Request Created', `Successfully submitted L1 Change Request ${changeNo} for department ${dept}`);
      
      // Redirect back to dashboard overview
      onTabChange('dashboard');
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || 'Error saving L1 request to server.';
      setToastMsg(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderAttachmentInput = (label, value, setValue, inputId, fieldName, isRequired = false) => {
    return (
      <div className="space-y-[4px]">
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label} {isRequired && <span className="text-rose-500">*</span>}</label>
        <div className="flex gap-[8px]">
          <div className="relative flex-1">
            <input
              type="text"
              readOnly
              placeholder="e.g. proof-log.pdf"
              className="w-full bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] pl-[12px] pr-[28px] text-[12px] outline-none focus:border-[#0066cc] select-none text-slate-500"
              value={value}
            />
            {value && (
              <button
                type="button"
                onClick={() => {
                  setValue('');
                  setUploadedFilesList(prev => prev.filter(f => f.fieldName !== fieldName));
                }}
                className="absolute right-[10px] top-[10px] text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                title="Clear all attachments"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <label className="flex items-center justify-center gap-[6px] px-[12px] py-[8px] border border-slate-200 hover:bg-slate-50 text-[#0066cc] bg-white rounded-[6px] text-[11px] font-bold shadow-sm transition-all cursor-pointer select-none">
            <Upload size={12} />
            <span>Upload</span>
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              id={inputId}
              className="hidden"
              onChange={async (e) => {
                if (e.target.files && e.target.files.length > 0) {
                  const files = Array.from(e.target.files);
                  const names = files.map(f => f.name);

                  // Convert files to base64 for server upload
                  const base64Files = await Promise.all(
                    files.map(async (file) => ({
                      name: file.name,
                      type: file.type || 'application/octet-stream',
                      data: await fileToBase64(file),
                      fieldName
                    }))
                  );

                  setUploadedFilesList(prev => {
                    const filtered = prev.filter(f => !(f.fieldName === fieldName && names.includes(f.name)));
                    return [...filtered, ...base64Files];
                  });

                  const existing = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];
                  const updated = Array.from(new Set([...existing, ...names])).join(', ');
                  setValue(updated);
                }
              }}
            />
          </label>
        </div>

        {/* Selected File Pills */}
        {value && (
          <div className="flex flex-wrap gap-[6px] pt-[4px]">
            {value.split(',').map(s => s.trim()).filter(Boolean).map((file, i) => (
              <span key={i} className="inline-flex items-center gap-[4px] bg-slate-100 border border-slate-200 text-[10px] font-medium text-slate-700 px-[8px] py-[2px] rounded-full select-none">
                <span className="truncate max-w-[150px] font-semibold">
                  📎 {file}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const existing = value.split(',').map(s => s.trim()).filter(Boolean);
                    const updated = existing.filter(f => f !== file).join(', ');
                    setValue(updated);
                    setUploadedFilesList(prev => prev.filter(f => !(f.fieldName === fieldName && f.name === file)));
                  }}
                  className="text-slate-450 hover:text-rose-650 font-bold ml-[2px] cursor-pointer text-[12px]"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full space-y-[24px] animate-fade-in-up pb-[40px] text-slate-800">
      
      {/* Title */}
      <div>
        <h3 className="font-heading text-[20px] font-bold text-slate-900">New L1 Change Request</h3>
        <p className="text-slate-500 text-[12px] mt-[4px]">Change No: {changeNo} — Auto-assigned on submission</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-[24px]">
        
        {/* 1. Identifiers Section */}
        <div className="bg-white border border-slate-200 rounded-[12px] p-[20px] shadow-sm space-y-[16px]">
          <h4 className="text-[13px] font-bold text-slate-900 border-b border-slate-100 pb-[8px]">Identifiers</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[16px]">
            {/* UNIT */}
            <div className="space-y-[4px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unit <span className="text-rose-500">*</span></label>
              <select 
                value={unit} 
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] transition-colors"
              >
                <option value="">— Select Unit —</option>
                <option value="Unit 1">Unit 1 - Chennai</option>
                <option value="Unit 2">Unit 2 - Hosur</option>
                <option value="Unit 3">Unit 3 - Madurai</option>
              </select>
            </div>

            {/* 4M CHANGE NO */}
            <div className="space-y-[4px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">4M Change No <span className="text-rose-500">*</span></label>
              <div className="relative flex items-center">
                <span className="absolute left-[12px] text-slate-400 text-[12px]">#</span>
                <input 
                  type="text" 
                  disabled 
                  value={changeNo} 
                  className="w-full bg-slate-100 border border-slate-200 rounded-[6px] py-[8px] pl-[24px] pr-[54px] text-[12px] text-slate-500 cursor-not-allowed outline-none font-medium"
                />
                <span className="absolute right-[8px] bg-sky-50 border border-sky-100 text-[#0066cc] text-[9px] font-bold rounded px-[6px] py-[2px] uppercase select-none">
                  Auto
                </span>
              </div>
              <span className="block text-[9px] text-slate-400 mt-[2px]">Unique ID auto-assigned on submission</span>
            </div>

            {/* REQUESTED DATE */}
            <div className="space-y-[4px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Requested Date <span className="text-rose-500">*</span></label>
              <div className="relative flex items-center">
                <input 
                  type="text" 
                  disabled 
                  value={requestedDate} 
                  className="w-full bg-slate-100 border border-slate-200 rounded-[6px] py-[8px] pl-[12px] pr-[54px] text-[12px] text-slate-500 cursor-not-allowed outline-none font-medium"
                />
                <span className="absolute right-[8px] bg-sky-50 border border-sky-100 text-[#0066cc] text-[9px] font-bold rounded px-[6px] py-[2px] uppercase select-none">
                  Auto
                </span>
              </div>
              <span className="block text-[9px] text-slate-400 mt-[2px]">Auto-captured: today's date</span>
            </div>

            {/* TIME */}
            <div className="space-y-[4px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Time <span className="text-rose-500">*</span></label>
              <div className="relative flex items-center">
                <input 
                  type="text" 
                  disabled 
                  value={requestedTime} 
                  className="w-full bg-slate-100 border border-slate-200 rounded-[6px] py-[8px] pl-[12px] pr-[54px] text-[12px] text-slate-500 cursor-not-allowed outline-none font-medium"
                />
                <span className="absolute right-[8px] bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] font-bold rounded px-[6px] py-[2px] uppercase select-none">
                  Live
                </span>
              </div>
              <span className="block text-[9px] text-slate-400 mt-[2px]">Current time, auto-captured</span>
            </div>
          </div>

          {/* CHANGE IN */}
          <div className="space-y-[6px] pt-[8px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Change In <span className="text-rose-500">*</span></label>
            <div className="flex flex-wrap gap-x-[16px] gap-y-[8px] text-[12px] text-slate-700 font-medium select-none">
              {Object.keys(changeIn).map(key => (
                <label key={key} className="flex items-center gap-[6px] cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={changeIn[key]} 
                    onChange={() => handleCheckboxChange(key)}
                    className="w-[14px] h-[14px] rounded border-slate-300 text-[#0066cc] focus:ring-[#0066cc]"
                  />
                  <span>{key}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Request Details Section */}
        <div className="bg-white border border-slate-200 rounded-[12px] p-[20px] shadow-sm space-y-[16px]">
          <h4 className="text-[13px] font-bold text-slate-900 border-b border-slate-100 pb-[8px]">Request Details</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[16px]">
            {/* CHANGE REQUEST DEPT */}
            <div className="space-y-[4px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Change Request Dept <span className="text-rose-500">*</span></label>
              <select 
                value={dept} 
                onChange={(e) => {
                  const selectedDept = e.target.value;
                  setDept(selectedDept);
                  
                  // Reset requestBy if the currently selected requester doesn't belong to the new department
                  if (selectedDept) {
                    const matchedUsers = (systemUsers.length > 0 ? systemUsers : fallbackUsers).filter(
                      u => (u.department || '').toLowerCase() === selectedDept.toLowerCase()
                    );
                    const isStillValid = matchedUsers.some(u => (u.name || u.email) === requestBy);
                    if (!isStillValid) {
                      setRequestBy('');
                    }
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] transition-colors"
              >
                <option value="">— Select Department —</option>
                {[...new Set(['PED', 'QAD', 'PRODUCTION', 'MAINTENANCE', 'PC & L', 'MATERIALS', 'MARKETING', 'HR', 'SAFETY', ...dbDepartments])].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* CHANGE REQUEST BY */}
            <div className="space-y-[4px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Change Request By <span className="text-rose-500">*</span></label>
              <select 
                value={requestBy} 
                onChange={(e) => setRequestBy(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] transition-colors"
              >
                <option value="">— Select Name —</option>
                {filteredUsers.map(u => {
                  const displayName = u.name || u.email;
                  return (
                    <option key={u.email || displayName} value={displayName}>
                      {displayName}
                    </option>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <option disabled value="">No members in this department</option>
                )}
              </select>
            </div>

            {/* PROCESS NAME */}
            <div className="space-y-[4px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Process Name <span className="text-rose-500">*</span></label>
              <div className="flex gap-[8px]">
                <select
                  value={processName}
                  onChange={(e) => setProcessName(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] transition-colors"
                >
                  <option value="">— Select or Add Process —</option>
                  {[...new Set([...dbProcesses, ...changes.map(c => c.processName).filter(Boolean)])].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <button 
                  type="button"
                  onClick={() => {
                    setTempProcessName('');
                    setIsProcessModalOpen(true);
                  }}
                  className="flex items-center justify-center w-[36px] bg-slate-50 border border-slate-200 rounded-[6px] text-slate-500 hover:bg-slate-100 hover:text-[#0066cc] transition-colors"
                  title="View DB & Add Process"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* PROCESS LINE */}
            <div className="space-y-[4px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Process Line <span className="text-rose-500">*</span></label>
              <input 
                type="text" 
                placeholder="e.g. Line 3 / Bay B" 
                value={processLine}
                onChange={(e) => setProcessLine(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] transition-colors"
              />
            </div>

            {/* MACHINE NO */}
            <div className="space-y-[4px] sm:col-span-2 lg:col-span-4">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Machine No <span className="text-rose-500">*</span></label>
              <div className="flex gap-[8px] sm:max-w-[49%] lg:max-w-[24.4%]">
                <select
                  value={machineNo}
                  onChange={(e) => setMachineNo(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] transition-colors"
                >
                  <option value="">— Select or Add Machine —</option>
                  {[...new Set([...dbMachines, ...changes.map(c => c.machineNo).filter(Boolean)])].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <button 
                  type="button"
                  onClick={() => {
                    setTempMachineNo('');
                    setIsMachineModalOpen(true);
                  }}
                  className="flex items-center justify-center w-[36px] bg-slate-50 border border-slate-200 rounded-[6px] text-slate-500 hover:bg-slate-100 hover:text-[#0066cc] transition-colors"
                  title="View DB & Add Machine"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Change Description Section */}
        <div className="bg-white border border-slate-200 rounded-[12px] p-[20px] shadow-sm space-y-[16px]">
          <h4 className="text-[13px] font-bold text-slate-900 border-b border-slate-100 pb-[8px]">Change Description</h4>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px]">
            {/* CONTEXT OF CHANGE */}
            <div className="space-y-[4px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Context of Change <span className="text-rose-500">*</span></label>
              <textarea 
                placeholder="Brief description of WHY this change is needed (min 10 characters)..." 
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] transition-colors resize-none"
              />
              <span className="block text-[9px] text-slate-400">{context.length} / 10 min</span>
            </div>

            {/* DETAILED CHANGE DESCRIPTION */}
            <div className="space-y-[4px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Detailed Change Description <span className="text-rose-500">*</span></label>
              <textarea 
                placeholder="Describe the change — what, why, how, and expected outcome (min 20 characters)..." 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] transition-colors resize-none"
              />
              <span className="block text-[9px] text-slate-400">{description.length} / 20 min</span>
            </div>

            {/* UPLOAD SUPPORTING FILES */}
            <div className="lg:col-span-2">
              {renderAttachmentInput("Upload Supporting Files", fileDesc, setFileDesc, "file-desc-input", "fileDesc", true)}
            </div>
          </div>
        </div>

        {/* 4. Implementation Timeline Section */}
        <div className="bg-white border border-slate-200 rounded-[12px] p-[20px] shadow-sm space-y-[16px]">
          <h4 className="text-[13px] font-bold text-slate-900 border-b border-slate-100 pb-[8px]">Implementation Timeline</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[16px]">
            {/* CHANGE IMPROVEMENT AREA */}
            <div className="space-y-[4px] sm:col-span-1 lg:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Change Improvement Area <span className="text-rose-500">*</span></label>
              <select 
                value={improvementArea} 
                onChange={(e) => setImprovementArea(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] transition-colors"
              >
                <option value="">— Select Area —</option>
                <option value="Quality">Quality</option>
                <option value="Cost">Cost</option>
                <option value="Delivery">Delivery</option>
                <option value="Safety">Safety</option>
              </select>
            </div>

            {/* UPLOAD SUPPORTING FILES */}
            <div className="sm:col-span-1 sm:row-span-2 lg:col-span-2 lg:row-span-2">
              {renderAttachmentInput("Upload Supporting Files", fileImprovement, setFileImprovement, "file-improvement-input", "fileImprovement", true)}
            </div>

            {/* PERMANENT / TEMPORARY CHANGE */}
            <div className="space-y-[4px] sm:col-span-1 lg:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Permanent / Temporary Change <span className="text-rose-500">*</span></label>
              <select 
                value={changeType} 
                onChange={(e) => setChangeType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] transition-colors"
              >
                <option value="">— Select —</option>
                <option value="Permanent">Permanent</option>
                <option value="Temporary">Temporary</option>
              </select>
            </div>

            {/* IMPLEMENT / CHANGE DATE START */}
            <div className="space-y-[4px] sm:col-span-2 lg:col-span-2 relative">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Implement / Change Date Start <span className="text-rose-500">*</span></label>
              <CustomDatePicker 
                value={dateStart}
                onChange={setDateStart}
                containerClassName="sm:max-w-[49%] lg:max-w-full"
                inputClassName="w-full bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] pl-[12px] pr-[28px] text-[12px] outline-none focus:border-[#0066cc] transition-colors"
                buttonClassName="right-[10px] bottom-[12px]"
              />
            </div>

            {/* PART TRACEABILITY DETAILS (FROM CHANGES) */}
            <div className="space-y-[4px] sm:col-span-2 lg:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Part Traceability Details (From Changes) <span className="text-rose-500">*</span></label>
              <textarea 
                placeholder="Describe the change — what, why, how, and expected outcome (min 20 characters)..." 
                value={traceFrom}
                onChange={(e) => setTraceFrom(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] transition-colors resize-none"
              />
              <span className="block text-[9px] text-slate-400">{traceFrom.length} / 20 min</span>
            </div>

            {/* UPLOAD SUPPORTING FILES */}
            <div className="sm:col-span-2 lg:col-span-2">
              {renderAttachmentInput("Upload Supporting Files", fileTraceFrom, setFileTraceFrom, "file-tracefrom-input", "fileTraceFrom")}
            </div>

            {/* CHANGE DATE CLOSE */}
            <div className="space-y-[4px] sm:col-span-2 lg:col-span-2 relative">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Change Date Close <span className="text-rose-500">*</span></label>
              <CustomDatePicker 
                value={dateClose}
                onChange={setDateClose}
                containerClassName="sm:max-w-[49%] lg:max-w-full"
                inputClassName="w-full bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] pl-[12px] pr-[28px] text-[12px] outline-none focus:border-[#0066cc] transition-colors"
                buttonClassName="right-[10px] bottom-[12px]"
              />
            </div>

            {/* PART TRACEABILITY DETAILS (TO CHANGES) */}
            <div className="space-y-[4px] sm:col-span-2 lg:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Part Traceability Details (To Changes) <span className="text-rose-500">*</span></label>
              <textarea 
                placeholder="Describe the change — what, why, how, and expected outcome (min 20 characters)..." 
                value={traceTo}
                onChange={(e) => setTraceTo(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] transition-colors resize-none"
              />
              <span className="block text-[9px] text-slate-400">{traceTo.length} / 20 min</span>
            </div>

            {/* UPLOAD SUPPORTING FILES */}
            <div className="sm:col-span-2 lg:col-span-2">
              {renderAttachmentInput("Upload Supporting Files", fileTraceTo, setFileTraceTo, "file-traceto-input", "fileTraceTo", true)}
            </div>
          </div>
        </div>

        {/* 5. Risk Analysis Section */}
        <div className="bg-white border border-slate-200 rounded-[12px] p-[20px] shadow-sm space-y-[16px]">
          <h4 className="text-[13px] font-bold text-slate-900 border-b border-slate-100 pb-[8px]">Risk Analysis</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
            {/* RISK ANALYSIS */}
            <div className="space-y-[4px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Risk Analysis <span className="text-rose-500">*</span></label>
              <textarea 
                placeholder="Describe potential risks, their likelihood, impact, and mitigation measures..." 
                value={riskAnalysis}
                onChange={(e) => setRiskAnalysis(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] transition-colors resize-none"
              />
            </div>

            {/* UPLOAD SUPPORTING FILES */}
            <div>
              {renderAttachmentInput("Upload Supporting Files", fileRisk, setFileRisk, "file-risk-input", "fileRisk", true)}
            </div>

            {/* UPDATE IN SOP / WI / CONTROL PLAN / FMEA */}
            <div className="space-y-[4px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Update in SOP / WI / Control Plan / FMEA <span className="text-rose-500">*</span></label>
              <textarea 
                placeholder="Describe the updates required in SOP, Work Instructions, Control Plan, FMEA, etc..." 
                value={sopUpdate}
                onChange={(e) => setSopUpdate(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] transition-colors resize-none"
              />
            </div>

            {/* Click to upload updated documents */}
            <div>
              {renderAttachmentInput("Upload Supporting Files (SOP, WI, Control Plan, FMEA)", fileSop, setFileSop, "file-sop-input", "fileSop")}
            </div>

            {/* USER DEPT HOD APPROVAL */}
            <div className="space-y-[4px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">User Dept HOD Approval <span className="text-rose-500">*</span></label>
              <textarea 
                placeholder="Describe HOD review comments, approval status, or conditions..." 
                value={hodApproval}
                onChange={(e) => setHodApproval(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] transition-colors resize-none"
              />
            </div>

            {/* CUSTOMER APPROVAL REQUIRED */}
            <div className="space-y-[4px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer Approval Required <span className="text-rose-500">*</span></label>
              <select 
                value={customerApproval} 
                onChange={(e) => setCustomerApproval(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] transition-colors"
              >
                <option value="">— Select —</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>

            {/* EFFECTIVENESS MONITORING */}
            <div className="space-y-[4px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Effectiveness Monitoring <span className="text-rose-500">*</span></label>
              <textarea 
                placeholder="How will effectiveness of this change be monitored and measured?.." 
                value={effectivenessMonitoring}
                onChange={(e) => setEffectivenessMonitoring(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc] transition-colors resize-none"
              />
            </div>

            {/* UPLOAD SUPPORTING FILES */}
            <div>
              {renderAttachmentInput("Upload Supporting Files", fileEffectiveness, setFileEffectiveness, "file-effectiveness-input", "fileEffectiveness", true)}
            </div>
          </div>
        </div>

        {/* Centered Submit Button */}
        <div className="flex justify-center pt-[16px]">
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="flex items-center justify-center gap-[8px] bg-[#0066cc] hover:bg-[#0052a3] disabled:opacity-60 text-white px-[32px] py-[12px] rounded-[6px] text-[13px] font-bold shadow-md transition-all transform active:scale-[0.98] cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                <span>Submitting...</span>
              </>
            ) : (
              <span>Submit</span>
            )}
          </button>
        </div>
      </form>

      {/* Process Modal */}
      {isProcessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-[16px]">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsProcessModalOpen(false)} />
          <div className="relative bg-white w-full max-w-[400px] rounded-[16px] shadow-2xl border border-slate-200 flex flex-col z-10 max-h-[80vh]">
            <div className="bg-slate-50 px-[20px] py-[14px] border-b border-slate-100 flex items-center justify-between rounded-t-[16px]">
              <h4 className="text-[14px] font-bold text-slate-800">Process Names in DB</h4>
              <button onClick={() => setIsProcessModalOpen(false)} className="p-[4px] hover:bg-slate-200/60 rounded-full text-slate-400 hover:text-slate-650 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-[20px] overflow-y-auto space-y-[16px]">
              <div className="space-y-[4px]">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Add New Process</label>
                <div className="flex gap-[8px]">
                  <input 
                    type="text" 
                    placeholder="Enter new process name..." 
                    value={tempProcessName}
                    onChange={(e) => setTempProcessName(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc]"
                  />
                  <button 
                    type="button"
                    onClick={handleAddProcess}
                    className="bg-[#0066cc] hover:bg-[#0052a3] text-white px-[12px] rounded-[6px] text-[12px] font-bold transition-colors cursor-pointer"
                  >
                    Add / Select
                  </button>
                </div>
              </div>
              <div className="space-y-[8px] pt-[8px] border-t border-slate-100">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Existing Processes</label>
                {dbProcesses.length > 0 ? (
                  <ul className="space-y-[4px]">
                    {dbProcesses.map(p => (
                      <li 
                        key={p} 
                        onClick={() => {
                          setProcessName(p);
                          setIsProcessModalOpen(false);
                        }}
                        className="bg-slate-50 hover:bg-[#e6f0fa] hover:text-[#0066cc] cursor-pointer px-[12px] py-[8px] rounded-[6px] text-[12px] text-slate-600 font-medium transition-colors border border-transparent hover:border-[#b2d1f0] flex justify-between items-center"
                      >
                        <span>{p}</span>
                        <button onClick={(e) => handleDeleteProcess(p, e)} className="text-slate-400 hover:text-rose-500 p-[4px] rounded-full hover:bg-white transition-colors" title="Delete Process">
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[12px] text-slate-400">No existing processes found in DB.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Machine Modal */}
      {isMachineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-[16px]">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMachineModalOpen(false)} />
          <div className="relative bg-white w-full max-w-[400px] rounded-[16px] shadow-2xl border border-slate-200 flex flex-col z-10 max-h-[80vh]">
            <div className="bg-slate-50 px-[20px] py-[14px] border-b border-slate-100 flex items-center justify-between rounded-t-[16px]">
              <h4 className="text-[14px] font-bold text-slate-800">Machine Nos in DB</h4>
              <button onClick={() => setIsMachineModalOpen(false)} className="p-[4px] hover:bg-slate-200/60 rounded-full text-slate-400 hover:text-slate-650 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-[20px] overflow-y-auto space-y-[16px]">
              <div className="space-y-[4px]">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Add New Machine No</label>
                <div className="flex gap-[8px]">
                  <input 
                    type="text" 
                    placeholder="Enter new machine no..." 
                    value={tempMachineNo}
                    onChange={(e) => setTempMachineNo(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:border-[#0066cc]"
                  />
                  <button 
                    type="button"
                    onClick={async () => {
                      if (tempMachineNo.trim()) {
                        try {
                          await addMachine(tempMachineNo.trim());
                          setMachineNo(tempMachineNo.trim());
                          setTempMachineNo('');
                          setIsMachineModalOpen(false);
                          fetchOptions();
                        } catch (e) {
                          console.error('Error adding machine:', e);
                        }
                      }
                    }}
                    className="bg-[#0066cc] hover:bg-[#0052a3] text-white px-[12px] rounded-[6px] text-[12px] font-bold transition-colors cursor-pointer"
                  >
                    Add / Select
                  </button>
                </div>
              </div>
              <div className="space-y-[8px] pt-[8px] border-t border-slate-100">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Existing Machines</label>
                {dbMachines.length > 0 ? (
                  <ul className="space-y-[4px]">
                    {dbMachines.map(m => (
                      <li 
                        key={m} 
                        onClick={() => {
                          setMachineNo(m);
                          setIsMachineModalOpen(false);
                        }}
                        className="bg-slate-50 hover:bg-[#e6f0fa] hover:text-[#0066cc] cursor-pointer px-[12px] py-[8px] rounded-[6px] text-[12px] text-slate-600 font-medium transition-colors border border-transparent hover:border-[#b2d1f0] flex justify-between items-center"
                      >
                        <span>{m}</span>
                        <button onClick={(e) => handleDeleteMachine(m, e)} className="text-slate-400 hover:text-rose-500 p-[4px] rounded-full hover:bg-white transition-colors" title="Delete Machine">
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[12px] text-slate-400">No existing machines found in DB.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-[16px]">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setItemToDelete(null)} />
          <div className="relative bg-white w-full max-w-[320px] rounded-[16px] shadow-2xl border border-slate-200 flex flex-col z-10 p-[24px] text-center animate-fade-in-up">
            <div className="mx-auto bg-rose-100 text-rose-600 p-[12px] rounded-full mb-[16px]">
              <AlertTriangle size={24} />
            </div>
            <h4 className="text-[16px] font-bold text-slate-800 mb-[8px]">Delete {itemToDelete.type === 'process' ? 'Process' : 'Machine'}?</h4>
            <p className="text-[13px] text-slate-500 mb-[24px]">
              Are you sure you want to delete "{itemToDelete.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-[12px] w-full">
              <button 
                onClick={() => setItemToDelete(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-[10px] rounded-[8px] text-[13px] font-bold transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-[10px] rounded-[8px] text-[13px] font-bold transition-colors shadow-sm"
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
