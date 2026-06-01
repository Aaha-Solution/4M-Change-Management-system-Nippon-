import { useState } from 'react';
import { 
  Clock, 
  Zap, 
  CheckCircle, 
  TrendingUp, 
  Plus, 
  Loader2, 
  BarChart3, 
  LayoutGrid,
  Calendar,
  GitBranch,
  Layers,
  Settings,
  ShieldAlert
} from 'lucide-react';

export const DashboardOverview = ({
  changes,
  isFetchingChanges,
  onTabChange
}) => {
  const [isGridView, setIsGridView] = useState(false);
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState('Department');

  // Compile metrics dynamically based on DB + baseline mock data
  const baseTotal = 6;
  const baseApproved = 6;
  const basePending = 0;
  const baseRejected = 0;

  const dynamicApproved = changes.filter(c => c.status === 'Approved').length;
  const dynamicPending = changes.filter(c => c.status === 'Pending' || c.status === 'Evaluating').length;
  const dynamicRejected = changes.filter(c => c.status === 'Rejected').length;

  const totalCount = changes.length + baseTotal;
  const approvedCount = dynamicApproved + baseApproved;
  const pendingCount = dynamicPending + basePending + 2; // to match pending count 2 from mockup
  const rejectedCount = dynamicRejected + baseRejected;

  const baseTableData = [
    { slNo: 1, id: '4M-2026-248', machineNo: 'MFG-MC-1042', department: 'PED', date: '20/05/2026', status: 'Pending L2' },
    { slNo: 2, id: '4M-2026-247', machineNo: 'MFG-MC-0882', department: 'QAD', date: '19/05/2026', status: 'Approved' },
    { slNo: 4, id: '4M-2026-244', machineNo: 'MFG-MC-0015', department: 'MAINTENANCE', date: '17/05/2026', status: 'Rejected' },
    { slNo: 5, id: '4M-2026-243', machineNo: 'MFG-MC-1042', department: 'PC & L', date: '16/05/2026', status: 'Closed' }
  ];

  const formattedDbChanges = changes.map((c, idx) => {
    let displayDate = c.date;
    try {
      const d = new Date(c.date);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        displayDate = `${day}/${month}/${year}`;
      }
    } catch (e) {}

    let displayStatus = c.status;
    if (c.status === 'Pending' || c.status === 'Evaluating') displayStatus = 'Pending L2';
    if (c.status === 'Completed') displayStatus = 'Closed';

    return {
      slNo: `NEW-${idx + 1}`,
      id: c.id,
      machineNo: 'MFG-MC-1042',
      department: 'PRODUCTION',
      date: displayDate,
      status: displayStatus
    };
  });

  const allTableRows = [...formattedDbChanges, ...baseTableData];

  // Helper filters render
  const renderFilters = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-[8px] p-[12px] bg-slate-50/50 border-y border-slate-100 text-[10px]">
      <div className="space-y-[2px]">
        <label className="block font-bold text-slate-400 uppercase tracking-wider">By Month</label>
        <select className="w-full px-[6px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none">
          <option>All Months</option>
        </select>
      </div>
      <div className="space-y-[2px]">
        <label className="block font-bold text-slate-400 uppercase tracking-wider">From Date</label>
        <input type="text" placeholder="dd/mm/yyyy" className="w-full px-[6px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none placeholder-slate-300" />
      </div>
      <div className="space-y-[2px]">
        <label className="block font-bold text-slate-400 uppercase tracking-wider">To Date</label>
        <input type="text" placeholder="dd/mm/yyyy" className="w-full px-[6px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none placeholder-slate-300" />
      </div>
      <div className="space-y-[2px]">
        <label className="block font-bold text-slate-400 uppercase tracking-wider">By Person</label>
        <select className="w-full px-[6px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none">
          <option>All Persons</option>
        </select>
      </div>
      <div className="space-y-[2px]">
        <label className="block font-bold text-slate-400 uppercase tracking-wider">By Process</label>
        <select className="w-full px-[6px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none">
          <option>All Processes</option>
        </select>
      </div>
      <div className="space-y-[2px]">
        <label className="block font-bold text-slate-400 uppercase tracking-wider">By M/C No</label>
        <select className="w-full px-[6px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none">
          <option>All Machines</option>
        </select>
      </div>
    </div>
  );

  const renderStatusFilters = () => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-[8px] p-[12px] bg-slate-50/50 border-y border-slate-100 text-[10px]">
      <div className="space-y-[2px]">
        <label className="block font-bold text-slate-400 uppercase tracking-wider">By Month</label>
        <select className="w-full px-[6px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none">
          <option>All Months</option>
        </select>
      </div>
      <div className="space-y-[2px]">
        <label className="block font-bold text-slate-400 uppercase tracking-wider">From Date</label>
        <input type="text" placeholder="dd/mm/yyyy" className="w-full px-[6px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none placeholder-slate-300" />
      </div>
      <div className="space-y-[2px]">
        <label className="block font-bold text-slate-400 uppercase tracking-wider">To Date</label>
        <input type="text" placeholder="dd/mm/yyyy" className="w-full px-[6px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none placeholder-slate-300" />
      </div>
      <div className="space-y-[2px]">
        <label className="block font-bold text-slate-400 uppercase tracking-wider">By Status</label>
        <select className="w-full px-[6px] py-[4px] border border-slate-200 rounded-[4px] bg-white outline-none">
          <option>All Statuses</option>
        </select>
      </div>
    </div>
  );

  // Reusable Chart Renderers
  const renderDepartmentChart = (height = 'h-[160px]') => {
    const data = [
      { label: 'PED', value: 9 },
      { label: 'QAD', value: 7 },
      { label: 'PRODUCTION', value: 8 },
      { label: 'MAINTENANCE', value: 5 },
      { label: 'PC & L', value: 11 },
      { label: 'MATERIALS', value: 9 },
      { label: 'MARKETING', value: 7 },
      { label: 'HR', value: 10 },
      { label: 'SAFETY', value: 9 }
    ];
    return (
      <div className={`flex justify-between items-end ${height} px-[10px] mt-[10px]`}>
        {data.map((item, idx) => {
          const barHeight = (item.value / 12) * 100;
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
    const data = [
      { label: 'Wind', value: 10 },
      { label: 'Gold', value: 10 },
      { label: 'EOL', value: 7 },
      { label: 'Pott', value: 14 },
      { label: 'Load', value: 13 }
    ];
    return (
      <div className={`flex justify-around items-end ${height} px-[10px] mt-[10px]`}>
        {data.map((item, idx) => {
          const barHeight = (item.value / 16) * 100;
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
    const data = [
      { label: 'Man', value: 7, color: '#1e60aa' },
      { label: 'Mac', value: 16, color: '#673ab7' },
      { label: 'Met', value: 11, color: '#795548' },
      { label: 'Mat', value: 10, color: '#009688' },
      { label: 'Mea', value: 6, color: '#8bc34a' },
      { label: 'Mot', value: 18, color: '#d32f2f' }
    ];
    return (
      <div className={`flex justify-between items-end ${height} px-[10px] mt-[10px]`}>
        {data.map((item, idx) => {
          const barHeight = (item.value / 20) * 100;
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
    const data = [
      { label: 'Jan', value: 7 },
      { label: 'Feb', value: 8 },
      { label: 'Mar', value: 9 },
      { label: 'Apr', value: 4 },
      { label: 'May', value: 4 },
      { label: 'Jun', value: 10 },
      { label: 'Jul', value: 8 },
      { label: 'Aug', value: 6 },
      { label: 'Sep', value: 5 },
      { label: 'Oct', value: 7 },
      { label: 'Nov', value: 4 },
      { label: 'Dec', value: 3 }
    ];
    return (
      <div className={`flex justify-between items-end ${height} px-[5px] mt-[10px]`}>
        {data.map((item, idx) => {
          const barHeight = (item.value / 12) * 100;
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
    const data = [
      { label: 'Jan', appr: 6, rej: 1, pend: 1 },
      { label: 'Feb', appr: 3, rej: 1, pend: 4 },
      { label: 'Mar', appr: 5, rej: 2, pend: 2 },
      { label: 'Apr', appr: 4, rej: 0, pend: 1 },
      { label: 'May', appr: 2, rej: 2, pend: 0 },
      { label: 'Jun', appr: 7, rej: 2, pend: 1 },
      { label: 'Jul', appr: 3, rej: 2, pend: 1 },
      { label: 'Aug', appr: 4, rej: 1, pend: 1 },
      { label: 'Sep', appr: 2, rej: 2, pend: 2 },
      { label: 'Oct', appr: 3, rej: 3, pend: 0 },
      { label: 'Nov', appr: 1, rej: 2, pend: 0 },
      { label: 'Dec', appr: 2, rej: 0, pend: 1 }
    ];
    return (
      <div className={`flex justify-between items-end ${height} px-[10px] mt-[10px]`}>
        {data.map((item, idx) => {
          const maxVal = 8;
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
