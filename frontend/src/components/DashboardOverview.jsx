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
  ShieldAlert
} from 'lucide-react';
import { formatDateToDDMMYY, parseDDMMYYYYToDate } from '../utils/dateUtils';
import { CustomDatePicker } from './CustomDatePicker';
import { getProcesses, getMachines } from '../api/apiRoutes';


export const DashboardOverview = ({
  changes,
  isFetchingChanges
}) => {
  const [isGridView, setIsGridView] = useState(false);
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState('Department');

  const [filterMonth, setFilterMonth] = useState('All');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [filterPerson, setFilterPerson] = useState('All');
  const [filterProcess, setFilterProcess] = useState('All');
  const [filterMachine, setFilterMachine] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

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
  const currentYearShort = String(new Date().getFullYear()).slice(-2);
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
        fD.setHours(0,0,0,0);
        const itemD = parseDDMMYYYYToDate(c.date);
        matchesFromDate = itemD && itemD >= fD;
      }
    }

    let matchesToDate = true;
    if (filterToDate) {
      const tD = parseDDMMYYYYToDate(filterToDate);
      if (tD) {
        tD.setHours(23,59,59,999);
        const itemD = parseDDMMYYYYToDate(c.date);
        matchesToDate = itemD && itemD <= tD;
      }
    }

    const matchesPerson = filterPerson === 'All' || c.requester === filterPerson;
    const matchesProcess = filterProcess === 'All' || c.processName === filterProcess;
    const matchesMachine = filterMachine === 'All' || c.machineNo === filterMachine;
    const matchesStatus = filterStatus === 'All' || c.status === filterStatus;

    return matchesMonth && matchesFromDate && matchesToDate && matchesPerson && matchesProcess && matchesMachine && matchesStatus;
  });

  const dynamicApproved = filteredChanges.filter(c => c.status === 'Approved' || ((c.status === 'Pending' || c.status === 'Evaluating') && c.l2Status === 'Accepted')).length;
  const dynamicPending = filteredChanges.filter(c => (c.status === 'Pending' || c.status === 'Evaluating') && c.l2Status !== 'Accepted').length;
  const dynamicRejected = filteredChanges.filter(c => c.status === 'Rejected').length;

  const totalCount = filteredChanges.length;
  const approvedCount = dynamicApproved;
  const pendingCount = dynamicPending;
  const rejectedCount = dynamicRejected;

  const formattedDbChanges = filteredChanges.map((c, idx) => {
    const displayDate = formatDateToDDMMYY(c.date);

    let displayStatus = c.status;
    if (c.status === 'Pending' || c.status === 'Evaluating') {
      displayStatus = c.l2Status === 'Accepted' ? 'Approved' : 'Pending L2';
    }
    if (c.status === 'Completed') displayStatus = 'Closed';

    return {
      slNo: idx + 1,
      id: c.id,
      machineNo: c.machineNo || '',
      department: c.dept || c.department || 'PRODUCTION',
      date: displayDate,
      status: displayStatus
    };
  });

  const allTableRows = formattedDbChanges;

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
      <div className="space-y-[2px] relative">
        <label className="block font-bold text-slate-400 uppercase tracking-wider">From Date</label>
        <CustomDatePicker 
          value={filterFromDate}
          onChange={setFilterFromDate}
          inputClassName="w-full pl-[6px] pr-[24px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none placeholder-slate-350 text-slate-500"
          buttonClassName="right-[6px] bottom-[6px]"
        />
      </div>
      <div className="space-y-[2px] relative">
        <label className="block font-bold text-slate-400 uppercase tracking-wider">To Date</label>
        <CustomDatePicker 
          value={filterToDate}
          onChange={setFilterToDate}
          inputClassName="w-full pl-[6px] pr-[24px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none placeholder-slate-355 text-slate-500"
          buttonClassName="right-[6px] bottom-[6px]"
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
      <div className="space-y-[2px] relative">
        <label className="block font-bold text-slate-400 uppercase tracking-wider">From Date</label>
        <CustomDatePicker 
          value={filterFromDate}
          onChange={setFilterFromDate}
          inputClassName="w-full pl-[6px] pr-[24px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none placeholder-slate-350 text-slate-500"
          buttonClassName="right-[6px] bottom-[6px]"
        />
      </div>
      <div className="space-y-[2px] relative">
        <label className="block font-bold text-slate-400 uppercase tracking-wider">To Date</label>
        <CustomDatePicker 
          value={filterToDate}
          onChange={setFilterToDate}
          inputClassName="w-full pl-[6px] pr-[24px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none placeholder-slate-355 text-slate-500"
          buttonClassName="right-[6px] bottom-[6px]"
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
                {item.label}
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
          const status = c.status;
          if (status === 'Approved') {
            dataMap[monthIdx].appr++;
          } else if (status === 'Rejected') {
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

  return (
    <div className="space-y-[32px] animate-fade-in-up">
      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[20px]">
        {/* Total Requests */}
        <div className="bg-white border border-slate-200/80 rounded-[6px] p-[20px] shadow-sm">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Requests</h4>
          <div className="text-[32px] font-bold text-slate-900 mt-[4px]">
            {isFetchingChanges ? <Loader2 className="animate-spin text-slate-400" size={24} /> : totalCount}
          </div>
        </div>

        {/* Approved */}
        <div className="bg-white border border-slate-200/80 rounded-[6px] p-[20px] shadow-sm">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Approved</h4>
          <div className="text-[32px] font-bold text-emerald-600 mt-[4px]">
            {isFetchingChanges ? <Loader2 className="animate-spin text-slate-400" size={24} /> : approvedCount}
          </div>
        </div>

        {/* Pending Approval */}
        <div className="bg-white border border-slate-200/80 rounded-[6px] p-[20px] shadow-sm">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Approval</h4>
          <div className="text-[32px] font-bold text-amber-600 mt-[4px]">
            {isFetchingChanges ? <Loader2 className="animate-spin text-slate-400" size={24} /> : pendingCount}
          </div>
        </div>

        {/* Rejected */}
        <div className="bg-white border border-slate-200/80 rounded-[6px] p-[20px] shadow-sm">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rejected</h4>
          <div className="text-[32px] font-bold text-rose-600 mt-[4px]">
            {isFetchingChanges ? <Loader2 className="animate-spin text-slate-400" size={24} /> : rejectedCount}
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
              <div className="flex items-center bg-slate-100 p-[4px] rounded-[6px] border border-slate-200">
                {['Department', 'Process', '6M Category', 'Monthly', 'Approval Status'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveAnalyticsTab(tab)}
                    className={`px-[12px] py-[6px] text-[11px] font-bold rounded-[4px] transition-all cursor-pointer ${
                      activeAnalyticsTab === tab
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
          <div className="bg-white border border-slate-200 rounded-[12px] p-[20px] shadow-sm space-y-[20px]">
            <div className="flex items-center justify-between">
              <h4 className="text-[14px] font-bold text-slate-800">
                {activeAnalyticsTab === 'Department' && 'Department Wise Change'}
                {activeAnalyticsTab === 'Process' && 'Process Wise Change'}
                {activeAnalyticsTab === '6M Category' && '6M Category Change'}
                {activeAnalyticsTab === 'Monthly' && 'Monthly Change'}
                {activeAnalyticsTab === 'Approval Status' && 'Overall Change Approval Status'}
              </h4>
            </div>

            {/* Render filter block based on selected analytics tab */}
            {activeAnalyticsTab === 'Approval Status' ? renderStatusFilters() : renderFilters()}

            {/* Render selected chart */}
            {activeAnalyticsTab === 'Department' && renderDepartmentChart()}
            {activeAnalyticsTab === 'Process' && renderProcessChart()}
            {activeAnalyticsTab === '6M Category' && renderCategoryChart()}
            {activeAnalyticsTab === 'Monthly' && renderMonthlyChart()}
            {activeAnalyticsTab === 'Approval Status' && renderApprovalStatusChart()}
          </div>
        ) : (
          /* GRID VIEW (2x2 smaller charts + 1 full-width chart layout) */
          <div className="space-y-[20px]">
            {/* 2x2 Grid of 4 Smaller Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[20px]">
              {/* 1. Department Wise Change */}
              <div className="bg-white border border-slate-200 rounded-[12px] p-[20px] shadow-sm space-y-[16px]">
                <div className="flex items-center justify-between">
                  <h4 className="text-[13px] font-bold text-slate-800">Department Wise Change</h4>
                  <GitBranch size={14} className="text-slate-400" />
                </div>
                {renderFilters()}
                {renderDepartmentChart('h-[140px]')}
              </div>

              {/* 2. Process Wise Change */}
              <div className="bg-white border border-slate-200 rounded-[12px] p-[20px] shadow-sm space-y-[16px]">
                <div className="flex items-center justify-between">
                  <h4 className="text-[13px] font-bold text-slate-800">Process Wise Change</h4>
                  <Settings size={14} className="text-slate-400" />
                </div>
                {renderFilters()}
                {renderProcessChart('h-[140px]')}
              </div>

              {/* 3. 6M Category Change */}
              <div className="bg-white border border-slate-200 rounded-[12px] p-[20px] shadow-sm space-y-[16px]">
                <div className="flex items-center justify-between">
                  <h4 className="text-[13px] font-bold text-slate-800">6M Category Change</h4>
                  <Layers size={14} className="text-slate-400" />
                </div>
                {renderFilters()}
                {renderCategoryChart('h-[140px]')}
              </div>

              {/* 4. Monthly Change */}
              <div className="bg-white border border-slate-200 rounded-[12px] p-[20px] shadow-sm space-y-[16px]">
                <div className="flex items-center justify-between">
                  <h4 className="text-[13px] font-bold text-slate-800">Monthly Change</h4>
                  <Calendar size={14} className="text-slate-400" />
                </div>
                {renderFilters()}
                {renderMonthlyChart('h-[140px]')}
              </div>
            </div>

            {/* 5. Overall Change Approval Status (Full-width Card at bottom of Grid Mode) */}
            <div className="bg-white border border-slate-200 rounded-[12px] p-[20px] shadow-sm space-y-[16px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-[8px]">
                  <h4 className="text-[13px] font-bold text-slate-800">Overall Change Approval Status</h4>
                  <ShieldAlert size={14} className="text-slate-400" />
                </div>
                {/* Legends */}
                <div className="flex items-center gap-[12px] text-[10px] font-bold text-slate-500 select-none">
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
              </div>
              {renderStatusFilters()}
              {renderApprovalStatusChart('h-[180px]')}
            </div>
          </div>
        )}
      </div>

      {/* Recent Change Requests Table */}
      <div className="bg-white border border-slate-200 rounded-[12px] shadow-sm overflow-hidden">
        <div className="p-[20px] border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-heading text-[18px] font-bold text-slate-900">Recent change requests</h3>
          <Clock size={18} className="text-slate-400" />
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
                {allTableRows.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-[16px] text-[12px] text-slate-500 font-semibold">{r.slNo}</td>
                    <td className="p-[16px] text-[12px] font-bold text-[#0066cc] hover:underline cursor-pointer">{r.id}</td>
                    <td className="p-[16px] text-[12px] text-slate-600 font-medium">{r.machineNo}</td>
                    <td className="p-[16px] text-[12px] text-slate-600 font-medium">{r.department}</td>
                    <td className="p-[16px] text-[12px] text-slate-500">{r.date}</td>
                    <td className="p-[16px]">
                      <span className={`inline-flex items-center gap-[4px] px-[10px] py-[2px] rounded-full text-[11px] font-semibold border ${
                        r.status === 'Pending L2' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                        r.status === 'Approved' ? 'bg-emerald-50 border-emerald-250 text-emerald-700' :
                        r.status === 'Rejected' ? 'bg-rose-50 border-rose-250 text-rose-700' :
                        'bg-teal-50 border-teal-200 text-teal-700'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
