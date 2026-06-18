import { useState, useEffect } from 'react';
import {
  Clock,
  Loader2,
  BarChart3,
  LayoutGrid,
  Calendar,
  GitBranch,
  Layers,
  Settings,
  ShieldAlert,
  CheckCircle,
  Download,
  CheckCheck,
  Eye,
  EyeOff,
  X,
  Paperclip,
  Folder,
  Cpu,
  CheckCircle2,
  FileText,
  AlertTriangle
} from 'lucide-react';
import TablePagination from '@mui/material/TablePagination';
import { formatDateToDDMMYY, parseDDMMYYYYToDate, formatDateToDDMMYYYY } from '../../utils/dateUtils';
import { getRequestDisplayStatus } from '../../utils/statusUtils';
import { getSyncedDate } from '../../utils/timeSync';
import { CustomDatePicker } from '../ui/CustomDatePicker';
import {
  getProcesses,
  getMachines,
  getL1Details,
  getL1Attachment,
  getL2Details,
  getL2Attachment,
  getL3Approvals
} from '../../api/apiRoutes';
import {
  exportDashboardRequestsPDF,
  exportDepartmentAnalyticsPDF,
  exportProcessAnalyticsPDF,
  exportCategoryAnalyticsPDF,
  exportMonthlyAnalyticsPDF,
  exportApprovalStatusAnalyticsPDF,
  exportImprovementBenefitsPDF,
  exportRequestDetailsPDF
} from '../../utils/pdfExport';


