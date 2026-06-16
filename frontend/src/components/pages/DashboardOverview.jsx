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
  Download
} from 'lucide-react';
import TablePagination from '@mui/material/TablePagination';
import { formatDateToDDMMYY, parseDDMMYYYYToDate } from '../../utils/dateUtils';
import { getRequestDisplayStatus } from '../../utils/statusUtils';
import { getSyncedDate } from '../../utils/timeSync';
import { CustomDatePicker } from '../ui/CustomDatePicker';
import { getProcesses, getMachines } from '../../api/apiRoutes';
import {
  exportDashboardRequestsPDF,
  exportDepartmentAnalyticsPDF,
  exportProcessAnalyticsPDF,
  exportCategoryAnalyticsPDF,
  exportMonthlyAnalyticsPDF,
  exportApprovalStatusAnalyticsPDF,
  exportImprovementBenefitsPDF
} from '../../utils/pdfExport';


export const DashboardOverview = ({
  changes,
  isFetchingChanges,
  setToastMsg
}) => {
  const [isGridView, setIsGridView] = useState(false);
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState('Department');

  // Separate Benefit Filters
  const [benefitFilterType, setBenefitFilterType] = useState('All');
  const [benefitFilterMonth, setBenefitFilterMonth] = useState('All');
  const [benefitFilterSearch, setBenefitFilterSearch] = useState('');

  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const [filterMonth, setFilterMonth] = useState('All');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [filterPerson, setFilterPerson] = useState('All');
  const [filterProcess, setFilterProcess] = useState('All');
  const [filterMachine, setFilterMachine] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [filterMonth, filterFromDate, filterToDate, filterPerson, filterProcess, filterMachine, filterStatus]);

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
  const currentYearShort = String(getSyncedDate().getFullYear()).slice(-2);
  const monthOptions = monthsList.map(m => `${m}-${currentYearShort}`);

  const uniquePersons = ['All', ...new Set(changes.map(c => c.requester).filter(Boolean))];
  const uniqueProcesses = ['All', ...new Set([...dbProcesses, ...changes.map(c => c.processName).filter(Boolean)])];
  const uniqueMachines = ['All', ...new Set([...dbMachines, ...changes.map(c => c.machineNo).filter(Boolean)])];

  const filteredChanges = changes.filter(c => {
    let matchesMonth = true;
    if (filterMonth !== 'All') {
      try {
        const [selMonthName, selYearShort] = filterMonth.split('-');
        const d = new Date(c.date);
        if (!isNaN(d.getTime())) {
          const itemMonthName = d.toLocaleDateString('en-US', { month: 'short' });
          const itemYearShort = String(d.getFullYear()).slice(-2);
          matchesMonth = (itemMonthName === selMonthName && itemYearShort === selYearShort);
        } else {
          matchesMonth = false;
        }
      } catch {
        matchesMonth = false;
      }
    }

    let matchesFromDate = true;
    if (filterFromDate) {
      const fD = parseDDMMYYYYToDate(filterFromDate);
      if (fD) {
        fD.setHours(0, 0, 0, 0);
        const itemD = parseDDMMYYYYToDate(c.date);
        matchesFromDate = itemD && itemD >= fD;
      }
    }

    let matchesToDate = true;
    if (filterToDate) {
      const tD = parseDDMMYYYYToDate(filterToDate);
      if (tD) {
        tD.setHours(23, 59, 59, 999);
        const itemD = parseDDMMYYYYToDate(c.date);
        matchesToDate = itemD && itemD <= tD;
      }
    }

    const matchesPerson = filterPerson === 'All' || c.requester === filterPerson;
    const matchesProcess = filterProcess === 'All' || c.processName === filterProcess;
    const matchesMachine = filterMachine === 'All' || c.machineNo === filterMachine;
    
    let matchesStatus = true;
    if (filterStatus !== 'All') {
      const dispStatus = getRequestDisplayStatus(c);
      if (filterStatus === 'Approved') matchesStatus = dispStatus === 'Approved';
      else if (filterStatus === 'Completed') matchesStatus = dispStatus === 'Closed';
      else if (filterStatus === 'Rejected') matchesStatus = dispStatus === 'Rejected';
      else if (filterStatus === 'Evaluating') matchesStatus = dispStatus === 'Pending L2';
      else if (filterStatus === 'Pending') matchesStatus = dispStatus === 'Pending L1 HOD';
      else matchesStatus = false;
    }

    return matchesMonth && matchesFromDate && matchesToDate && matchesPerson && matchesProcess && matchesMachine && matchesStatus;
  });

  // Extract all improvement data rows
  const costSavingRows = [];
  const productivityRows = [];
  const qualityRows = [];

  filteredChanges.forEach(c => {
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

  const formattedDbChanges = filteredChanges.map((c, idx) => {
    const displayDate = formatDateToDDMMYY(c.date);
    const displayStatus = getRequestDisplayStatus(c);

    return {
      slNo: idx + 1,
      id: c.id,
      machineNo: c.machineNo || '',
      department: c.dept || c.department || 'PRODUCTION',
      date: displayDate,
      status: displayStatus
    };
  });

  const totalCount = filteredChanges.length;
  const approvedCount = formattedDbChanges.filter(c => c.status === 'Approved' || c.status === 'Closed').length;
  const pendingCount = formattedDbChanges.filter(c => c.status === 'Pending L1 HOD' || c.status === 'Pending L2').length;
  const rejectedCount = formattedDbChanges.filter(c => c.status === 'Rejected').length;

  const allTableRows = formattedDbChanges;
  const paginatedTableRows = allTableRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleExportPDF = () => {
    exportDashboardRequestsPDF(filteredChanges, {
      month: filterMonth,
      fromDate: filterFromDate,
      toDate: filterToDate,
      person: filterPerson,
      process: filterProcess,
      machine: filterMachine,
      status: filterStatus
    }, setToastMsg);
  };

  const handleExportSpecificTab = (tabName) => {
    const filtersInfo = {
      month: filterMonth,
      fromDate: filterFromDate,
      toDate: filterToDate,
      person: filterPerson,
      process: filterProcess,
      machine: filterMachine,
      status: filterStatus
    };

    if (tabName === 'Department') {
      exportDepartmentAnalyticsPDF(filteredChanges, filtersInfo, setToastMsg);
    } else if (tabName === 'Process') {
      exportProcessAnalyticsPDF(filteredChanges, filtersInfo, setToastMsg);
    } else if (tabName === '6M Category') {
      exportCategoryAnalyticsPDF(filteredChanges, filtersInfo, setToastMsg);
    } else if (tabName === 'Monthly') {
      exportMonthlyAnalyticsPDF(filteredChanges, filtersInfo, setToastMsg);
    } else if (tabName === 'Approval Status') {
      exportApprovalStatusAnalyticsPDF(filteredChanges, filtersInfo, setToastMsg);
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
  const renderFilters = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-[8px] p-[12px] bg-slate-50/50 border-y border-slate-100 text-[10px]">
      <div className="space-y-[2px]">
        <label className="block font-bold text-slate-400 uppercase tracking-wider">By Month</label>
        <select
          className="w-full px-[6px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
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
          value={filterFromDate}
          onChange={setFilterFromDate}
          inputClassName="w-full pl-[6px] pr-[24px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none placeholder-slate-350 text-slate-500"
          buttonClassName="right-[6px] top-[50%] -translate-y-1/2"
        />
      </div>
      <div className="space-y-[2px]">
        <label className="block font-bold text-slate-400 uppercase tracking-wider">To Date</label>
        <CustomDatePicker
          value={filterToDate}
          onChange={setFilterToDate}
          inputClassName="w-full pl-[6px] pr-[24px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none placeholder-slate-355 text-slate-500"
          buttonClassName="right-[6px] top-[50%] -translate-y-1/2"
        />
      </div>
      <div className="space-y-[2px]">
        <label className="block font-bold text-slate-400 uppercase tracking-wider">By Person</label>
        <select
          className="w-full px-[6px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none"
          value={filterPerson}
          onChange={(e) => setFilterPerson(e.target.value)}
        >
          {uniquePersons.map(p => (
            <option key={p} value={p}>{p === 'All' ? 'All Persons' : p.split('@')[0]}</option>
          ))}
        </select>
      </div>
      <div className="space-y-[2px]">
        <label className="block font-bold text-slate-400 uppercase tracking-wider">By Process</label>
        <select
          className="w-full px-[6px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none"
          value={filterProcess}
          onChange={(e) => setFilterProcess(e.target.value)}
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
          value={filterMachine}
          onChange={(e) => setFilterMachine(e.target.value)}
        >
          {uniqueMachines.map(m => (
            <option key={m} value={m}>{m === 'All' ? 'All Machines' : m}</option>
          ))}
        </select>
      </div>
    </div>
  );

  const renderStatusFilters = () => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-[8px] p-[12px] bg-slate-50/50 border-y border-slate-100 text-[10px]">
      <div className="space-y-[2px]">
        <label className="block font-bold text-slate-400 uppercase tracking-wider">By Month</label>
        <select
          className="w-full px-[6px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
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
          value={filterFromDate}
          onChange={setFilterFromDate}
          inputClassName="w-full pl-[6px] pr-[24px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none placeholder-slate-350 text-slate-500"
          buttonClassName="right-[6px] top-[50%] -translate-y-1/2"
        />
      </div>
      <div className="space-y-[2px]">
        <label className="block font-bold text-slate-400 uppercase tracking-wider">To Date</label>
        <CustomDatePicker
          value={filterToDate}
          onChange={setFilterToDate}
          inputClassName="w-full pl-[6px] pr-[24px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none placeholder-slate-355 text-slate-500"
          buttonClassName="right-[6px] top-[50%] -translate-y-1/2"
        />
      </div>
      <div className="space-y-[2px]">
        <label className="block font-bold text-slate-400 uppercase tracking-wider">By Status</label>
        <select
          className="w-full px-[6px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="Approved">Approved</option>
          <option value="Pending">Pending</option>
          <option value="Evaluating">Evaluating</option>
          <option value="Rejected">Rejected</option>
          <option value="Completed">Completed</option>
        </select>
      </div>
    </div>
  );

  // Reusable Chart Renderers
  const renderDepartmentChart = (height = 'h-[160px]') => {
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

    filteredChanges.forEach(c => {
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
            <div key={idx} className="flex flex-col items-center w-[9%] group">
              <span className="text-[10px] font-bold text-slate-600 mb-[4px]">{item.value}</span>
              <div
                className="w-full bg-[#1e60aa] hover:bg-[#1a5292] transition-all rounded-t-[2px]"
                style={{ height: `${barHeight}%`, minHeight: '4px' }}
              />
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

  const renderProcessChart = (height = 'h-[160px]') => {
    const counts = {
      'Wind': 0,
      'Gold': 0,
      'EOL': 0,
      'Pott': 0,
      'Load': 0
    };

    filteredChanges.forEach(c => {
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
            <div key={idx} className="flex flex-col items-center w-[12%] group">
              <span className="text-[10px] font-bold text-slate-600 mb-[4px]">{item.value}</span>
              <div
                className="w-full bg-[#2e7d32] hover:bg-[#1b5e20] transition-all rounded-t-[2px]"
                style={{ height: `${barHeight}%`, minHeight: '4px' }}
              />
              <span className="text-[8px] font-bold text-slate-400 mt-[6px] whitespace-nowrap uppercase tracking-wider text-center">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderCategoryChart = (height = 'h-[160px]') => {
    const counts = {
      'Man': 0,
      'Mac': 0,
      'Met': 0,
      'Mat': 0,
      'Mea': 0,
      'Mot': 0
    };

    filteredChanges.forEach(c => {
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
            <div key={idx} className="flex flex-col items-center w-[12%] group">
              <span className="text-[10px] font-bold text-slate-600 mb-[4px]">{item.value}</span>
              <div
                className="w-full transition-all rounded-t-[2px]"
                style={{ height: `${barHeight}%`, minHeight: '4px', backgroundColor: item.color }}
              />
              <span className="text-[8px] font-bold text-slate-400 mt-[6px] whitespace-nowrap uppercase tracking-wider text-center">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthlyChart = (height = 'h-[160px]') => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const counts = Array(12).fill(0);

    filteredChanges.forEach(c => {
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
            <div key={idx} className="flex flex-col items-center w-[7%] group">
              <span className="text-[10px] font-bold text-slate-600 mb-[4px]">{item.value}</span>
              <div
                className="w-full bg-[#1e60aa] hover:bg-[#1a5292] transition-all rounded-t-[2px]"
                style={{ height: `${barHeight}%`, minHeight: '4px' }}
              />
              <span className="text-[8px] font-bold text-slate-400 mt-[6px] whitespace-nowrap uppercase tracking-wider text-center">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderApprovalStatusChart = (height = 'h-[180px]') => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dataMap = months.map(m => ({ label: m, appr: 0, rej: 0, pend: 0 }));

    filteredChanges.forEach(c => {
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
            <div key={idx} className="flex flex-col items-center w-[7%] group">
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
                        <div
                          className="w-8 bg-gradient-to-t from-[#154a85] to-[#1e60aa] hover:from-[#1a5292] hover:to-[#226ec2] transition-all rounded-t-[3px] shadow-sm cursor-pointer"
                          style={{ height: `${Math.max(pct, 4)}%` }}
                        />
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
                            className="w-5 bg-slate-350 hover:bg-slate-400 transition-all rounded-t-[2px] shadow-sm cursor-pointer"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[20px]">
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
            {activeAnalyticsTab === 'Approval Status' ? renderStatusFilters() : renderFilters()}

            {/* Render selected chart */}
            {activeAnalyticsTab === 'Department' && renderDepartmentChart()}
            {activeAnalyticsTab === 'Process' && renderProcessChart()}
            {activeAnalyticsTab === '6M Category' && renderCategoryChart()}
            {activeAnalyticsTab === 'Monthly' && renderMonthlyChart()}
            {activeAnalyticsTab === 'Approval Status' && renderApprovalStatusChart()}
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
                {renderFilters()}
                {renderDepartmentChart('h-[140px]')}
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
                {renderFilters()}
                {renderProcessChart('h-[140px]')}
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
                {renderFilters()}
                {renderCategoryChart('h-[140px]')}
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
                {renderFilters()}
                {renderMonthlyChart('h-[140px]')}
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
              {renderStatusFilters()}
              {renderApprovalStatusChart('h-[180px]')}
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
              {renderFilters()}
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
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer font-sans"
            title="Export filtered dashboard requests to PDF"
          >
            <Download size={12} />
            <span>Export PDF</span>
          </button>
        </div>


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
                      <td className="p-[16px] text-[12px] font-bold text-[#0066cc] hover:underline cursor-pointer">{r.id}</td>
                      <td className="p-[16px] text-[12px] text-slate-600 font-medium">{r.machineNo}</td>
                      <td className="p-[16px] text-[12px] text-slate-600 font-medium">{r.department}</td>
                      <td className="p-[16px] text-[12px] text-slate-500">{r.date}</td>
                      <td className="p-[16px]">
                        <span className={`inline-flex items-center gap-[4px] px-[10px] py-[2px] rounded-full text-[11px] font-semibold border ${r.status === 'Pending L2' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                            r.status === 'Pending L1 HOD' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                            r.status === 'Approved' ? 'bg-emerald-50 border-emerald-250 text-emerald-700' :
                              r.status === 'Rejected' ? 'bg-rose-50 border-rose-250 text-rose-700' :
                                'bg-teal-50 border-teal-200 text-teal-700'
                          }`}>
                          {r.status}
                        </span>
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
    </div>
  );
};
