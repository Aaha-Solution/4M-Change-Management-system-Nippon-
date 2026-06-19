import { useState, useEffect } from 'react';
import { ClipboardList, Eye, EyeOff, X, Loader2, AlertTriangle, Paperclip, Folder, Cpu, Clock, CheckCircle2, FileText, Calendar, Download } from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';
import TablePagination from '@mui/material/TablePagination';
import { formatDateToDDMMYY, parseDDMMYYYYToDate, formatDateToDDMMYYYY } from '../../utils/dateUtils';
import { getRequestDisplayStatus } from '../../utils/statusUtils';
// import { getSyncedDate } from '../../utils/timeSync';
import { CustomDatePicker } from '../ui/CustomDatePicker';
import { getL1Details, getL1Attachment, getL2Details, getL2Attachment, getL3Approvals, updateChangeDetails } from '../../api/apiRoutes';
import { exportRequestsListPDF, exportRequestDetailsPDF } from '../../utils/pdfExport';

export const AllRequests = ({
  changes,
  setToastMsg,
  usersList = [],
  autoOpenChangeNo = null,
  clearAutoOpen = () => {},
  isAdmin = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedPerson, setSelectedPerson] = useState('All');
  const [selectedProcess, setSelectedProcess] = useState('All');
  const [selectedMachine, setSelectedMachine] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Details Modal States
  const [selectedLog, setSelectedLog] = useState(null);
  const [selectedL1Details, setSelectedL1Details] = useState(null);
  const [selectedL2Details, setSelectedL2Details] = useState(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('l1');
  const [previewFile, setPreviewFile] = useState(null);
  const [fileUrls, setFileUrls] = useState({});
  const [showCustomerApproval, setShowCustomerApproval] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editL1Data, setEditL1Data] = useState({});
  const [editL2Data, setEditL2Data] = useState({});
  const [editL3Data, setEditL3Data] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedLog) {
      setShowCustomerApproval(false);
    }
  }, [selectedLog]);

  useWebSocket((data) => {
    if (data.type === 'REFRESH_CHANGES' && selectedLog) {
      handleViewDetails({
        id: selectedLog.changeNo,
        requester: selectedLog.requester,
        rawDate: selectedLog.date,
        status: selectedLog.status,
        hodStatus: selectedLog.hodStatus
      });
    }
  });

  // Reset page when any filter changes
  useEffect(() => {
    setPage(0);
  }, [searchQuery, selectedMonth, fromDate, toDate, selectedPerson, selectedProcess, selectedMachine, selectedStatus]);



  const monthsList = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const monthOptions = monthsList;

  const formattedDbChanges = changes.map((c) => {
    const displayDate = formatDateToDDMMYY(c.date);
    const displayStatus = getRequestDisplayStatus(c);

    return {
      id: c.id,
      machineNo: c.machineNo || '',
      processName: c.processName || '',
      department: c.dept || c.department || 'PRODUCTION',
      date: displayDate,
      status: displayStatus,
      requester: c.requester,
      title: c.title,
      rawDate: c.date,
      requesterEmail: c.requesterEmail,
      hodStatus: c.hodStatus,
      l2Status: c.l2Status,
      hasL3Rejection: c.hasL3Rejection,
      isL3Complete: c.isL3Complete
    };
  });

  const combinedData = formattedDbChanges;

  // Get unique filter options
  const uniquePersons = [
    { email: 'All', name: 'All Persons', department: '', role: '' },
    ...(() => {
      const peopleMap = new Map();
      usersList.forEach(u => {
        if (u.email) {
          const emailLower = u.email.toLowerCase();
          peopleMap.set(emailLower, {
            email: u.email,
            name: u.name || '',
            department: u.department || '',
            role: u.role || ''
          });
        }
      });
      combinedData.forEach(c => {
        const email = c.requesterEmail;
        const name = c.requester;
        if (email) {
          const emailLower = email.toLowerCase();
          if (!peopleMap.has(emailLower)) {
            peopleMap.set(emailLower, {
              email: email,
              name: name || email.split('@')[0],
              department: c.dept || c.department || '',
              role: ''
            });
          }
        } else if (name) {
          const nameLower = name.toLowerCase();
          if (!peopleMap.has(nameLower)) {
            peopleMap.set(nameLower, {
              email: '',
              name: name,
              department: c.dept || c.department || '',
              role: ''
            });
          }
        }
      });
      return Array.from(peopleMap.values());
    })()
  ];
  const filterProcesses = ['All', ...new Set(combinedData.map(i => i.processName).filter(Boolean))];
  const filterMachines = ['All', ...new Set(combinedData.map(i => i.machineNo).filter(Boolean))];
  const filterStatuses = ['All', ...new Set(combinedData.map(i => i.status).filter(Boolean))];

  // Apply filters
  const filteredData = combinedData.filter(item => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || 
      item.id.toLowerCase().includes(query) ||
      (item.department && item.department.toLowerCase().includes(query)) ||
      (item.machineNo && item.machineNo.toLowerCase().includes(query)) ||
      (item.requester && item.requester.toLowerCase().includes(query));

    const matchesPerson = selectedPerson === 'All' || 
      (item.requesterEmail && item.requesterEmail.toLowerCase() === selectedPerson.toLowerCase()) ||
      (item.requester && item.requester.toLowerCase() === selectedPerson.toLowerCase());
    const matchesProcess = selectedProcess === 'All' || item.processName === selectedProcess;
    const matchesMachine = selectedMachine === 'All' || item.machineNo === selectedMachine;
    const matchesStatus = selectedStatus === 'All' || item.status === selectedStatus;

    let matchesMonth = true;
    if (selectedMonth !== 'All') {
      try {
        const d = new Date(item.rawDate);
        if (!isNaN(d.getTime())) {
          const itemMonthName = d.toLocaleDateString('en-US', { month: 'short' });
          matchesMonth = (itemMonthName === selectedMonth);
        } else {
          matchesMonth = false;
        }
      } catch {
        matchesMonth = false;
      }
    }

    let matchesFromDate = true;
    if (fromDate) {
      const fD = parseDDMMYYYYToDate(fromDate);
      if (fD) {
        fD.setHours(0,0,0,0);
        const itemD = parseDDMMYYYYToDate(item.rawDate);
        matchesFromDate = itemD && itemD >= fD;
      }
    }

    let matchesToDate = true;
    if (toDate) {
      const tD = parseDDMMYYYYToDate(toDate);
      if (tD) {
        tD.setHours(23,59,59,999);
        const itemD = parseDDMMYYYYToDate(item.rawDate);
        matchesToDate = itemD && itemD <= tD;
      }
    }

    return matchesSearch && matchesPerson && matchesProcess && matchesMachine && matchesMonth && matchesFromDate && matchesToDate && matchesStatus;
  });

  const paginatedData = filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Load details handler
  const handleViewDetails = async (request) => {
    // Open modal immediately with skeleton data to avoid blinking/flicker
    setSelectedLog({
      changeNo: request.id,
      requester: request.requester,
      date: request.rawDate,
      status: request.status,
      hodStatus: request.hodStatus,
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
    });
    setSelectedL1Details(null);
    setSelectedL2Details(null);
    setIsFetchingDetails(true);
    setActiveTab('l1');

    try {
      const [l1Res, l2Res, l3Res] = await Promise.all([
        getL1Details(request.id),
        getL2Details(request.id).catch(() => ({ data: null })),
        getL3Approvals().catch(() => ({ data: [] }))
      ]);

      setSelectedL1Details(l1Res.data);
      setSelectedL2Details(l2Res.data);
      setEditL1Data(l1Res.data || {});
      setEditL2Data(l2Res.data || {});

      const matchedL3 = l3Res.data?.find(log => log.changeNo === request.id);
      const newLogData = matchedL3 ? { ...matchedL3, hodStatus: request.hodStatus } : {
        changeNo: request.id,
        requester: request.requester,
        date: request.rawDate,
        hodStatus: request.hodStatus,
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
      setEditL3Data(newLogData || {});
    } catch (err) {
      console.error('Error fetching request details:', err);
    } finally {
      setIsFetchingDetails(false);
    }
  };

  // Auto-open request details modal when navigated from dashboard overview Eye icon
  useEffect(() => {
    if (autoOpenChangeNo && combinedData.length > 0) {
      const match = combinedData.find(c => c.id === autoOpenChangeNo);
      if (match) {
        handleViewDetails(match);
        if (clearAutoOpen) {
          clearAutoOpen();
        }
      }
    }
  }, [autoOpenChangeNo, combinedData, clearAutoOpen]);

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

  const handleExportPDF = () => {
    exportRequestsListPDF(filteredData, {
      searchQuery,
      selectedMonth,
      selectedPerson,
      selectedProcess,
      selectedMachine,
      fromDate,
      toDate
    }, setToastMsg);
  };

  const handleExportRequestDetailsPDF = () => {
    exportRequestDetailsPDF(selectedL1Details, selectedL2Details, selectedLog, setToastMsg);
  };

  const handleClosePreview = () => {
    if (previewFile && fileUrls[previewFile]) {
      URL.revokeObjectURL(fileUrls[previewFile]);
      setFileUrls(prev => {
        const copy = { ...prev };
        delete copy[previewFile];
        return copy;
      });
    }
    setPreviewFile(null);
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

  const handleSaveEdits = async () => {
    setIsSaving(true);
    try {
      if (activeTab === 'l1') {
        await updateChangeDetails(selectedLog.changeNo, 'l1', editL1Data);
        setSelectedL1Details(editL1Data);
      } else if (activeTab === 'l2') {
        await updateChangeDetails(selectedLog.changeNo, 'l2', editL2Data);
        setSelectedL2Details(editL2Data);
      } else if (activeTab === 'l3') {
        await updateChangeDetails(selectedLog.changeNo, 'l3', editL3Data);
        setSelectedLog(editL3Data);
      }
      setToastMsg(`${activeTab.toUpperCase()} details updated successfully!`);
      setIsEditMode(false);
    } catch (err) {
      console.error(err);
      setToastMsg('Failed to save updates.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderDynamicEditForm = (data, setData, tab = 'l1') => {
    if (!data) return <div className="text-sm text-slate-500">No data available to edit.</div>;

    const renderInput = (key, value) => {
      if (['id', 'change_no', 'changeNo'].includes(key)) return null;
      return (
        <div key={key} className="space-y-[4px]">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{key.replace(/_/g, ' ')}</label>
          {typeof value === 'string' && value.length > 100 ? (
            <textarea
              className="w-full bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:ring-4 focus:ring-[#0066cc]/10 focus:border-[#0066cc] transition-all duration-200 resize-none"
              rows={4}
              value={value || ''}
              onChange={(e) => setData({ ...data, [key]: e.target.value })}
            />
          ) : (
            <input
              type="text"
              className="w-full bg-slate-50 border border-slate-200 rounded-[6px] py-[8px] px-[12px] text-[12px] outline-none focus:ring-4 focus:ring-[#0066cc]/10 focus:border-[#0066cc] transition-all duration-200"
              value={value || ''}
              onChange={(e) => setData({ ...data, [key]: e.target.value })}
            />
          )}
        </div>
      );
    };

    if (tab === 'l1') {
      const tKeys = ['trace_from', 'trace_to', 'risk_analysis', 'sop_update', 'customer_approval', 'effectiveness_monitoring', 'hod_approval', 'hodStatus', 'hodRemarks', 'file_trace_from', 'file_trace_to', 'file_risk', 'file_sop', 'file_effectiveness'];
      const dKeys = ['description', 'improvement_area', 'date_start', 'date_close', 'file_desc', 'file_improvement', 'improvement_table_data'];
      const gKeys = ['title', 'unit', 'change_in', 'dept', 'change_type', 'process_name', 'process_line', 'machine_no', 'request_by', 'crRequester', 'crDate', 'requested_time', 'crStatus'];

      const tGroup = Object.entries(data).filter(([k]) => tKeys.includes(k));
      const dGroup = Object.entries(data).filter(([k]) => dKeys.includes(k));
      const gGroup = Object.entries(data).filter(([k]) => gKeys.includes(k));
      const oGroup = Object.entries(data).filter(([k]) => !tKeys.includes(k) && !dKeys.includes(k) && !gKeys.includes(k));

      return (
        <div className="space-y-[24px] animate-fade-in-up">
          <div className="bg-white border border-slate-200/60 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 space-y-[16px]">
            <h4 className="text-[13px] font-bold text-slate-900 border-b border-slate-100 pb-[8px] flex items-center gap-1.5"><Folder size={14} className="text-[#0066cc]" /> General Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
              {gGroup.map(([k, v]) => renderInput(k, v))}
              {oGroup.map(([k, v]) => renderInput(k, v))}
            </div>
          </div>
          <div className="bg-white border border-slate-200/60 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 space-y-[16px]">
            <h4 className="text-[13px] font-bold text-slate-900 border-b border-slate-100 pb-[8px] flex items-center gap-1.5"><FileText size={14} className="text-[#0066cc]" /> Details & Justification</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">{dGroup.map(([k, v]) => renderInput(k, v))}</div>
          </div>
          <div className="bg-white border border-slate-200/60 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 space-y-[16px]">
            <h4 className="text-[13px] font-bold text-slate-900 border-b border-slate-100 pb-[8px] flex items-center gap-1.5"><Cpu size={14} className="text-[#0066cc]" /> Traceability, Risk & Approvals</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">{tGroup.map(([k, v]) => renderInput(k, v))}</div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white border border-slate-200/60 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 space-y-[16px] animate-fade-in-up">
        <h4 className="text-[13px] font-bold text-slate-900 border-b border-slate-100 pb-[8px] flex items-center gap-1.5">
          <FileText size={14} className="text-[#0066cc]" /> {tab === 'l2' ? 'Validation Details' : 'Approval Details'}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
          {Object.entries(data).map(([key, value]) => renderInput(key, value))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-[20px] animate-fade-in-up w-full min-w-0">
      {/* Search and Filters row */}
      <div className="flex flex-wrap gap-[12px] p-[16px] bg-white border border-slate-200 rounded-[12px] shadow-sm text-[10px]">
        {/* SEARCH QUERY */}
        <div className="flex-1 min-w-[200px] space-y-[4px]">
          <label className="block font-bold text-slate-400 uppercase tracking-wider">Search Query</label>
          <input 
            type="text" 
            placeholder="Search ID, Dept, Person..." 
            className="w-full px-[8px] py-[6px] border border-slate-200 rounded-[4px] bg-white outline-none placeholder-slate-350 text-[11px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* BY MONTH */}
        <div className="flex-1 min-w-[120px] space-y-[4px]">
          <label className="block font-bold text-slate-400 uppercase tracking-wider">By Month</label>
          <select 
            className="w-full px-[8px] py-[6px] border border-slate-200 rounded-[4px] bg-white outline-none text-[11px]"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="All">All Months</option>
            {monthOptions.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* FROM DATE */}
        <div className="flex-1 min-w-[130px] space-y-[4px] relative">
          <label className="block font-bold text-slate-400 uppercase tracking-wider">From Date</label>
          <CustomDatePicker 
            value={fromDate}
            onChange={(val) => {
              if (val && toDate) {
                 const [fd, fm, fy] = val.split('/');
                 const [td, tm, ty] = toDate.split('/');
                 const fDate = new Date(fy, fm - 1, fd);
                 const tDate = new Date(ty, tm - 1, td);
                 if (fDate > tDate) {
                   setToastMsg("'From Date' cannot be later than 'To Date'.");
                   return;
                 }
              }
              setFromDate(val);
            }}
            inputClassName="w-full pl-[8px] pr-[24px] py-[6px] border border-slate-200 rounded-[4px] bg-white outline-none placeholder-slate-350 text-[11px] text-slate-500"
            buttonClassName="right-[8px] bottom-[8px]"
          />
        </div>

        {/* TO DATE */}
        <div className="flex-1 min-w-[130px] space-y-[4px] relative">
          <label className="block font-bold text-slate-400 uppercase tracking-wider">To Date</label>
          <div onClickCapture={(e) => {
            if (!fromDate) {
              e.stopPropagation();
              setToastMsg("Please select 'From Date' before selecting 'To Date'.");
            }
          }}>
            <CustomDatePicker 
              value={toDate}
              onChange={(val) => {
                if (val && fromDate) {
                   const [fd, fm, fy] = fromDate.split('/');
                   const [td, tm, ty] = val.split('/');
                   const fDate = new Date(fy, fm - 1, fd);
                   const tDate = new Date(ty, tm - 1, td);
                   if (tDate < fDate) {
                     setToastMsg("'To Date' cannot be earlier than 'From Date'.");
                     return;
                   }
                }
                setToDate(val);
              }}
              inputClassName={`w-full pl-[8px] pr-[24px] py-[6px] border border-slate-200 rounded-[4px] bg-white outline-none placeholder-slate-355 text-[11px] text-slate-500 ${!fromDate ? 'opacity-70 cursor-not-allowed bg-slate-50' : ''}`}
              buttonClassName="right-[8px] bottom-[8px]"
              disabled={!fromDate}
            />
          </div>
        </div>

        {/* BY PERSON */}
        <div className="flex-1 min-w-[130px] space-y-[4px]">
          <label className="block font-bold text-slate-400 uppercase tracking-wider">By Person</label>
          <select 
            className="w-full px-[8px] py-[6px] border border-slate-200 rounded-[4px] bg-white outline-none text-[11px]"
            value={selectedPerson}
            onChange={(e) => setSelectedPerson(e.target.value)}
          >
            {uniquePersons.map(p => {
              if (p.email === 'All') return <option key="All" value="All">All Persons</option>;
              
              const value = p.email || p.name;
              const displayName = p.name || (p.email ? p.email.split('@')[0] : 'Unknown');
              
              const roleLower = (p.role || '').toLowerCase();
              const isUserHOD = roleLower.includes('hod') || 
                                roleLower.includes('unit head') || 
                                roleLower.includes('unit_head') || 
                                roleLower.includes('manager');
              const deptName = p.department || '';

              let labelSuffix = '';
              if (deptName) {
                labelSuffix = isUserHOD ? `${deptName} - HOD` : deptName;
              } else if (isUserHOD) {
                labelSuffix = 'HOD';
              }

              const label = labelSuffix ? `${displayName} (${labelSuffix})` : displayName;
              return (
                <option key={value} value={value}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>

        {/* BY PROCESS */}
        <div className="flex-1 min-w-[150px] space-y-[4px]">
          <label className="block font-bold text-slate-400 uppercase tracking-wider">By Process</label>
          <select 
            className="w-full px-[8px] py-[6px] border border-slate-200 rounded-[4px] bg-white outline-none text-[11px]"
            value={selectedProcess}
            onChange={(e) => setSelectedProcess(e.target.value)}
          >
            {filterProcesses.map(p => (
              <option key={p} value={p}>{p === 'All' ? 'All Processes' : p}</option>
            ))}
          </select>
        </div>

        {/* BY M/C NO */}
        <div className="flex-1 min-w-[150px] space-y-[4px]">
          <label className="block font-bold text-slate-400 uppercase tracking-wider">By M/C No</label>
          <select 
            className="w-full px-[8px] py-[6px] border border-slate-200 rounded-[4px] bg-white outline-none text-[11px]"
            value={selectedMachine}
            onChange={(e) => setSelectedMachine(e.target.value)}
          >
            {filterMachines.map(m => (
              <option key={m} value={m}>{m === 'All' ? 'All Machines' : m}</option>
            ))}
          </select>
        </div>

        {/* BY STATUS */}
        <div className="flex-1 min-w-[120px] space-y-[4px]">
          <label className="block font-bold text-slate-400 uppercase tracking-wider">By Status</label>
          <select 
            className="w-full px-[8px] py-[6px] border border-slate-200 rounded-[4px] bg-white outline-none text-[11px]"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            {filterStatuses.map(s => (
              <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
            ))}
          </select>
        </div>

        {/* RESET FILTERS */}
        {(searchQuery || selectedMonth !== 'All' || fromDate || toDate || selectedPerson !== 'All' || selectedProcess !== 'All' || selectedMachine !== 'All' || selectedStatus !== 'All') && (
          <div className="flex-[0.5] min-w-[80px] flex items-end animate-fade-in-up">
            <button 
              onClick={() => {
                setSearchQuery('');
                setSelectedMonth('All');
                setFromDate('');
                setToDate('');
                setSelectedPerson('All');
                setSelectedProcess('All');
                setSelectedMachine('All');
                setSelectedStatus('All');
              }}
              className="w-full px-[10px] py-[6px] bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 border border-rose-200 rounded-[4px] font-bold transition-colors shadow-sm flex items-center justify-center gap-[4px] text-[11px] cursor-pointer"
              title="Reset all filters"
            >
              <X size={12} strokeWidth={3} />
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Main requests Table card */}
      <div className="bg-white border border-slate-200/60 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden w-full max-w-full min-w-0">
        <div className="p-[20px] border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-[12px]">
          <div className="flex items-center gap-[8px]">
            <h3 className="font-heading text-[18px] font-bold text-slate-900">All change requests</h3>
            <ClipboardList size={18} className="text-slate-400" />
          </div>
          <div className="flex items-center gap-[12px] flex-wrap">
            {/* Showing results count */}
            <span className="bg-slate-100 border border-slate-200 text-slate-500 rounded-full px-[10px] py-[2px] text-[10px] font-bold select-none">
              Showing {filteredData.length} of {combinedData.length}
            </span>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-[6px] bg-[#0066cc] hover:bg-[#0052a3] text-white px-[12px] py-[5px] rounded-[8px] text-[11px] font-bold cursor-pointer transition-all shadow-sm duration-200"
              title="Export filtered requests as PDF"
            >
              <Download size={12} />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse table-fixed min-w-[1120px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150">
                <th className="p-[16px] text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[70px]">SL. NO.</th>
                <th className="p-[16px] text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[130px]">CHANGE NO.</th>
                <th className="p-[16px] text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[280px]">TITLE / CONTEXT</th>
                <th className="p-[16px] text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[180px]">REQUESTED BY</th>
                <th className="p-[16px] text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[130px]">DEPARTMENT</th>
                <th className="p-[16px] text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[120px]">REQUEST DATE</th>
                <th className="p-[16px] text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[130px]">STATUS</th>
                <th className="p-[16px] text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center w-[80px]">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-[48px] text-slate-400 text-[14px]">
                    No matching change requests found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-[16px] text-[12px] text-slate-500 font-semibold">{page * rowsPerPage + idx + 1}</td>
                    <td className="p-[16px] text-[12px] font-bold text-[#0066cc] hover:underline cursor-pointer" onClick={() => handleViewDetails(r)}>{r.id}</td>
                    <td className="p-[16px] text-[12px] text-slate-650 font-medium truncate" title={r.title}>{r.title}</td>
                    <td className="p-[16px] text-[12px] text-slate-600 font-medium truncate" title={r.requester}>{r.requester}</td>
                    <td className="p-[16px] text-[12px] text-slate-600 font-medium">{r.department}</td>
                    <td className="p-[16px] text-[12px] text-slate-500">{r.date}</td>
                    <td className="p-[16px]">
                      <span className={`inline-flex items-center gap-[4px] px-[10px] py-[2px] rounded-full text-[11px] font-semibold border ${
                        r.status === 'Pending L3' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                        r.status === 'Pending L2' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                        r.status === 'Pending L1 HOD' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                        r.status === 'Approved' ? 'bg-emerald-50 border-emerald-250 text-emerald-700' :
                        r.status === 'Rejected' ? 'bg-rose-50 border-rose-250 text-rose-700' :
                        'bg-teal-50 border-teal-200 text-teal-700'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-[16px] text-center">
                      <button 
                        onClick={() => handleViewDetails(r)}
                        className="p-[4px] hover:bg-slate-100 rounded text-slate-400 hover:text-[#0066cc] transition-colors cursor-pointer"
                        title="View Details"
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
          count={filteredData.length}
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

      {/* Details Modal (L1, L2, L3 Tabs) */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-[16px]">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setSelectedLog(null)}
          />
          
          {/* Modal Container */}
          <div className="relative bg-white w-full max-w-[800px] max-h-[90vh] rounded-[16px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-10 animate-fade-in-up">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 px-[24px] py-[18px] border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-[10px]">
                <span className="p-2 bg-[#e6f0fa] text-[#0066cc] rounded-lg">
                  <Eye size={18} />
                </span>
                <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-[15px] font-bold text-slate-900">Change Request Details (L1, L2, L3)</h4>
                  {isAdmin && (
                    <button
                      onClick={() => setIsEditMode(!isEditMode)}
                      className={`ml-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                        isEditMode ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {isEditMode ? 'Cancel Edit' : 'Edit Mode'}
                    </button>
                  )}
                  {isEditMode && (
                    <button
                      onClick={handleSaveEdits}
                      disabled={isSaving}
                      className="ml-2 px-3 py-1 bg-emerald-600 text-white rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                      Save
                    </button>
                  )}
                </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Tracking details for: <span className="font-mono font-bold text-slate-600">{selectedLog.changeNo}</span></p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="p-[6px] hover:bg-slate-200/60 rounded-full text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs Header */}
            <div className="flex border-b border-slate-200 bg-slate-50/50 shrink-0">
              <button
                onClick={() => setActiveTab('l1')}
                className={`flex-1 py-[12px] text-center text-[12px] font-bold border-b-2 transition-colors ${
                  activeTab === 'l1' 
                    ? 'border-[#0066cc] text-[#0066cc]' 
                    : 'border-transparent text-slate-500 hover:text-slate-850'
                }`}
              >
                1. L1 Request Details
              </button>
              <button
                onClick={() => setActiveTab('l2')}
                className={`flex-1 py-[12px] text-center text-[12px] font-bold border-b-2 transition-colors ${
                  activeTab === 'l2' 
                    ? 'border-[#0066cc] text-[#0066cc]' 
                    : 'border-transparent text-slate-500 hover:text-slate-850'
                }`}
              >
                2. L2 Validation Details
              </button>
              <button
                onClick={() => setActiveTab('l3')}
                className={`flex-1 py-[12px] text-center text-[12px] font-bold border-b-2 transition-colors ${
                  activeTab === 'l3' 
                    ? 'border-[#0066cc] text-[#0066cc]' 
                    : 'border-transparent text-slate-500 hover:text-slate-850'
                }`}
              >
                3. L3 Approval Details
              </button>
            </div>

            {/* Content */}
            <div className={`p-[24px] overflow-y-auto space-y-[24px] text-[13px] text-slate-600 flex-1 ${isFetchingDetails ? 'flex flex-col justify-center items-center' : ''}`}>
              {isFetchingDetails ? (
                <div className="flex flex-col items-center justify-center py-[60px] gap-3 text-slate-400 my-auto">
                  <Loader2 className="animate-spin text-[#0066cc]" size={32} />
                  <span className="text-sm font-semibold text-slate-700">Loading Change Request details...</span>
                </div>
              ) : (
                <>
              {activeTab === 'l1' && selectedL1Details && (
                <div className="space-y-[20px]">
                  {isEditMode ? renderDynamicEditForm(editL1Data, setEditL1Data, 'l1') : (
                    <>
                  {/* General Info */}
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
                            selectedL1Details.hodStatus === 'Rejected'
                              ? 'bg-rose-50 border-rose-220 text-rose-700'
                              : (selectedL1Details.hodStatus === 'Approved' || selectedL1Details.crStatus !== 'Pending')
                              ? 'bg-emerald-50 border-emerald-220 text-emerald-700' 
                              : 'bg-amber-50 border-amber-220 text-amber-700'
                          }`}>
                            L1 {selectedL1Details.hodStatus === 'Rejected' ? 'Rejected' : ((selectedL1Details.hodStatus === 'Approved' || selectedL1Details.crStatus !== 'Pending') ? 'Approved' : 'Pending')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px] mt-[12px]">
                      <div className="space-y-[4px] min-w-0">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Change Title / Context</span>
                        <span className="font-semibold text-slate-850 block break-words">{selectedL1Details.title}</span>
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
                      <div className="space-y-[4px] md:col-span-2 min-w-0">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Requested By</span>
                        <span className="font-semibold text-slate-800 block break-words">{selectedL1Details.request_by}</span>
                        <span className="block text-[11px] text-slate-400 mt-0.5 font-mono break-all">{selectedL1Details.crRequester}</span>
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

                  {/* Details & Justification */}
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

                        {/* TABLE VIEW FOR IMPROVEMENT DATA */}
                        {(() => {
                          if (!selectedL1Details.improvement_table_data) return null;
                          let tableData;
                          try {
                            tableData = JSON.parse(selectedL1Details.improvement_table_data);
                          } catch {
                            return null;
                          }
                          if (!Array.isArray(tableData) || tableData.length === 0) return null;

                          const area = (selectedL1Details.improvement_area || '').toLowerCase();
                          const hasCost = area === 'cost';
                          const hasProductivity = area === 'productivity';
                          const hasQuality = area === 'quality';

                          if (!hasCost && !hasProductivity && !hasQuality) return null;

                          return (
                            <div className="mt-3 border border-slate-200 rounded-[8px] overflow-hidden bg-white">
                              <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 text-[10px] font-bold text-slate-650 uppercase tracking-wider">
                                {hasCost ? 'Cost Saving Data' : hasProductivity ? 'Productivity Improvement Data' : 'Quality Improvement Data'}
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-[11px]">
                                  <thead>
                                    <tr className="bg-slate-100/50 border-b border-slate-200 text-slate-500 font-semibold">
                                      <th className="p-2">4M #</th>
                                      <th className="p-2">Date</th>
                                      {hasCost && (
                                        <>
                                          <th className="p-2">Save/Month</th>
                                          <th className="p-2">Save/Annum</th>
                                          <th className="p-2">ROI</th>
                                        </>
                                      )}
                                      {hasProductivity && (
                                        <>
                                          <th className="p-2">Current</th>
                                          <th className="p-2">Improved</th>
                                        </>
                                      )}
                                      {hasQuality && (
                                        <>
                                          <th className="p-2">Current PPM</th>
                                          <th className="p-2">Reduced PPM</th>
                                        </>
                                      )}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {tableData.map((row, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50/50 text-slate-700">
                                        <td className="p-2 font-mono font-medium">{row.changeNo}</td>
                                        <td className="p-2">{row.date || '-'}</td>
                                        {hasCost && (
                                          <>
                                            <td className="p-2 font-semibold">Rs. {row.monthlySave || '0'}</td>
                                            <td className="p-2 font-semibold">Rs. {row.annualSave || '0'}</td>
                                            <td className="p-2">{row.roi || '-'}</td>
                                          </>
                                        )}
                                        {hasProductivity && (
                                          <>
                                            <td className="p-2">{row.currentProd || '0'} nos</td>
                                            <td className="p-2 font-semibold">{row.improvedProd || '0'} nos</td>
                                          </>
                                        )}
                                        {hasQuality && (
                                          <>
                                            <td className="p-2">{row.currentPpm || '0'}</td>
                                            <td className="p-2 font-semibold">{row.reducedPpm || '0'}</td>
                                          </>
                                        )}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })()}
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

                  {/* Traceability, Risk & Approvals */}
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
                          <span>{showCustomerApproval ? selectedL1Details.customer_approval : '••••'}</span>
                          <button
                            type="button"
                            onClick={() => setShowCustomerApproval(!showCustomerApproval)}
                            className="p-0.5 hover:bg-slate-200/60 rounded text-slate-400 hover:text-[#0066cc] transition-colors cursor-pointer ml-1 inline-flex items-center justify-center"
                            title={showCustomerApproval ? "Hide Customer Approval" : "Show Customer Approval"}
                          >
                            {showCustomerApproval ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
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
                    {selectedL1Details.hodStatus && (
                      <div className="space-y-[4px] mt-4 border-t border-slate-100 pt-4">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">HOD {selectedL1Details.hodStatus} Remarks / Comments ({selectedL1Details.hodDept || 'HOD'})</span>
                        <div className="bg-slate-50 border border-slate-200 rounded-[8px] p-[16px] text-slate-700 leading-relaxed min-h-[80px] max-h-[150px] overflow-y-auto break-words">
                          {selectedL1Details.hodRemarks || 'No remarks provided.'}
                        </div>
                      </div>
                    )}
                  </div>
                  </>
                  )}
                </div>
              )}

              {activeTab === 'l2' && (
                !selectedL2Details ? (
                  <div className="text-center py-[64px] bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <AlertTriangle className="mx-auto mb-[12px] text-slate-300" size={32} />
                    <span className="text-slate-400 font-medium">No L2 Validation Details found for this request.</span>
                  </div>
                ) : (
                  <div className="space-y-[20px]">
                    {isEditMode ? renderDynamicEditForm(editL2Data, setEditL2Data, 'l2') : (
                      <>
                    <h5 className="text-[12px] font-bold text-[#0066cc] uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                      <CheckCircle2 size={14} />
                      <span>L2 Validation Details</span>
                    </h5>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-[16px] bg-slate-50 border border-slate-150 rounded-[10px] p-[16px]">
                      <div className="space-y-[4px]">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Validation Date</span>
                        <span className="font-medium text-slate-700">{selectedL2Details.date || '-'}</span>
                      </div>
                      <div className="space-y-[4px]">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Validated By</span>
                        <span className="font-semibold text-slate-800">{selectedL2Details.requester || '-'}</span>
                      </div>
                      <div className="space-y-[4px]">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Validation Status</span>
                        <div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            selectedL2Details.status === 'Accepted'
                              ? 'bg-emerald-50 border-emerald-220 text-emerald-700'
                              : selectedL2Details.status === 'Rejected'
                              ? 'bg-rose-50 border-rose-220 text-rose-700'
                              : 'bg-amber-50 border-amber-220 text-amber-700'
                          }`}>
                            L2 {selectedL2Details.status === 'Accepted' ? 'Approved' : (selectedL2Details.status || 'Pending')}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-[4px]">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Change No</span>
                        <span className="font-mono font-bold text-slate-800">{selectedL2Details.changeNo}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px] mt-4">
                      <div className="space-y-[6px]">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">PED Validation Attachment</span>
                        <div className="bg-slate-50 border border-slate-200 rounded-[8px] p-3 text-slate-700 flex items-center justify-between">
                          <span className="font-medium text-slate-650 truncate max-w-[200px]" title={selectedL2Details.weldTest || '-'}>
                            {selectedL2Details.weldTest || '-'}
                          </span>
                          {selectedL2Details.weldTest && selectedL2Details.weldTest !== '-' && (
                            <span 
                              className="text-[11px] font-semibold text-[#0066cc] hover:underline cursor-pointer"
                              onClick={() => handleViewAttachment(selectedL2Details.weldTest, selectedL2Details.changeNo, 'L2')}
                            >
                              Preview
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-[6px]">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">QA Setup Verification Attachment</span>
                        <div className="bg-slate-50 border border-slate-200 rounded-[8px] p-3 text-slate-700 flex items-center justify-between">
                          <span className="font-medium text-slate-650 truncate max-w-[200px]" title={selectedL2Details.qaTest || '-'}>
                            {selectedL2Details.qaTest || '-'}
                          </span>
                          {selectedL2Details.qaTest && selectedL2Details.qaTest !== '-' && (
                            <span 
                              className="text-[11px] font-semibold text-[#0066cc] hover:underline cursor-pointer"
                              onClick={() => handleViewAttachment(selectedL2Details.qaTest, selectedL2Details.changeNo, 'L2')}
                            >
                              Preview
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-[4px] mt-4">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Validator Remarks / Comments</span>
                      <div className="bg-slate-50 border border-slate-200 rounded-[8px] p-[16px] text-slate-700 leading-relaxed min-h-[80px] max-h-[150px] overflow-y-auto break-words">
                        {selectedL2Details.remarks || 'No remarks provided.'}
                      </div>
                    </div>
                    </>
                    )}
                  </div>
                )
              )}

              {activeTab === 'l3' && selectedLog && (
                <div className="space-y-[24px]">
                  {isEditMode ? renderDynamicEditForm(editL3Data, setEditL3Data, 'l3') : (
                    <>
                  <h5 className="text-[12px] font-bold text-[#0066cc] uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                    <Cpu size={14} />
                    <span>L3 Approval Status Matrix</span>
                  </h5>

                  {/* Metadata */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-[16px] pb-[16px] border-b border-slate-100">
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
                      <span className="font-medium text-slate-700">{selectedLog.date ? formatDateToDDMMYYYY(selectedLog.date) : '-'}</span>
                    </div>
                  </div>

                  {/* Matrix Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-[12px]">
                    {[
                      { label: 'PED', value: selectedLog.ped },
                      { label: 'Quality', value: selectedLog.quality },
                      { label: 'Production', value: selectedLog.production },
                      { label: 'Maintenance', value: selectedLog.maintenance },
                      { label: 'PC & L', value: selectedLog.pcl },
                      { label: 'Materials', value: selectedLog.materials },
                      { label: 'Marketing', value: selectedLog.marketing },
                      { label: 'HR', value: selectedLog.hr },
                      { label: 'Safety', value: selectedLog.safety },
                      { label: 'Unit Head', value: selectedLog.unitHead }
                    ].map((dept, index) => {
                      // Map label to the corresponding property in selectedLog safely
                      const propMap = {
                        'PED': selectedLog.ped,
                        'Quality': selectedLog.quality,
                        'Production': selectedLog.production,
                        'Maintenance': selectedLog.maintenance,
                        'PC & L': selectedLog.pcl || selectedLog.ped,
                        'Materials': selectedLog.materials,
                        'Marketing': selectedLog.marketing,
                        'HR': selectedLog.hr,
                        'Safety': selectedLog.safety,
                        'Unit Head': selectedLog.unitHead || selectedLog.unit_head
                      };
                      const status = propMap[dept.label] || 'Pending';
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
                            L3 {status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                    </>
                  )}
                </div>
              )}
              </>
            )}
            </div>

            {/* Footer */}
            <div className="px-[24px] py-[16px] bg-slate-50 border-t border-slate-200 flex justify-end gap-[12px]">
              <button 
                onClick={handleExportRequestDetailsPDF}
                disabled={isFetchingDetails}
                className="px-[16px] py-[8px] bg-[#0066cc] hover:bg-[#0052a3] text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-[6px] text-[12px] font-semibold transition-colors shadow-sm cursor-pointer flex items-center gap-[6px]"
                title="Export this request's full details (L1, L2, L3) as PDF"
              >
                <Download size={14} />
                <span>Export PDF</span>
              </button>
              <button 
                onClick={() => setSelectedLog(null)}
                className="px-[16px] py-[8px] bg-white border border-slate-250 rounded-[6px] text-slate-650 hover:bg-slate-50 hover:text-slate-800 text-[12px] font-semibold transition-colors shadow-sm cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Attachment Preview Modal */}
      {previewFile && (
        <div 
          className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={handleClosePreview}
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
                onClick={handleClosePreview} 
                className="text-slate-400 hover:text-slate-655 p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer"
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
                          This attachment supports the change request details. The document or image content was uploaded during the Level 1/Level 2 submission phase.
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
                      {`=== Attachment Plaintext Evidence ===\n\n[INFO] - Supporting document for Change No: ${selectedLog?.changeNo}\n[SUCCESS] - Document content loaded successfully.\n\n==========================================`}
                    </pre>
                  </div>
                )
              )}
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-[8px]">
              {fileUrls[previewFile] && (
                <a
                  href={fileUrls[previewFile]}
                  download={previewFile}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-[6px]"
                  title="Download attachment locally"
                >
                  <Download size={12} />
                  <span>Download File</span>
                </a>
              )}
              <button
                onClick={handleClosePreview}
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