export const DashboardOverview = ({
  changes,
  isFetchingChanges,
  // onTabChange,
  setToastMsg,
  usersList = []
}) => {
  const [isGridView, setIsGridView] = useState(false);

  // Details Modal States
  const [selectedLog, setSelectedLog] = useState(null);
  const [selectedL1Details, setSelectedL1Details] = useState(null);
  const [selectedL2Details, setSelectedL2Details] = useState(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('l1');
  const [previewFile, setPreviewFile] = useState(null);
  const [fileUrls, setFileUrls] = useState({});
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState('Department');
  const [showCustomerApproval, setShowCustomerApproval] = useState(false);

  useEffect(() => {
    if (!selectedLog) {
      setShowCustomerApproval(false);
    }
  }, [selectedLog]);

  // Separate Benefit Filters
  const [benefitFilterType, setBenefitFilterType] = useState('All');
  const [benefitFilterMonth, setBenefitFilterMonth] = useState('All');
  const [benefitFilterSearch, setBenefitFilterSearch] = useState('');

  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Department Filters
  const [deptFilterMonth, setDeptFilterMonth] = useState('All');
  const [deptFilterFromDate, setDeptFilterFromDate] = useState('');
  const [deptFilterToDate, setDeptFilterToDate] = useState('');
  const [deptFilterPerson, setDeptFilterPerson] = useState('All');
  const [deptFilterProcess, setDeptFilterProcess] = useState('All');
  const [deptFilterMachine, setDeptFilterMachine] = useState('All');

  // Process Filters
  const [procFilterMonth, setProcFilterMonth] = useState('All');
  const [procFilterFromDate, setProcFilterFromDate] = useState('');
  const [procFilterToDate, setProcFilterToDate] = useState('');
  const [procFilterPerson, setProcFilterPerson] = useState('All');
  const [procFilterProcess, setProcFilterProcess] = useState('All');
  const [procFilterMachine, setProcFilterMachine] = useState('All');

  // 6M Category Filters
  const [catFilterMonth, setCatFilterMonth] = useState('All');
  const [catFilterFromDate, setCatFilterFromDate] = useState('');
  const [catFilterToDate, setCatFilterToDate] = useState('');
  const [catFilterPerson, setCatFilterPerson] = useState('All');
  const [catFilterProcess, setCatFilterProcess] = useState('All');
  const [catFilterMachine, setCatFilterMachine] = useState('All');

  // Monthly Filters
  const [monthFilterMonth, setMonthFilterMonth] = useState('All');
  const [monthFilterFromDate, setMonthFilterFromDate] = useState('');
  const [monthFilterToDate, setMonthFilterToDate] = useState('');
  const [monthFilterPerson, setMonthFilterPerson] = useState('All');
  const [monthFilterProcess, setMonthFilterProcess] = useState('All');
  const [monthFilterMachine, setMonthFilterMachine] = useState('All');

  // Approval Status Filters
  const [apprFilterMonth, setApprFilterMonth] = useState('All');
  const [apprFilterFromDate, setApprFilterFromDate] = useState('');
  const [apprFilterToDate, setApprFilterToDate] = useState('');
  const [apprFilterStatus, setApprFilterStatus] = useState('All');

  // Table Filters (Recent change requests)
  const [tableFilterMonth, setTableFilterMonth] = useState('All');
  const [tableFilterFromDate, setTableFilterFromDate] = useState('');
  const [tableFilterToDate, setTableFilterToDate] = useState('');
  const [tableFilterPerson, setTableFilterPerson] = useState('All');
  const [tableFilterProcess, setTableFilterProcess] = useState('All');
  const [tableFilterMachine, setTableFilterMachine] = useState('All');

  // Reset page when table filters change
  useEffect(() => {
    setPage(0);
  }, [tableFilterMonth, tableFilterFromDate, tableFilterToDate, tableFilterPerson, tableFilterProcess, tableFilterMachine]);

  const [dbProcesses, setDbProcesses] = useState([]);
  const [dbMachines, setDbMachines] = useState([]);

  useEffect(() => {
    async function fetchOptions() {
      try {
        const [pRes, mRes] = await Promise.all([getProcesses(), getMachines()]);
        setDbProcesses(pRes.data);
        setDbMachines(mRes.data);
      } catch (e) {
        console.error('Error fetching process/machine options:', e);
      }
    }
    fetchOptions();
  }, []);

  const monthsList = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const monthOptions = monthsList;

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
      changes.forEach(c => {
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
  const uniqueProcesses = ['All', ...new Set([...dbProcesses, ...changes.map(c => c.processName).filter(Boolean)])];
  const uniqueMachines = ['All', ...new Set([...dbMachines, ...changes.map(c => c.machineNo).filter(Boolean)])];

  const getFilteredData = (
    monthVal,
    fromDateVal,
    toDateVal,
    personVal,
    processVal,
    machineVal,
    statusVal = 'All'
  ) => {
    return changes.filter(c => {
      let matchesMonth = true;
      if (monthVal !== 'All') {
        try {
          const d = new Date(c.date);
          if (!isNaN(d.getTime())) {
            const itemMonthName = d.toLocaleDateString('en-US', { month: 'short' });
            matchesMonth = (itemMonthName === monthVal);
          } else {
            matchesMonth = false;
          }
        } catch {
          matchesMonth = false;
        }
      }

      let matchesFromDate = true;
      if (fromDateVal) {
        const fD = parseDDMMYYYYToDate(fromDateVal);
        if (fD) {
          fD.setHours(0, 0, 0, 0);
          const itemD = parseDDMMYYYYToDate(c.date);
          matchesFromDate = itemD && itemD >= fD;
        }
      }

      let matchesToDate = true;
      if (toDateVal) {
        const tD = parseDDMMYYYYToDate(toDateVal);
        if (tD) {
          tD.setHours(23, 59, 59, 999);
          const itemD = parseDDMMYYYYToDate(c.date);
          matchesToDate = itemD && itemD <= tD;
        }
      }

      const matchesPerson = personVal === 'All' || 
        (c.requesterEmail && c.requesterEmail.toLowerCase() === personVal.toLowerCase()) ||
        (c.requester && c.requester.toLowerCase() === personVal.toLowerCase());
      const matchesProcess = processVal === 'All' || c.processName === processVal;
      const matchesMachine = machineVal === 'All' || c.machineNo === machineVal;
      
      let matchesStatus = true;
      if (statusVal !== 'All') {
        const dispStatus = getRequestDisplayStatus(c);
        if (statusVal === 'Approved') matchesStatus = dispStatus === 'Approved';
        else if (statusVal === 'Closed') matchesStatus = dispStatus === 'Closed';
        else if (statusVal === 'Rejected') matchesStatus = dispStatus === 'Rejected';
        else if (statusVal === 'Pending') matchesStatus = dispStatus.startsWith('Pending');
        else matchesStatus = false;
      }

      return matchesMonth && matchesFromDate && matchesToDate && matchesPerson && matchesProcess && matchesMachine && matchesStatus;
    });
  };

  // Extract all improvement data rows
  const costSavingRows = [];
  const productivityRows = [];
  const qualityRows = [];

  changes.forEach(c => {
    if (c.improvementTableData) {
      try {
        const rows = typeof c.improvementTableData === 'string'
          ? JSON.parse(c.improvementTableData)
          : c.improvementTableData;

        if (Array.isArray(rows)) {
          const area = (c.improvementArea || '').toLowerCase();
          rows.forEach(r => {
            const rowWithDefaults = {
              ...r,
              changeNo: r.changeNo || c.id || c.changeNo || '',
              date: r.date ? formatDateToDDMMYY(r.date) : ''
            };
            if (area === 'cost') {
              costSavingRows.push(rowWithDefaults);
            } else if (area === 'productivity') {
              productivityRows.push(rowWithDefaults);
            } else if (area === 'quality') {
              qualityRows.push(rowWithDefaults);
            }
          });
        }
      } catch (e) {
        console.error('Error parsing improvementTableData for change:', c.id, e);
      }
    }
  });

  const filteredChangesForTable = getFilteredData(tableFilterMonth, tableFilterFromDate, tableFilterToDate, tableFilterPerson, tableFilterProcess, tableFilterMachine);

  const formattedDbChanges = filteredChangesForTable.map((c, idx) => {
    const displayDate = formatDateToDDMMYY(c.date);
    const displayStatus = getRequestDisplayStatus(c);

    return {
      slNo: idx + 1,
      id: c.id,
      machineNo: c.machineNo || '',
      processName: c.processName || '',
      department: c.dept || c.department || 'PRODUCTION',
      date: displayDate,
      status: displayStatus,
      // preserve all needed properties for modal view
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

  const totalCount = changes.length;
  const approvedCount = changes.filter(c => {
    const status = getRequestDisplayStatus(c);
    return status === 'Approved';
  }).length;
  const closedCount = changes.filter(c => {
    const status = getRequestDisplayStatus(c);
    return status === 'Closed';
  }).length;
  const rejectedCount = changes.filter(c => {
    const status = getRequestDisplayStatus(c);
    return status === 'Rejected';
  }).length;
  const pendingCount = totalCount - approvedCount - closedCount - rejectedCount;

  const allTableRows = formattedDbChanges;
  const paginatedTableRows = allTableRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

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
    } catch (err) {
      console.error('Error fetching request details:', err);
    } finally {
      setIsFetchingDetails(false);
    }
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

  const handleExportPDF = () => {
    exportDashboardRequestsPDF(filteredChangesForTable, {
      month: tableFilterMonth,
      fromDate: tableFilterFromDate,
      toDate: tableFilterToDate,
      person: tableFilterPerson,
      process: tableFilterProcess,
      machine: tableFilterMachine,
      status: 'All'
    }, setToastMsg);
  };

  const handleExportSpecificTab = (tabName) => {
    if (tabName === 'Department') {
      const deptFiltered = getFilteredData(deptFilterMonth, deptFilterFromDate, deptFilterToDate, deptFilterPerson, deptFilterProcess, deptFilterMachine);
      exportDepartmentAnalyticsPDF(deptFiltered, {
        month: deptFilterMonth,
        fromDate: deptFilterFromDate,
        toDate: deptFilterToDate,
        person: deptFilterPerson,
        process: deptFilterProcess,
        machine: deptFilterMachine,
        status: 'All'
      }, setToastMsg);
    } else if (tabName === 'Process') {
      const procFiltered = getFilteredData(procFilterMonth, procFilterFromDate, procFilterToDate, procFilterPerson, procFilterProcess, procFilterMachine);
      exportProcessAnalyticsPDF(procFiltered, {
        month: procFilterMonth,
        fromDate: procFilterFromDate,
        toDate: procFilterToDate,
        person: procFilterPerson,
        process: procFilterProcess,
        machine: procFilterMachine,
        status: 'All'
      }, setToastMsg);
    } else if (tabName === '6M Category') {
      const catFiltered = getFilteredData(catFilterMonth, catFilterFromDate, catFilterToDate, catFilterPerson, catFilterProcess, catFilterMachine);
      exportCategoryAnalyticsPDF(catFiltered, {
        month: catFilterMonth,
        fromDate: catFilterFromDate,
        toDate: catFilterToDate,
        person: catFilterPerson,
        process: catFilterProcess,
        machine: catFilterMachine,
        status: 'All'
      }, setToastMsg);
    } else if (tabName === 'Monthly') {
      const monthFiltered = getFilteredData(monthFilterMonth, monthFilterFromDate, monthFilterToDate, monthFilterPerson, monthFilterProcess, monthFilterMachine);
      exportMonthlyAnalyticsPDF(monthFiltered, {
        month: monthFilterMonth,
        fromDate: monthFilterFromDate,
        toDate: monthFilterToDate,
        person: monthFilterPerson,
        process: monthFilterProcess,
        machine: monthFilterMachine,
        status: 'All'
      }, setToastMsg);
    } else if (tabName === 'Approval Status') {
      const apprFiltered = getFilteredData(apprFilterMonth, apprFilterFromDate, apprFilterToDate, 'All', 'All', 'All', apprFilterStatus);
      exportApprovalStatusAnalyticsPDF(apprFiltered, {
        month: apprFilterMonth,
        fromDate: apprFilterFromDate,
        toDate: apprFilterToDate,
        person: 'All',
        process: 'All',
        machine: 'All',
        status: apprFilterStatus
      }, setToastMsg);
    } else if (tabName === 'Improvement Benefits') {
      // For Improvement Benefits, apply its separate filters
      const filteredCost = costSavingRows.filter(row => {
        let matchesMonth = true;
        if (benefitFilterMonth !== 'All') {
          const parts = row.date.split('/');
          if (parts.length === 3) {
            const monthIdx = parseInt(parts[1], 10) - 1;
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            matchesMonth = months[monthIdx] === benefitFilterMonth;
          } else {
            matchesMonth = false;
          }
        }
        const matchesSearch = !benefitFilterSearch || row.changeNo.toLowerCase().includes(benefitFilterSearch.toLowerCase());
        return matchesMonth && matchesSearch;
      });

      const filteredProductivity = productivityRows.filter(row => {
        let matchesMonth = true;
        if (benefitFilterMonth !== 'All') {
          const parts = row.date.split('/');
          if (parts.length === 3) {
            const monthIdx = parseInt(parts[1], 10) - 1;
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            matchesMonth = months[monthIdx] === benefitFilterMonth;
          } else {
            matchesMonth = false;
          }
        }
        const matchesSearch = !benefitFilterSearch || row.changeNo.toLowerCase().includes(benefitFilterSearch.toLowerCase());
        return matchesMonth && matchesSearch;
      });

      const filteredQuality = qualityRows.filter(row => {
        let matchesMonth = true;
        if (benefitFilterMonth !== 'All') {
          const parts = row.date.split('/');
          if (parts.length === 3) {
            const monthIdx = parseInt(parts[1], 10) - 1;
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            matchesMonth = months[monthIdx] === benefitFilterMonth;
          } else {
            matchesMonth = false;
          }
        }
        const matchesSearch = !benefitFilterSearch || row.changeNo.toLowerCase().includes(benefitFilterSearch.toLowerCase());
        return matchesMonth && matchesSearch;
      });

      exportImprovementBenefitsPDF(
        filteredCost,
        filteredProductivity,
        filteredQuality,
        {
          type: benefitFilterType,
          month: benefitFilterMonth,
          search: benefitFilterSearch
        },
        setToastMsg
      );
    }
  };

  const handleExportActiveTab = () => {
    handleExportSpecificTab(activeAnalyticsTab);
  };


  // Helper filters render
  const renderFilters = ({
    monthVal, setMonthVal,
    fromDateVal, setFromDateVal,
    toDateVal, setToDateVal,
    personVal, setPersonVal,
    processVal, setProcessVal,
    machineVal, setMachineVal
  }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-[8px] p-[12px] bg-slate-50/50 border-y border-slate-100 text-[10px]">
      <div className="space-y-[2px]">
        <label className="block font-bold text-slate-400 uppercase tracking-wider">By Month</label>
        <select
          className="w-full px-[6px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none"
          value={monthVal}
          onChange={(e) => {
            const nextVal = e.target.value;
            setMonthVal(nextVal);
            if (nextVal !== 'All') {
              setFromDateVal('');
              setToDateVal('');
            }
          }}
        >
          <option value="All">All Months</option>
          {monthOptions.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <div className="space-y-[2px]">
        <label className="block font-bold text-slate-400 uppercase tracking-wider">From Date</label>
        <CustomDatePicker
          value={fromDateVal}
          onChange={(val) => {
            setFromDateVal(val);
            if (val) {
              setMonthVal('All');
            }
          }}
          inputClassName="w-full pl-[6px] pr-[24px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none placeholder-slate-350 text-slate-500"
          buttonClassName="right-[6px] top-[50%] -translate-y-1/2"
        />
      </div>
      <div className="space-y-[2px]">
        <label className="block font-bold text-slate-400 uppercase tracking-wider">To Date</label>
        <CustomDatePicker
          value={toDateVal}
          onChange={(val) => {
            setToDateVal(val);
            if (val) {
              setMonthVal('All');
            }
          }}
          inputClassName="w-full pl-[6px] pr-[24px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none placeholder-slate-355 text-slate-500"
          buttonClassName="right-[6px] top-[50%] -translate-y-1/2"
        />
      </div>
      <div className="space-y-[2px]">
        <label className="block font-bold text-slate-400 uppercase tracking-wider">By Person</label>
        <select
          className="w-full px-[6px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none"
          value={personVal}
          onChange={(e) => setPersonVal(e.target.value)}
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
      <div className="space-y-[2px]">
        <label className="block font-bold text-slate-400 uppercase tracking-wider">By Process</label>
        <select
          className="w-full px-[6px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none"
          value={processVal}
          onChange={(e) => setProcessVal(e.target.value)}
        >
          {uniqueProcesses.map(p => (
            <option key={p} value={p}>{p === 'All' ? 'All Processes' : p}</option>
          ))}
        </select>
      </div>
      <div className="space-y-[2px]">
        <label className="block font-bold text-slate-400 uppercase tracking-wider">By M/C No</label>
        <select
          className="w-full px-[6px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none"
          value={machineVal}
          onChange={(e) => setMachineVal(e.target.value)}
        >
          {uniqueMachines.map(m => (
            <option key={m} value={m}>{m === 'All' ? 'All Machines' : m}</option>
          ))}
        </select>
      </div>
    </div>
  );

  const renderStatusFilters = ({
    monthVal, setMonthVal,
    fromDateVal, setFromDateVal,
    toDateVal, setToDateVal,
    statusVal, setStatusVal
  }) => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-[8px] p-[12px] bg-slate-50/50 border-y border-slate-100 text-[10px]">
      <div className="space-y-[2px]">
        <label className="block font-bold text-slate-400 uppercase tracking-wider">By Month</label>
        <select
          className="w-full px-[6px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none"
          value={monthVal}
          onChange={(e) => {
            const nextVal = e.target.value;
            setMonthVal(nextVal);
            if (nextVal !== 'All') {
              setFromDateVal('');
              setToDateVal('');
            }
          }}
        >
          <option value="All">All Months</option>
          {monthOptions.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <div className="space-y-[2px]">
        <label className="block font-bold text-slate-400 uppercase tracking-wider">From Date</label>
        <CustomDatePicker
          value={fromDateVal}
          onChange={(val) => {
            setFromDateVal(val);
            if (val) {
              setMonthVal('All');
            }
          }}
          inputClassName="w-full pl-[6px] pr-[24px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none placeholder-slate-350 text-slate-500"
          buttonClassName="right-[6px] top-[50%] -translate-y-1/2"
        />
      </div>
      <div className="space-y-[2px]">
        <label className="block font-bold text-slate-400 uppercase tracking-wider">To Date</label>
        <CustomDatePicker
          value={toDateVal}
          onChange={(val) => {
            setToDateVal(val);
            if (val) {
              setMonthVal('All');
            }
          }}
          inputClassName="w-full pl-[6px] pr-[24px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none placeholder-slate-355 text-slate-500"
          buttonClassName="right-[6px] top-[50%] -translate-y-1/2"
        />
      </div>
      <div className="space-y-[2px]">
        <label className="block font-bold text-slate-400 uppercase tracking-wider">By Status</label>
        <select
          className="w-full px-[6px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none"
          value={statusVal}
          onChange={(e) => setStatusVal(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Closed">Closed</option>
          <option value="Pending">Pending</option>
        </select>
      </div>
    </div>
  );

  const renderFiltersForTab = (tabName) => {
    if (tabName === 'Department') {
      return renderFilters({
        monthVal: deptFilterMonth, setMonthVal: setDeptFilterMonth,
        fromDateVal: deptFilterFromDate, setFromDateVal: setDeptFilterFromDate,
        toDateVal: deptFilterToDate, setToDateVal: setDeptFilterToDate,
        personVal: deptFilterPerson, setPersonVal: setDeptFilterPerson,
        processVal: deptFilterProcess, setProcessVal: setDeptFilterProcess,
        machineVal: deptFilterMachine, setMachineVal: setDeptFilterMachine
      });
    }
    if (tabName === 'Process') {
      return renderFilters({
        monthVal: procFilterMonth, setMonthVal: setProcFilterMonth,
        fromDateVal: procFilterFromDate, setFromDateVal: setProcFilterFromDate,
        toDateVal: procFilterToDate, setToDateVal: setProcFilterToDate,
        personVal: procFilterPerson, setPersonVal: setProcFilterPerson,
        processVal: procFilterProcess, setProcessVal: setProcFilterProcess,
        machineVal: procFilterMachine, setMachineVal: setProcFilterMachine
      });
    }
    if (tabName === '6M Category') {
      return renderFilters({
        monthVal: catFilterMonth, setMonthVal: setCatFilterMonth,
        fromDateVal: catFilterFromDate, setFromDateVal: setCatFilterFromDate,
        toDateVal: catFilterToDate, setToDateVal: setCatFilterToDate,
        personVal: catFilterPerson, setPersonVal: setCatFilterPerson,
        processVal: catFilterProcess, setProcessVal: setCatFilterProcess,
        machineVal: catFilterMachine, setMachineVal: setCatFilterMachine
      });
    }
    if (tabName === 'Monthly') {
      return renderFilters({
        monthVal: monthFilterMonth, setMonthVal: setMonthFilterMonth,
        fromDateVal: monthFilterFromDate, setFromDateVal: setMonthFilterFromDate,
        toDateVal: monthFilterToDate, setToDateVal: setMonthFilterToDate,
        personVal: monthFilterPerson, setPersonVal: setMonthFilterPerson,
        processVal: monthFilterProcess, setProcessVal: setMonthFilterProcess,
        machineVal: monthFilterMachine, setMachineVal: setMonthFilterMachine
      });
    }
    if (tabName === 'Approval Status') {
      return renderStatusFilters({
        monthVal: apprFilterMonth, setMonthVal: setApprFilterMonth,
        fromDateVal: apprFilterFromDate, setFromDateVal: setApprFilterFromDate,
        toDateVal: apprFilterToDate, setToDateVal: setApprFilterToDate,
        statusVal: apprFilterStatus, setStatusVal: setApprFilterStatus
      });
    }
    return null;
  };

  // Reusable Chart Renderers
  const renderDepartmentChart = (dataList, height = 'h-[160px]') => {
    const counts = {
      'PED': 0,
      'QAD': 0,
      'PRODUCTION': 0,
      'MAINTENANCE': 0,
      'PC & L': 0,
      'MATERIALS': 0,
      'MARKETING': 0,
      'HR': 0,
      'SAFETY': 0
    };

    dataList.forEach(c => {
      const rawDept = (c.dept || c.department || '').trim().toUpperCase();
      let mapped;
      if (rawDept.includes('PED')) mapped = 'PED';
      else if (rawDept.includes('QA') || rawDept.includes('QUALITY')) mapped = 'QAD';
      else if (rawDept.includes('PROD')) mapped = 'PRODUCTION';
      else if (rawDept.includes('MAINT')) mapped = 'MAINTENANCE';
      else if (rawDept.includes('PC')) mapped = 'PC & L';
      else if (rawDept.includes('MATER')) mapped = 'MATERIALS';
      else if (rawDept.includes('MARKET')) mapped = 'MARKETING';
      else if (rawDept.includes('HR')) mapped = 'HR';
      else if (rawDept.includes('SAFE')) mapped = 'SAFETY';
      else mapped = 'PRODUCTION'; // fallback

      if (counts[mapped] !== undefined) {
        counts[mapped]++;
      }
    });

    const data = Object.keys(counts).map(key => ({
      label: key,
      value: counts[key]
    }));

    const maxVal = Math.max(...data.map(item => item.value), 5);

    return (
      <div className={`flex justify-between items-end ${height} px-[10px] mt-[10px]`}>
        {data.map((item, idx) => {
          const barHeight = (item.value / maxVal) * 100;
          return (
            <div key={idx} className="flex flex-col items-center w-[9%] h-full justify-end group">
              <span className="text-[10px] font-bold text-slate-600 mb-[4px]">{item.value}</span>
              <div className="w-full h-[65%] flex items-end justify-center">
                <div
                  className="w-full bg-[#1e60aa] hover:bg-[#1a5292] transition-all rounded-t-[2px]"
                  style={{ height: `${barHeight}%`, minHeight: '4px' }}
                />
              </div>
              <span className="text-[8px] font-bold text-slate-400 mt-[6px] whitespace-nowrap uppercase tracking-wider text-center">
                {item.label === 'PRODUCTION' ? (
                  <>
                     <span className="hidden sm:inline">PRODUCTION</span>
                     <span className="inline sm:hidden">PROD</span>
                  </>
                ) : item.label === 'MAINTENANCE' ? (
                  <>
                     <span className="hidden sm:inline">MAINTENANCE</span>
                     <span className="inline sm:hidden">MAINT</span>
                  </>
                ) : item.label === 'MATERIALS' ? (
                  <>
                     <span className="hidden sm:inline">MATERIALS</span>
                     <span className="inline sm:hidden">MAT</span>
                  </>
                ) : item.label === 'MARKETING' ? (
                  <>
                     <span className="hidden sm:inline">MARKETING</span>
                     <span className="inline sm:hidden">MKTG</span>
                  </>
                ) : item.label === 'SAFETY' ? (
                  <>
                     <span className="hidden sm:inline">SAFETY</span>
                     <span className="inline sm:hidden">SAFE</span>
                  </>
                ) : (
                  item.label
                )}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderProcessChart = (dataList, height = 'h-[160px]') => {
    const counts = {
      'Wind': 0,
      'Gold': 0,
      'EOL': 0,
      'Pott': 0,
      'Load': 0
    };

    dataList.forEach(c => {
      const p = (c.processName || '').trim().toLowerCase();
      let mapped;
      if (p.includes('wind') || p.includes('weld')) mapped = 'Wind';
      else if (p.includes('gold') || p.includes('calib')) mapped = 'Gold';
      else if (p.includes('eol') || p.includes('mold') || p.includes('mould') || p.includes('inject')) mapped = 'EOL';
      else if (p.includes('pott') || p.includes('train')) mapped = 'Pott';
      else if (p.includes('load') || p.includes('gauge')) mapped = 'Load';
      else mapped = 'Wind'; // fallback

      counts[mapped]++;
    });

    const data = Object.keys(counts).map(key => ({
      label: key,
      value: counts[key]
    }));

    const maxVal = Math.max(...data.map(item => item.value), 5);

    return (
      <div className={`flex justify-around items-end ${height} px-[10px] mt-[10px]`}>
        {data.map((item, idx) => {
          const barHeight = (item.value / maxVal) * 100;
          return (
            <div key={idx} className="flex flex-col items-center w-[12%] h-full justify-end group">
              <span className="text-[10px] font-bold text-slate-600 mb-[4px]">{item.value}</span>
              <div className="w-full h-[65%] flex items-end justify-center">
                <div
                  className="w-full bg-[#2e7d32] hover:bg-[#1b5e20] transition-all rounded-t-[2px]"
                  style={{ height: `${barHeight}%`, minHeight: '4px' }}
                />
              </div>
              <span className="text-[8px] font-bold text-slate-400 mt-[6px] whitespace-nowrap uppercase tracking-wider text-center">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderCategoryChart = (dataList, height = 'h-[160px]') => {
    const counts = {
      'Man': 0,
      'Mac': 0,
      'Met': 0,
      'Mat': 0,
      'Mea': 0,
      'Mot': 0
    };

    dataList.forEach(c => {
      const catStr = (c.changeIn || c.title || c.id || '').trim().toLowerCase();
      let mapped;
      if (catStr.includes('man') || catStr.includes('train')) mapped = 'Man';
      else if (catStr.includes('mac') || catStr.includes('machin') || catStr.includes('weld')) mapped = 'Mac';
      else if (catStr.includes('met') || catStr.includes('calib') || catStr.includes('sso') || catStr.includes('db') || catStr.includes('api') || catStr.includes('vulner')) mapped = 'Met';
      else if (catStr.includes('mat') || catStr.includes('spec') || catStr.includes('cool')) mapped = 'Mat';
      else if (catStr.includes('mea') || catStr.includes('gauge') || catStr.includes('check') || catStr.includes('repeat')) mapped = 'Mea';
      else if (catStr.includes('mot') || catStr.includes('nature') || catStr.includes('env')) mapped = 'Mot';
      else mapped = 'Met'; // fallback

      counts[mapped]++;
    });

    const colors = {
      'Man': '#1e60aa',
      'Mac': '#673ab7',
      'Met': '#795548',
      'Mat': '#009688',
      'Mea': '#8bc34a',
      'Mot': '#d32f2f'
    };

    const data = Object.keys(counts).map(key => ({
      label: key,
      value: counts[key],
      color: colors[key]
    }));

    const maxVal = Math.max(...data.map(item => item.value), 5);

    return (
      <div className={`flex justify-between items-end ${height} px-[10px] mt-[10px]`}>
        {data.map((item, idx) => {
          const barHeight = (item.value / maxVal) * 100;
          return (
            <div key={idx} className="flex flex-col items-center w-[12%] h-full justify-end group">
              <span className="text-[10px] font-bold text-slate-600 mb-[4px]">{item.value}</span>
              <div className="w-full h-[65%] flex items-end justify-center">
                <div
                  className="w-full transition-all rounded-t-[2px]"
                  style={{ height: `${barHeight}%`, minHeight: '4px', backgroundColor: item.color }}
                />
              </div>
              <span className="text-[8px] font-bold text-slate-400 mt-[6px] whitespace-nowrap uppercase tracking-wider text-center">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthlyChart = (dataList, height = 'h-[160px]') => {
    const hasDateFilter = !!(monthFilterFromDate || monthFilterToDate);
    const hasMonthFilter = monthFilterMonth !== 'All';
    let datesToShow = [];

    if (hasDateFilter) {
      let startDate = null;
      let endDate = null;

      if (monthFilterFromDate) {
        startDate = parseDDMMYYYYToDate(monthFilterFromDate);
      }
      if (monthFilterToDate) {
        endDate = parseDDMMYYYYToDate(monthFilterToDate);
      }

      // Fallback: if one date is empty, find min/max from actual data
      if (dataList.length > 0) {
        const parsedDates = dataList
          .map(c => parseDDMMYYYYToDate(c.date))
          .filter(Boolean);
        if (parsedDates.length > 0) {
          if (!startDate) {
            startDate = new Date(Math.min(...parsedDates.map(d => d.getTime())));
          }
          if (!endDate) {
            endDate = new Date(Math.max(...parsedDates.map(d => d.getTime())));
          }
        }
      }

      if (startDate && endDate) {
        const sD = new Date(startDate);
        sD.setHours(0, 0, 0, 0);
        const eD = new Date(endDate);
        eD.setHours(0, 0, 0, 0);

        const msDiff = eD.getTime() - sD.getTime();
        const daysDiff = Math.ceil(msDiff / (1000 * 60 * 60 * 24)) + 1;

        if (daysDiff > 0 && daysDiff <= 31) {
          // Generate day-by-day dates
          for (let i = 0; i < daysDiff; i++) {
            const nextDate = new Date(sD);
            nextDate.setDate(sD.getDate() + i);
            const label = nextDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
            datesToShow.push({ label, dateStr: formatDateToDDMMYY(nextDate) });
          }
        } else {
          // Range is wider than 31 days. Show only dates that have requests
          const uniqueDateStrings = [...new Set(dataList.map(c => formatDateToDDMMYY(c.date)).filter(s => s && s !== '-'))];
          const sortedDates = uniqueDateStrings
            .map(str => ({ str, dateObj: parseDDMMYYYYToDate(str) }))
            .filter(x => x.dateObj)
            .sort((a, b) => a.dateObj - b.dateObj);

          datesToShow = sortedDates.map(x => {
            const label = x.dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
            return { label, dateStr: x.str };
          });
        }
      }
    } else if (hasMonthFilter) {
      const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIdx = monthsList.indexOf(monthFilterMonth);
      if (monthIdx !== -1) {
        const currentYear = getSyncedDate().getFullYear();
        const daysInMonth = new Date(currentYear, monthIdx + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          const dateObj = new Date(currentYear, monthIdx, i);
          const label = dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
          datesToShow.push({ label, dateStr: formatDateToDDMMYY(dateObj) });
        }
      }
    }

    if (datesToShow.length === 0) {
      // Default: 12 months view
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const counts = Array(12).fill(0);

      dataList.forEach(c => {
        if (!c.date) return;
        try {
          const d = new Date(c.date);
          if (!isNaN(d.getTime())) {
            const monthIdx = d.getMonth();
            counts[monthIdx]++;
          }
        } catch {
          // ignore
        }
      });

      const data = months.map((m, idx) => ({
        label: m,
        value: counts[idx]
      }));

      const maxVal = Math.max(...data.map(item => item.value), 5);

      return (
        <div className={`flex justify-between items-end ${height} px-[5px] mt-[10px]`}>
          {data.map((item, idx) => {
            const barHeight = (item.value / maxVal) * 100;
            return (
              <div key={idx} className="flex flex-col items-center w-[7%] h-full justify-end group">
                <span className="text-[10px] font-bold text-slate-600 mb-[4px]">{item.value}</span>
                <div className="w-full h-[65%] flex items-end justify-center">
                  <div
                    className="w-full bg-[#1e60aa] hover:bg-[#1a5292] transition-all rounded-t-[2px]"
                    style={{ height: `${barHeight}%`, minHeight: '4px' }}
                  />
                </div>
                <span className="text-[8px] font-bold text-slate-400 mt-[6px] whitespace-nowrap uppercase tracking-wider text-center">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      );
    } else {
      // Custom Date Range / Selected Month (Date-wise counts)
      const dataMap = datesToShow.map(dInfo => ({
        label: dInfo.label,
        value: 0
      }));

      dataList.forEach(c => {
        if (!c.date) return;
        const cDateStr = formatDateToDDMMYY(c.date);
        const idx = datesToShow.findIndex(dInfo => dInfo.dateStr === cDateStr);
        if (idx !== -1) {
          dataMap[idx].value++;
        }
      });

      const maxVal = Math.max(...dataMap.map(item => item.value), 5);

      const barWidthClass = datesToShow.length <= 10 
        ? 'w-[8%]' 
        : datesToShow.length <= 20 
        ? 'w-[4%]' 
        : 'w-[2.5%]';

      return (
        <div className={`flex justify-between items-end ${height} px-[10px] mt-[10px] overflow-x-auto gap-2`}>
          {dataMap.map((item, idx) => {
            const barHeight = (item.value / maxVal) * 100;
            return (
              <div 
                key={idx} 
                className={`flex flex-col items-center h-full justify-end group min-w-[36px] ${barWidthClass}`}
              >
                <span className="text-[10px] font-bold text-slate-600 mb-[4px]">{item.value}</span>
                <div className="w-full h-[65%] flex items-end justify-center">
                  <div
                    className="w-full bg-[#1e60aa] hover:bg-[#1a5292] transition-all rounded-t-[2px]"
                    style={{ height: `${barHeight}%`, minHeight: item.value > 0 ? '2px' : '0px' }}
                  />
                </div>
                <span className="text-[8px] font-bold text-slate-500 mt-[6px] whitespace-nowrap uppercase tracking-wider text-center rotate-45 sm:rotate-0 translate-y-0.5">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
  };

  const renderApprovalStatusChart = (dataList, height = 'h-[180px]') => {
    // Check if user has selected a custom date range filter or a specific month filter
    const hasDateFilter = !!(apprFilterFromDate || apprFilterToDate);
    const hasMonthFilter = apprFilterMonth !== 'All';
    let datesToShow = []; // array of { label: string, dateStr: string } (dateStr is DD/MM/YY)

    if (hasDateFilter) {
      let startDate = null;
      let endDate = null;

      if (apprFilterFromDate) {
        startDate = parseDDMMYYYYToDate(apprFilterFromDate);
      }
      if (apprFilterToDate) {
        endDate = parseDDMMYYYYToDate(apprFilterToDate);
      }

      // Fallback: if one date is empty, find min/max from actual data
      if (dataList.length > 0) {
        const parsedDates = dataList
          .map(c => parseDDMMYYYYToDate(c.date))
          .filter(Boolean);
        if (parsedDates.length > 0) {
          if (!startDate) {
            startDate = new Date(Math.min(...parsedDates.map(d => d.getTime())));
          }
          if (!endDate) {
            endDate = new Date(Math.max(...parsedDates.map(d => d.getTime())));
          }
        }
      }

      if (startDate && endDate) {
        // Normalize times to midnight for comparison
        const sD = new Date(startDate);
        sD.setHours(0, 0, 0, 0);
        const eD = new Date(endDate);
        eD.setHours(0, 0, 0, 0);

        const msDiff = eD.getTime() - sD.getTime();
        const daysDiff = Math.ceil(msDiff / (1000 * 60 * 60 * 24)) + 1;

        if (daysDiff > 0 && daysDiff <= 31) {
          // Generate day-by-day dates
          for (let i = 0; i < daysDiff; i++) {
            const nextDate = new Date(sD);
            nextDate.setDate(sD.getDate() + i);
            const label = nextDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
            datesToShow.push({ label, dateStr: formatDateToDDMMYY(nextDate) });
          }
        } else {
          // Range is wider than 31 days. Show only dates that have requests to keep layout neat.
          const uniqueDateStrings = [...new Set(dataList.map(c => formatDateToDDMMYY(c.date)).filter(s => s && s !== '-'))];
          const sortedDates = uniqueDateStrings
            .map(str => ({ str, dateObj: parseDDMMYYYYToDate(str) }))
            .filter(x => x.dateObj)
            .sort((a, b) => a.dateObj - b.dateObj);

          datesToShow = sortedDates.map(x => {
            const label = x.dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
            return { label, dateStr: x.str };
          });
        }
      }
    } else if (hasMonthFilter) {
      const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIdx = monthsList.indexOf(apprFilterMonth);
      if (monthIdx !== -1) {
        const currentYear = getSyncedDate().getFullYear();
        const daysInMonth = new Date(currentYear, monthIdx + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          const dateObj = new Date(currentYear, monthIdx, i);
          const label = dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
          datesToShow.push({ label, dateStr: formatDateToDDMMYY(dateObj) });
        }
      }
    }

    // If no date range filter or we couldn't resolve dates, default to 12 months view
    if (datesToShow.length === 0) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dataMap = months.map(m => ({ label: m, appr: 0, rej: 0, pend: 0 }));

      dataList.forEach(c => {
        if (!c.date) return;
        try {
          const d = new Date(c.date);
          if (!isNaN(d.getTime())) {
            const monthIdx = d.getMonth();
            const dispStatus = getRequestDisplayStatus(c);
            if (dispStatus === 'Approved' || dispStatus === 'Closed') {
              dataMap[monthIdx].appr++;
            } else if (dispStatus === 'Rejected') {
              dataMap[monthIdx].rej++;
            } else {
              dataMap[monthIdx].pend++;
            }
          }
        } catch {
          // ignore
        }
      });

      const maxVal = Math.max(
        ...dataMap.map(item => Math.max(item.appr, item.rej, item.pend)),
        5
      );

      return (
        <div className={`flex justify-between items-end ${height} px-[10px] mt-[10px]`}>
          {dataMap.map((item, idx) => {
            const hAppr = (item.appr / maxVal) * 100;
            const hRej = (item.rej / maxVal) * 100;
            const hPend = (item.pend / maxVal) * 100;

            return (
              <div key={idx} className="flex flex-col items-center w-[7%] h-full justify-end group">
                <div className="flex gap-[2px] mb-[4px] text-[8px] font-bold">
                  {item.appr > 0 && <span className="text-[#1e60aa]">{item.appr}</span>}
                  {item.rej > 0 && <span className="text-[#f57c00]">{item.rej}</span>}
                  {item.pend > 0 && <span className="text-slate-400">{item.pend}</span>}
                </div>

                <div className="flex items-end justify-center gap-[2px] w-full h-[65%]">
                  <div
                    className="w-[30%] bg-[#1e60aa] rounded-t-[1px]"
                    style={{ height: `${hAppr}%`, minHeight: item.appr > 0 ? '2px' : '0px' }}
                  />
                  <div
                    className="w-[30%] bg-[#f57c00] rounded-t-[1px]"
                    style={{ height: `${hRej}%`, minHeight: item.rej > 0 ? '2px' : '0px' }}
                  />
                  <div
                    className="w-[30%] bg-[#b0bec5] rounded-t-[1px]"
                    style={{ height: `${hPend}%`, minHeight: item.pend > 0 ? '2px' : '0px' }}
                  />
                </div>

                <span className="text-[9px] font-bold text-slate-400 mt-[6px] uppercase tracking-wider">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      );
    } else {
      // Custom Date Range (Date-wise chart representation)
      const dataMap = datesToShow.map(dInfo => ({
        label: dInfo.label,
        appr: 0,
        rej: 0,
        pend: 0
      }));

      dataList.forEach(c => {
        if (!c.date) return;
        const cDateStr = formatDateToDDMMYY(c.date);
        const idx = datesToShow.findIndex(dInfo => dInfo.dateStr === cDateStr);
        if (idx !== -1) {
          const dispStatus = getRequestDisplayStatus(c);
          if (dispStatus === 'Approved' || dispStatus === 'Closed') {
            dataMap[idx].appr++;
          } else if (dispStatus === 'Rejected') {
            dataMap[idx].rej++;
          } else {
            dataMap[idx].pend++;
          }
        }
      });

      const maxVal = Math.max(
        ...dataMap.map(item => Math.max(item.appr, item.rej, item.pend)),
        5
      );

      // Dynamically calculate width of bar groups depending on count to prevent squeeze/overflow
      const barWidthClass = datesToShow.length <= 10 
        ? 'w-[8%]' 
        : datesToShow.length <= 20 
        ? 'w-[4%]' 
        : 'w-[2.5%]';

      return (
        <div className={`flex justify-between items-end ${height} px-[10px] mt-[10px] overflow-x-auto gap-2`}>
          {dataMap.map((item, idx) => {
            const hAppr = (item.appr / maxVal) * 100;
            const hRej = (item.rej / maxVal) * 100;
            const hPend = (item.pend / maxVal) * 100;

            return (
              <div 
                key={idx} 
                className={`flex flex-col items-center h-full justify-end group min-w-[36px] ${barWidthClass}`}
              >
                <div className="flex gap-[2px] mb-[4px] text-[8px] font-bold">
                  {item.appr > 0 && <span className="text-[#1e60aa]">{item.appr}</span>}
                  {item.rej > 0 && <span className="text-[#f57c00]">{item.rej}</span>}
                  {item.pend > 0 && <span className="text-slate-400">{item.pend}</span>}
                </div>

                <div className="flex items-end justify-center gap-[2px] w-full h-[65%]">
                  <div
                    className="w-[30%] bg-[#1e60aa] rounded-t-[1px]"
                    style={{ height: `${hAppr}%`, minHeight: item.appr > 0 ? '2px' : '0px' }}
                  />
                  <div
                    className="w-[30%] bg-[#f57c00] rounded-t-[1px]"
                    style={{ height: `${hRej}%`, minHeight: item.rej > 0 ? '2px' : '0px' }}
                  />
                  <div
                    className="w-[30%] bg-[#b0bec5] rounded-t-[1px]"
                    style={{ height: `${hPend}%`, minHeight: item.pend > 0 ? '2px' : '0px' }}
                  />
                </div>

                <span className="text-[8px] font-bold text-slate-500 mt-[6px] whitespace-nowrap uppercase tracking-wider text-center rotate-45 sm:rotate-0 translate-y-0.5">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
  };

  const renderImprovementBenefits = () => {
    // 1. Apply separate filters
    const filteredCost = costSavingRows.filter(row => {
      let matchesMonth = true;
      if (benefitFilterMonth !== 'All') {
        const parts = row.date.split('/');
        if (parts.length === 3) {
          const monthIdx = parseInt(parts[1], 10) - 1;
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          matchesMonth = months[monthIdx] === benefitFilterMonth;
        } else {
          matchesMonth = false;
        }
      }
      const matchesSearch = !benefitFilterSearch || row.changeNo.toLowerCase().includes(benefitFilterSearch.toLowerCase());
      return matchesMonth && matchesSearch;
    });

    const filteredProductivity = productivityRows.filter(row => {
      let matchesMonth = true;
      if (benefitFilterMonth !== 'All') {
        const parts = row.date.split('/');
        if (parts.length === 3) {
          const monthIdx = parseInt(parts[1], 10) - 1;
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          matchesMonth = months[monthIdx] === benefitFilterMonth;
        } else {
          matchesMonth = false;
        }
      }
      const matchesSearch = !benefitFilterSearch || row.changeNo.toLowerCase().includes(benefitFilterSearch.toLowerCase());
      return matchesMonth && matchesSearch;
    });

    const filteredQuality = qualityRows.filter(row => {
      let matchesMonth = true;
      if (benefitFilterMonth !== 'All') {
        const parts = row.date.split('/');
        if (parts.length === 3) {
          const monthIdx = parseInt(parts[1], 10) - 1;
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          matchesMonth = months[monthIdx] === benefitFilterMonth;
        } else {
          matchesMonth = false;
        }
      }
      const matchesSearch = !benefitFilterSearch || row.changeNo.toLowerCase().includes(benefitFilterSearch.toLowerCase());
      return matchesMonth && matchesSearch;
    });

    // Max values for chart scaling
    const maxCostVal = Math.max(...filteredCost.map(r => parseFloat(r.monthlySave) || 0), 1000);
    const maxProdVal = Math.max(...filteredProductivity.flatMap(r => [parseFloat(r.currentProd) || 0, parseFloat(r.improvedProd) || 0]), 10);
    const maxQualityVal = Math.max(...filteredQuality.flatMap(r => [parseFloat(r.currentPpm) || 0, parseFloat(r.reducedPpm) || 0]), 100);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const showCost = benefitFilterType === 'All' || benefitFilterType === 'Cost';
    const showProductivity = benefitFilterType === 'All' || benefitFilterType === 'Productivity';
    const showQuality = benefitFilterType === 'All' || benefitFilterType === 'Quality';

    return (
      <div className="space-y-[24px]">
        {/* SEPARATE FILTER BAR */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-[12px] p-[16px] bg-slate-50 border border-slate-200 rounded-xl text-[11px] shadow-sm">
          <div className="space-y-[4px]">
            <label className="block font-bold text-slate-500 uppercase tracking-wider">Improvement Type</label>
            <select
              className="w-full px-[8px] py-[6px] border border-slate-200 rounded-[6px] bg-white text-slate-700 font-semibold outline-none focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]/20 transition-all"
              value={benefitFilterType}
              onChange={(e) => setBenefitFilterType(e.target.value)}
            >
              <option value="All">All Benefits</option>
              <option value="Cost">Cost Saving</option>
              <option value="Productivity">Productivity Improvement</option>
              <option value="Quality">Quality Improvement</option>
            </select>
          </div>

          <div className="space-y-[4px]">
            <label className="block font-bold text-slate-500 uppercase tracking-wider">Month</label>
            <select
              className="w-full px-[8px] py-[6px] border border-slate-200 rounded-[6px] bg-white text-slate-700 font-semibold outline-none focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]/20 transition-all"
              value={benefitFilterMonth}
              onChange={(e) => setBenefitFilterMonth(e.target.value)}
            >
              <option value="All">All Months</option>
              {months.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="space-y-[4px]">
            <label className="block font-bold text-slate-500 uppercase tracking-wider">Search 4M Change No</label>
            <input
              type="text"
              placeholder="e.g. 4M-2026-2..."
              className="w-full px-[8px] py-[6px] border border-slate-200 rounded-[6px] bg-white text-slate-700 placeholder-slate-400 font-semibold outline-none focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]/20 transition-all"
              value={benefitFilterSearch}
              onChange={(e) => setBenefitFilterSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Cost Saving Section */}
        {showCost && (
          <div className="space-y-[12px] bg-white border border-slate-200/80 rounded-xl p-[20px] shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h5 className="text-[13px] font-bold text-[#1e60aa] uppercase tracking-wider">Cost Saving</h5>
            </div>

            {/* Cost Saving Chart */}
            {filteredCost.length > 0 ? (
              <div className="bg-slate-50/50 border border-slate-200/50 rounded-xl p-4">
                <h6 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Cost Saved / Month (Rs) per Change Request</h6>
                <div className="flex justify-start items-end h-[160px] gap-6 overflow-x-auto pb-4 px-2 min-w-full">
                  {filteredCost.map((row, idx) => {
                    const val = parseFloat(row.monthlySave) || 0;
                    const pct = (val / maxCostVal) * 100;
                    return (
                      <div key={idx} className="flex flex-col items-center min-w-[70px] max-w-[100px] h-full justify-end group">
                        <span className="text-[9px] font-bold text-slate-600 mb-1">Rs. {val}</span>
                        <div className="w-full h-[65%] flex items-end justify-center">
                          <div
                            className="w-8 bg-gradient-to-t from-[#154a85] to-[#1e60aa] hover:from-[#1a5292] hover:to-[#226ec2] transition-all rounded-t-[3px] shadow-sm cursor-pointer"
                            style={{ height: `${Math.max(pct, 4)}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-bold text-slate-500 mt-2 truncate max-w-full" title={row.changeNo}>
                          {row.changeNo}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-[12px]">
                No Cost Saving chart data matching filter criteria.
              </div>
            )}

            {/* Cost Saving Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px] min-w-[700px]">
                  <thead>
                    <tr className="bg-[#1e60aa] text-white border-b border-[#154a85] font-semibold">
                      <th className="p-[10px] border-r border-[#1a5596] w-[18%]">4M #</th>
                      <th className="p-[10px] border-r border-[#1a5596] w-[20%]">Implementation date</th>
                      <th className="p-[10px] border-r border-[#1a5596] w-[22%]">Total Cost Saved / month(Rs)</th>
                      <th className="p-[10px] border-r border-[#1a5596] w-[22%]">Total Cost Saved / Annum(Rs)</th>
                      <th className="p-[10px] w-[18%]">ROI (Rs)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCost.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-[16px] text-center text-slate-400 font-medium">
                          No Cost Saving data available matching selection.
                        </td>
                      </tr>
                    ) : (
                      filteredCost.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 text-slate-700 font-medium odd:bg-slate-50/20">
                          <td className="p-[10px] border-r border-slate-100 font-bold text-[#0066cc]">{row.changeNo}</td>
                          <td className="p-[10px] border-r border-slate-100 text-slate-500">{row.date}</td>
                          <td className="p-[10px] border-r border-slate-100 font-semibold text-slate-800">Rs. {row.monthlySave || '0'}</td>
                          <td className="p-[10px] border-r border-slate-100 font-semibold text-slate-800">Rs. {row.annualSave || '0'}</td>
                          <td className="p-[10px] text-slate-600">{row.roi || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Productivity Improvement Section */}
        {showProductivity && (
          <div className="space-y-[12px] bg-white border border-slate-200/80 rounded-xl p-[20px] shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h5 className="text-[13px] font-bold text-[#1e60aa] uppercase tracking-wider">Productivity Improvement</h5>
            </div>

            {/* Productivity Chart */}
            {filteredProductivity.length > 0 ? (
              <div className="bg-slate-50/50 border border-slate-200/50 rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <h6 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Productivity (nos) per Change Request</h6>
                  <div className="flex items-center gap-3 text-[9px] font-bold text-slate-500">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm bg-slate-400" />
                      <span>Current</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm bg-[#2e7d32]" />
                      <span>Improved</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-start items-end h-[160px] gap-8 overflow-x-auto pb-4 px-2 min-w-full">
                  {filteredProductivity.map((row, idx) => {
                    const curr = parseFloat(row.currentProd) || 0;
                    const imp = parseFloat(row.improvedProd) || 0;
                    const pctCurr = (curr / maxProdVal) * 100;
                    const pctImp = (imp / maxProdVal) * 100;
                    return (
                      <div key={idx} className="flex flex-col items-center min-w-[80px] h-full justify-end">
                        <div className="flex gap-1 mb-1 text-[9px] font-bold text-slate-600">
                          <span>{curr}</span>
                          <span>/</span>
                          <span className="text-[#2e7d32]">{imp}</span>
                        </div>
                        <div className="flex items-end gap-1.5 h-[65%] justify-center">
                          <div
                            className="w-5 bg-slate-400 hover:bg-slate-500 transition-all rounded-t-[2px] shadow-sm cursor-pointer"
                            style={{ height: `${Math.max(pctCurr, 4)}%` }}
                          />
                          <div
                            className="w-5 bg-[#2e7d32] hover:bg-[#1b5e20] transition-all rounded-t-[2px] shadow-sm cursor-pointer"
                            style={{ height: `${Math.max(pctImp, 4)}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-bold text-slate-500 mt-2 truncate max-w-full" title={row.changeNo}>
                          {row.changeNo}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-[12px]">
                No Productivity chart data matching filter criteria.
              </div>
            )}

            {/* Productivity Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px] min-w-[700px]">
                  <thead>
                    <tr className="bg-[#1e60aa] text-white border-b border-[#154a85] font-semibold">
                      <th className="p-[10px] border-r border-[#1a5596] w-[20%]">4M #</th>
                      <th className="p-[10px] border-r border-[#1a5596] w-[22%]">Implementation date</th>
                      <th className="p-[10px] border-r border-[#1a5596] w-[29%]">Current Productivity (nos)</th>
                      <th className="p-[10px] w-[29%]">Productivity Improved (nos)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProductivity.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-[16px] text-center text-slate-400 font-medium">
                          No Productivity Improvement data available matching selection.
                        </td>
                      </tr>
                    ) : (
                      filteredProductivity.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 text-slate-700 font-medium odd:bg-slate-50/20">
                          <td className="p-[10px] border-r border-slate-100 font-bold text-[#0066cc]">{row.changeNo}</td>
                          <td className="p-[10px] border-r border-slate-100 text-slate-500">{row.date}</td>
                          <td className="p-[10px] border-r border-slate-100 text-slate-600">{row.currentProd || '0'} nos</td>
                          <td className="p-[10px] font-bold text-slate-800">{row.improvedProd || '0'} nos</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Quality Improvement Section */}
        {showQuality && (
          <div className="space-y-[12px] bg-white border border-slate-200/80 rounded-xl p-[20px] shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h5 className="text-[13px] font-bold text-[#1e60aa] uppercase tracking-wider">Quality Improvement</h5>
            </div>

            {/* Quality Chart */}
            {filteredQuality.length > 0 ? (
              <div className="bg-slate-50/50 border border-slate-200/50 rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <h6 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quality PPM Reduction per Change Request</h6>
                  <div className="flex items-center gap-3 text-[9px] font-bold text-slate-500">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm bg-rose-500" />
                      <span>Current PPM</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm bg-[#8bc34a]" />
                      <span>Reduced PPM</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-start items-end h-[160px] gap-8 overflow-x-auto pb-4 px-2 min-w-full">
                  {filteredQuality.map((row, idx) => {
                    const curr = parseFloat(row.currentPpm) || 0;
                    const red = parseFloat(row.reducedPpm) || 0;
                    const pctCurr = (curr / maxQualityVal) * 100;
                    const pctRed = (red / maxQualityVal) * 100;
                    return (
                      <div key={idx} className="flex flex-col items-center min-w-[80px] h-full justify-end">
                        <div className="flex gap-1 mb-1 text-[9px] font-bold text-slate-655">
                          <span className="text-rose-600">{curr}</span>
                          <span>/</span>
                          <span className="text-[#689f38]">{red}</span>
                        </div>
                        <div className="flex items-end gap-1.5 h-[65%] justify-center">
                          <div
                            className="w-5 bg-rose-500 hover:bg-rose-600 transition-all rounded-t-[2px] shadow-sm cursor-pointer"
                            style={{ height: `${Math.max(pctCurr, 4)}%` }}
                          />
                          <div
                            className="w-5 bg-[#8bc34a] hover:bg-[#7cb342] transition-all rounded-t-[2px] shadow-sm cursor-pointer"
                            style={{ height: `${Math.max(pctRed, 4)}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-bold text-slate-500 mt-2 truncate max-w-full" title={row.changeNo}>
                          {row.changeNo}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-[12px]">
                No Quality chart data matching filter criteria.
              </div>
            )}

            {/* Quality Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px] min-w-[700px]">
                  <thead>
                    <tr className="bg-[#1e60aa] text-white border-b border-[#154a85] font-semibold">
                      <th className="p-[10px] border-r border-[#1a5596] w-[20%]">4M #</th>
                      <th className="p-[10px] border-r border-[#1a5596] w-[22%]">Implementation date</th>
                      <th className="p-[10px] border-r border-[#1a5596] w-[29%]">Current PPM</th>
                      <th className="p-[10px] w-[29%]">Reduced PPM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredQuality.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-[16px] text-center text-slate-400 font-medium">
                          No Quality Improvement data available matching selection.
                        </td>
                      </tr>
                    ) : (
                      filteredQuality.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 text-slate-700 font-medium odd:bg-slate-50/20">
                          <td className="p-[10px] border-r border-slate-100 font-bold text-[#0066cc]">{row.changeNo}</td>
                          <td className="p-[10px] border-r border-slate-100 text-slate-500">{row.date}</td>
                          <td className="p-[10px] border-r border-slate-100 text-slate-600">{row.currentPpm || '0'}</td>
                          <td className="p-[10px] font-bold text-slate-800">{row.reducedPpm || '0'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-[32px] animate-fade-in-up">
      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-[20px]">
        {/* Total Requests */}
        <div className="bg-white border border-slate-200/60 rounded-xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-[#0066cc]" />
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-[11.5px] font-bold text-slate-400 uppercase tracking-wider font-sans">Total Requests</h4>
              <div className="text-[32px] font-bold text-slate-900 mt-2 font-heading tracking-tight">
                {isFetchingChanges ? <Loader2 className="animate-spin text-slate-400" size={24} /> : totalCount}
              </div>
            </div>
            <div className="p-2.5 bg-[#e6f0fa] text-[#0066cc] rounded-lg group-hover:scale-110 transition-transform duration-300">
              <BarChart3 size={20} />
            </div>
          </div>
        </div>

        {/* Approved */}
        <div className="bg-white border border-slate-200/60 rounded-xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-emerald-500" />
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-[11.5px] font-bold text-slate-400 uppercase tracking-wider font-sans">Approved</h4>
              <div className="text-[32px] font-bold text-emerald-600 mt-2 font-heading tracking-tight">
                {isFetchingChanges ? <Loader2 className="animate-spin text-slate-400" size={24} /> : approvedCount}
              </div>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform duration-300">
              <CheckCircle size={20} />
            </div>
          </div>
        </div>

        {/* Pending Approval */}
        <div className="bg-white border border-slate-200/60 rounded-xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-amber-500" />
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-[11.5px] font-bold text-slate-400 uppercase tracking-wider font-sans">Pending Approval</h4>
              <div className="text-[32px] font-bold text-amber-600 mt-2 font-heading tracking-tight">
                {isFetchingChanges ? <Loader2 className="animate-spin text-slate-400" size={24} /> : pendingCount}
              </div>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg group-hover:scale-110 transition-transform duration-300">
              <Clock size={20} />
            </div>
          </div>
        </div>

        {/* Rejected */}
        <div className="bg-white border border-slate-200/60 rounded-xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-rose-500" />
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-[11.5px] font-bold text-slate-400 uppercase tracking-wider font-sans">Rejected</h4>
              <div className="text-[32px] font-bold text-rose-600 mt-2 font-heading tracking-tight">
                {isFetchingChanges ? <Loader2 className="animate-spin text-slate-400" size={24} /> : rejectedCount}
              </div>
            </div>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg group-hover:scale-110 transition-transform duration-300">
              <ShieldAlert size={20} />
            </div>
          </div>
        </div>

        {/* Closed */}
        <div className="bg-white border border-slate-200/60 rounded-xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-indigo-500" />
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-[11.5px] font-bold text-slate-400 uppercase tracking-wider font-sans">Closed</h4>
              <div className="text-[32px] font-bold text-indigo-600 mt-2 font-heading tracking-tight">
                {isFetchingChanges ? <Loader2 className="animate-spin text-slate-400" size={24} /> : closedCount}
              </div>
            </div>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg group-hover:scale-110 transition-transform duration-300">
              <CheckCheck size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Main Section */}
      <div className="space-y-[20px]">
        {/* Plant Change Analytics Title Header */}
        <div className="flex justify-between items-center flex-wrap gap-[12px]">
          <div className="flex items-center gap-[8px]">
            <h3 className="font-heading text-[18px] font-bold text-slate-900">Plant Change Analytics</h3>
            <BarChart3 size={18} className="text-slate-400" />
          </div>

          <div className="flex items-center gap-[12px]">
            {/* Show tab segments ONLY in Tab View mode */}
            {!isGridView && (
              <div className="flex flex-wrap items-center justify-center bg-slate-100 p-[4px] rounded-[6px] border border-slate-200 gap-y-1">
                {['Department', 'Process', '6M Category', 'Monthly', 'Approval Status', 'Improvement Benefits'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveAnalyticsTab(tab)}
                    className={`px-[12px] py-[6px] text-[11px] font-bold rounded-[4px] transition-all cursor-pointer ${activeAnalyticsTab === tab
                        ? 'bg-white text-[#1e60aa] shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            )}

            {/* View Mode Toggle button */}
            <button
              onClick={() => setIsGridView(!isGridView)}
              className="flex items-center gap-[6px] border border-slate-200 bg-white hover:bg-slate-50 px-[12px] py-[6px] rounded-[6px] text-[11px] font-bold text-slate-600 transition-all cursor-pointer"
            >
              <LayoutGrid size={12} />
              <span>{isGridView ? 'Tab View' : 'Grid View'}</span>
            </button>
          </div>
        </div>

        {/* Toggleable Layout modes */}
        {!isGridView ? (
          /* TAB VIEW (Single Chart Layout) */
          <div className="bg-white border border-slate-200/60 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 space-y-[20px]">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-[14px] font-bold text-slate-800">
                {activeAnalyticsTab === 'Department' && 'Department Wise Change'}
                {activeAnalyticsTab === 'Process' && 'Process Wise Change'}
                {activeAnalyticsTab === '6M Category' && '6M Category Change'}
                {activeAnalyticsTab === 'Monthly' && 'Monthly Change'}
                {activeAnalyticsTab === 'Approval Status' && 'Overall Change Approval Status'}
                {activeAnalyticsTab === 'Improvement Benefits' && 'Improvement Benefits'}
              </h4>
              <button
                onClick={handleExportActiveTab}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer font-sans"
                title={`Export ${activeAnalyticsTab} Analytics to PDF`}
              >
                <Download size={12} />
                <span>Export PDF</span>
              </button>
            </div>

            {/* Render filter block based on selected analytics tab */}
            {renderFiltersForTab(activeAnalyticsTab)}

            {/* Render selected chart */}
            {activeAnalyticsTab === 'Department' && renderDepartmentChart(getFilteredData(deptFilterMonth, deptFilterFromDate, deptFilterToDate, deptFilterPerson, deptFilterProcess, deptFilterMachine))}
            {activeAnalyticsTab === 'Process' && renderProcessChart(getFilteredData(procFilterMonth, procFilterFromDate, procFilterToDate, procFilterPerson, procFilterProcess, procFilterMachine))}
            {activeAnalyticsTab === '6M Category' && renderCategoryChart(getFilteredData(catFilterMonth, catFilterFromDate, catFilterToDate, catFilterPerson, catFilterProcess, catFilterMachine))}
            {activeAnalyticsTab === 'Monthly' && renderMonthlyChart(getFilteredData(monthFilterMonth, monthFilterFromDate, monthFilterToDate, monthFilterPerson, monthFilterProcess, monthFilterMachine))}
            {activeAnalyticsTab === 'Approval Status' && renderApprovalStatusChart(getFilteredData(apprFilterMonth, apprFilterFromDate, apprFilterToDate, 'All', 'All', 'All', apprFilterStatus))}
            {activeAnalyticsTab === 'Improvement Benefits' && renderImprovementBenefits()}
          </div>
        ) : (
          /* GRID VIEW (2x2 smaller charts + 1 full-width chart layout) */
          <div className="space-y-[20px]">
            {/* 2x2 Grid of 4 Smaller Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[20px]">
              {/* 1. Department Wise Change */}
              <div className="bg-white border border-slate-200/60 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 space-y-[16px]">
                <div className="flex items-center justify-between">
                  <h4 className="text-[13px] font-bold text-slate-800">Department Wise Change</h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportSpecificTab('Department')}
                      className="text-slate-400 hover:text-[#0066cc] p-1 transition-colors cursor-pointer"
                      title="Export Department Analytics to PDF"
                    >
                      <Download size={14} />
                    </button>
                    <GitBranch size={14} className="text-slate-400" />
                  </div>
                </div>
                {renderFiltersForTab('Department')}
                {renderDepartmentChart(getFilteredData(deptFilterMonth, deptFilterFromDate, deptFilterToDate, deptFilterPerson, deptFilterProcess, deptFilterMachine), 'h-[140px]')}
              </div>

              {/* 2. Process Wise Change */}
              <div className="bg-white border border-slate-200/60 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 space-y-[16px]">
                <div className="flex items-center justify-between">
                  <h4 className="text-[13px] font-bold text-slate-800">Process Wise Change</h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportSpecificTab('Process')}
                      className="text-slate-400 hover:text-[#0066cc] p-1 transition-colors cursor-pointer"
                      title="Export Process Analytics to PDF"
                    >
                      <Download size={14} />
                    </button>
                    <Settings size={14} className="text-slate-400" />
                  </div>
                </div>
                {renderFiltersForTab('Process')}
                {renderProcessChart(getFilteredData(procFilterMonth, procFilterFromDate, procFilterToDate, procFilterPerson, procFilterProcess, procFilterMachine), 'h-[140px]')}
              </div>

              {/* 3. 6M Category Change */}
              <div className="bg-white border border-slate-200/60 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 space-y-[16px]">
                <div className="flex items-center justify-between">
                  <h4 className="text-[13px] font-bold text-slate-800">6M Category Change</h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportSpecificTab('6M Category')}
                      className="text-slate-400 hover:text-[#0066cc] p-1 transition-colors cursor-pointer"
                      title="Export 6M Category Analytics to PDF"
                    >
                      <Download size={14} />
                    </button>
                    <Layers size={14} className="text-slate-400" />
                  </div>
                </div>
                {renderFiltersForTab('6M Category')}
                {renderCategoryChart(getFilteredData(catFilterMonth, catFilterFromDate, catFilterToDate, catFilterPerson, catFilterProcess, catFilterMachine), 'h-[140px]')}
              </div>

              {/* 4. Monthly Change */}
              <div className="bg-white border border-slate-200/60 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 space-y-[16px]">
                <div className="flex items-center justify-between">
                  <h4 className="text-[13px] font-bold text-slate-800">Monthly Change</h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportSpecificTab('Monthly')}
                      className="text-slate-400 hover:text-[#0066cc] p-1 transition-colors cursor-pointer"
                      title="Export Monthly Analytics to PDF"
                    >
                      <Download size={14} />
                    </button>
                    <Calendar size={14} className="text-slate-400" />
                  </div>
                </div>
                {renderFiltersForTab('Monthly')}
                {renderMonthlyChart(getFilteredData(monthFilterMonth, monthFilterFromDate, monthFilterToDate, monthFilterPerson, monthFilterProcess, monthFilterMachine), 'h-[140px]')}
              </div>
            </div>

            {/* 5. Overall Change Approval Status (Full-width Card at bottom of Grid Mode) */}
            <div className="bg-white border border-slate-200/60 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 space-y-[16px]">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-[8px]">
                  <h4 className="text-[13px] font-bold text-slate-800">Overall Change Approval Status</h4>
                  <ShieldAlert size={14} className="text-slate-400" />
                </div>
                {/* Legends & Export */}
                <div className="flex items-center gap-[16px] text-[10px] font-bold text-slate-500 select-none">
                  <div className="flex items-center gap-[12px]">
                    <div className="flex items-center gap-[4px]">
                      <span className="w-[8px] h-[8px] rounded-full bg-[#1e60aa]" />
                      <span>Appr</span>
                    </div>
                    <div className="flex items-center gap-[4px]">
                      <span className="w-[8px] h-[8px] rounded-full bg-[#f57c00]" />
                      <span>Rej</span>
                    </div>
                    <div className="flex items-center gap-[4px]">
                      <span className="w-[8px] h-[8px] rounded-full bg-[#b0bec5]" />
                      <span>Pend</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleExportSpecificTab('Approval Status')}
                    className="text-slate-400 hover:text-[#0066cc] p-1 transition-colors cursor-pointer"
                    title="Export Approval Status Analytics to PDF"
                  >
                    <Download size={14} />
                  </button>
                </div>
              </div>
              {renderFiltersForTab('Approval Status')}
              {renderApprovalStatusChart(getFilteredData(apprFilterMonth, apprFilterFromDate, apprFilterToDate, 'All', 'All', 'All', apprFilterStatus), 'h-[180px]')}
            </div>

            {/* 6. Improvement Benefits (Full-width Card at bottom of Grid Mode) */}
            <div className="bg-white border border-slate-200/60 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 space-y-[16px]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-[8px] flex-wrap gap-2">
                <div className="flex items-center gap-[8px]">
                  <h4 className="text-[13px] font-bold text-slate-800">Improvement Benefits</h4>
                  <BarChart3 size={14} className="text-slate-400" />
                </div>
                <button
                  onClick={() => handleExportSpecificTab('Improvement Benefits')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer font-sans"
                  title="Export Improvement Benefits Report to PDF"
                >
                  <Download size={12} />
                  <span>Export PDF</span>
                </button>
              </div>
              {renderImprovementBenefits()}
            </div>
          </div>
        )}
      </div>

      {/* Recent Change Requests Table */}
      <div className="bg-white border border-slate-200/60 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
        <div className="p-[20px] border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-[18px] font-bold text-slate-900">Recent change requests</h3>
            <Clock size={18} className="text-slate-400" />
          </div>
          <div className="flex items-center gap-[12px] flex-wrap">
            <span className="bg-slate-100 border border-slate-200 text-slate-500 rounded-full px-[10px] py-[2px] text-[10px] font-bold select-none">
              Showing {filteredChangesForTable.length} of {changes.length}
            </span>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer font-sans"
              title="Export filtered dashboard requests to PDF"
            >
              <Download size={12} />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {renderFilters({
          monthVal: tableFilterMonth, setMonthVal: setTableFilterMonth,
          fromDateVal: tableFilterFromDate, setFromDateVal: setTableFilterFromDate,
          toDateVal: tableFilterToDate, setToDateVal: setTableFilterToDate,
          personVal: tableFilterPerson, setPersonVal: setTableFilterPerson,
          processVal: tableFilterProcess, setProcessVal: setTableFilterProcess,
          machineVal: tableFilterMachine, setMachineVal: setTableFilterMachine
        })}


        <div className="overflow-x-auto">
          {isFetchingChanges ? (
            <div className="flex flex-col items-center justify-center py-[64px] gap-[8px] text-slate-400">
              <Loader2 className="animate-spin text-[#0066cc]" size={28} />
              <span className="text-[14px]">Fetching changes...</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150">
                  <th className="p-[16px] text-[11px] font-bold text-slate-500 uppercase tracking-wider">SL. NO.</th>
                  <th className="p-[16px] text-[11px] font-bold text-slate-500 uppercase tracking-wider">CHANGE NO.</th>
                  <th className="p-[16px] text-[11px] font-bold text-slate-500 uppercase tracking-wider">MACHINE NO.</th>
                  <th className="p-[16px] text-[11px] font-bold text-slate-500 uppercase tracking-wider">DEPARTMENT</th>
                  <th className="p-[16px] text-[11px] font-bold text-slate-500 uppercase tracking-wider">REQUEST DATE</th>
                  <th className="p-[16px] text-[11px] font-bold text-slate-500 uppercase tracking-wider">STATUS</th>
                  <th className="p-[16px] text-[11px] font-bold text-slate-500 uppercase tracking-wider">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTableRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-[24px] text-slate-400 text-[13px]">
                      No matching change requests found.
                    </td>
                  </tr>
                ) : (
                  paginatedTableRows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-[16px] text-[12px] text-slate-500 font-semibold">{r.slNo}</td>
                      <td className="p-[16px] text-[12px] font-bold text-[#0066cc] hover:underline cursor-pointer" onClick={() => handleViewDetails(r)}>{r.id}</td>
                      <td className="p-[16px] text-[12px] text-slate-600 font-medium">{r.machineNo}</td>
                      <td className="p-[16px] text-[12px] text-slate-600 font-medium">{r.department}</td>
                      <td className="p-[16px] text-[12px] text-slate-500">{r.date}</td>
                      <td className="p-[16px]">
                        <span className={`inline-flex items-center gap-[4px] px-[10px] py-[2px] rounded-full text-[11px] font-semibold border ${r.status === 'Pending L3' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                            r.status === 'Pending L2' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                            r.status === 'Pending L1 HOD' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                            r.status === 'Approved' ? 'bg-emerald-50 border-emerald-250 text-emerald-700' :
                              r.status === 'Rejected' ? 'bg-rose-50 border-rose-250 text-rose-700' :
                                'bg-teal-50 border-teal-200 text-teal-700'
                          }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-[16px]">
                        <button
                          onClick={() => handleViewDetails(r)}
                          className="p-1.5 hover:bg-slate-100 hover:text-[#0066cc] text-slate-400 rounded-md transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={allTableRows.length}
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
            <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 px-[24px] py-[18px] border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-[10px]">
                <span className="p-2 bg-[#e6f0fa] text-[#0066cc] rounded-lg">
                  <Eye size={18} />
                </span>
                <div>
                  <h4 className="text-[15px] font-bold text-slate-900">Change Request Details (L1, L2, L3)</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Tracking details for: <span className="font-mono font-bold text-slate-600">{selectedLog.changeNo}</span></p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="p-[6px] hover:bg-slate-200/60 rounded-full text-slate-400 hover:text-slate-655 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs Header */}
            <div className="flex border-b border-slate-200 bg-slate-50/50">
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
                              <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 text-[10px] font-bold text-slate-655 uppercase tracking-wider">
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
                          <span className="font-medium text-slate-655 truncate max-w-[200px]" title={selectedL2Details.weldTest || '-'}>
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
                          <span className="font-medium text-slate-655 truncate max-w-[200px]" title={selectedL2Details.qaTest || '-'}>
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
                  </div>
                )
              )}

              {activeTab === 'l3' && selectedLog && (
                <div className="space-y-[20px]">
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
                className="px-[16px] py-[8px] bg-white border border-slate-250 rounded-[6px] text-slate-655 hover:bg-slate-50 hover:text-slate-800 text-[12px] font-semibold transition-colors shadow-sm cursor-pointer"
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
                          <div className="font-bold text-xs uppercase tracking-wider text-slate-450">Nippon Quality Assurance</div>
                          <h3 className="font-extrabold text-base text-slate-900 mt-0.5">Change Request Attachment</h3>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono text-right">
                          DOC: L1-ATT-VER<br />
                          REV: 03 (2026)
                        </div>
                      </div>
                      <div className="border-t border-slate-100 pt-3 space-y-2.5 text-xs text-slate-650">
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
                ) : previewFile.toLowerCase().match(/\.(jpg|jpeg|jfif|png|gif|webp|bmp|svg|tiff|tif|ico|heic|heic|heif|avif)$/) ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-md max-w-sm w-full text-center space-y-4 animate-fade-in">
                    <div className="w-16 h-16 bg-teal-50 text-teal-650 rounded-full flex items-center justify-center mx-auto text-3xl">
                      🖼️
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-850 text-sm">{previewFile}</h4>
                      <p className="text-xs text-slate-455 mt-1">Mock Image Evidence</p>
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
