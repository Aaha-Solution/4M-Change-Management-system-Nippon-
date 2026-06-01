import { useState } from 'react';
import { ClipboardList, Search } from 'lucide-react';

export const AllRequests = ({
  changes,
  onTabChange
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedPerson, setSelectedPerson] = useState('All');
  const [selectedProcess, setSelectedProcess] = useState('All');
  const [selectedMachine, setSelectedMachine] = useState('All');

  const defaultRequests = [
    { id: '4M-2026-100', machineNo: 'MFG-MC-1042', department: 'PRODUCTION', date: '14/08/2026', status: 'Rejected', requester: 'kumar.s@plant.com' },
    { id: '4M-2026-101', machineNo: 'MFG-MC-0882', department: 'PRODUCTION', date: '19/06/2026', status: 'Approved', requester: 'priya.v@plant.com' },
    { id: '4M-2026-102', machineNo: 'MFG-MC-0015', department: 'MAINTENANCE', date: '09/04/2026', status: 'Approved', requester: 'ravi.qa@plant.com' },
    { id: '4M-2026-103', machineNo: 'MFG-MC-1042', department: 'HR', date: '08/03/2026', status: 'Approved', requester: 'ramanan.p@plant.com' },
    { id: '4M-2026-104', machineNo: 'MFG-MC-1042', department: 'QAD', date: '04/02/2026', status: 'Pending', requester: 'priya.v@plant.com' },
    { id: '4M-2026-105', machineNo: 'MFG-MC-1042', department: 'MATERIALS', date: '20/12/2026', status: 'Pending', requester: 'kumar.s@plant.com' },
    { id: '4M-2026-106', machineNo: 'MFG-MC-1042', department: 'HR', date: '03/11/2026', status: 'Rejected', requester: 'ramanan.p@plant.com' },
    { id: '4M-2026-107', machineNo: 'MFG-MC-0882', department: 'SAFETY', date: '19/10/2026', status: 'Pending', requester: 'ravi.qa@plant.com' },
    { id: '4M-2026-108', machineNo: 'MFG-MC-0002', department: 'HR', date: '06/01/2026', status: 'Approved', requester: 'kumar.s@plant.com' },
    { id: '4M-2026-109', machineNo: 'MFG-MC-1042', department: 'MAINTENANCE', date: '05/02/2026', status: 'Pending', requester: 'priya.v@plant.com' },
    { id: '4M-2026-110', machineNo: 'MFG-MC-0711', department: 'SAFETY', date: '08/05/2026', status: 'Approved', requester: 'ramanan.p@plant.com' },
    { id: '4M-2026-111', machineNo: 'MFG-MC-0711', department: 'SAFETY', date: '24/09/2026', status: 'Rejected', requester: 'ravi.qa@plant.com' },
    { id: '4M-2026-112', machineNo: 'MFG-MC-0711', department: 'HR', date: '13/10/2026', status: 'Approved', requester: 'kumar.s@plant.com' },
    { id: '4M-2026-113', machineNo: 'MFG-MC-0711', department: 'MAINTENANCE', date: '01/03/2026', status: 'Approved', requester: 'priya.v@plant.com' },
    { id: '4M-2026-114', machineNo: 'MFG-MC-0711', department: 'HR', date: '26/04/2026', status: 'Approved', requester: 'ramanan.p@plant.com' },
    { id: '4M-2026-115', machineNo: 'MFG-MC-0015', department: 'SAFETY', date: '01/04/2026', status: 'Approved', requester: 'ravi.qa@plant.com' },
    { id: '4M-2026-116', machineNo: 'MFG-MC-0015', department: 'SAFETY', date: '26/07/2026', status: 'Rejected', requester: 'kumar.s@plant.com' },
    { id: '4M-2026-117', machineNo: 'MFG-MC-0882', department: 'QAD', date: '06/11/2026', status: 'Pending', requester: 'priya.v@plant.com' },
    { id: '4M-2026-118', machineNo: 'MFG-MC-1042', department: 'PRODUCTION', date: '13/08/2026', status: 'Approved', requester: 'ramanan.p@plant.com' },
    { id: '4M-2026-119', machineNo: 'MFG-MC-1042', department: 'PC & L', date: '03/01/2026', status: 'Approved', requester: 'ravi.qa@plant.com' }
  ];

  const formattedDbChanges = changes.map((c) => {
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
    if (c.status === 'Completed' || c.status === 'Evaluating') displayStatus = 'Pending';

    return {
      id: c.id,
      machineNo: 'MFG-MC-1042',
      department: 'PRODUCTION',
      date: displayDate,
      status: displayStatus,
      requester: c.requester,
      title: c.title
    };
  });

  const combinedData = [...formattedDbChanges, ...defaultRequests];

  // Get unique filter options
  const uniquePersons = ['All', ...new Set(combinedData.map(i => i.requester).filter(Boolean))];
  const uniqueProcesses = ['All', ...new Set(combinedData.map(i => i.department).filter(Boolean))];
  const uniqueMachines = ['All', ...new Set(combinedData.map(i => i.machineNo).filter(Boolean))];

  // Apply filters
  const filteredData = combinedData.filter(item => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || 
      item.id.toLowerCase().includes(query) ||
      (item.department && item.department.toLowerCase().includes(query)) ||
      (item.machineNo && item.machineNo.toLowerCase().includes(query)) ||
      (item.requester && item.requester.toLowerCase().includes(query));

    const matchesPerson = selectedPerson === 'All' || item.requester === selectedPerson;
    const matchesProcess = selectedProcess === 'All' || item.department === selectedProcess;
    const matchesMachine = selectedMachine === 'All' || item.machineNo === selectedMachine;

    return matchesSearch && matchesPerson && matchesProcess && matchesMachine;
  });

  return (
    <div className="space-y-[20px] animate-fade-in-up">
      {/* Search and Filters row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-[8px] p-[16px] bg-white border border-slate-200 rounded-[12px] shadow-sm text-[10px]">
        {/* SEARCH QUERY */}
        <div className="space-y-[4px]">
          <label className="block font-bold text-slate-400 uppercase tracking-wider">Search Query</label>
          <input 
            type="text" 
            placeholder="Search ID, Dept, Person, Category..." 
            className="w-full px-[8px] py-[6px] border border-slate-200 rounded-[4px] bg-white outline-none placeholder-slate-350 text-[11px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* BY MONTH */}
        <div className="space-y-[4px]">
          <label className="block font-bold text-slate-400 uppercase tracking-wider">By Month</label>
          <select 
            className="w-full px-[8px] py-[6px] border border-slate-200 rounded-[4px] bg-white outline-none text-[11px]"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="All">All Months</option>
          </select>
        </div>

        {/* FROM DATE */}
        <div className="space-y-[4px]">
          <label className="block font-bold text-slate-400 uppercase tracking-wider">From Date</label>
          <input 
            type="text" 
            placeholder="dd/mm/yyyy" 
            className="w-full px-[8px] py-[6px] border border-slate-200 rounded-[4px] bg-white outline-none placeholder-slate-300 text-[11px]" 
          />
        </div>

        {/* TO DATE */}
        <div className="space-y-[4px]">
          <label className="block font-bold text-slate-400 uppercase tracking-wider">To Date</label>
          <input 
            type="text" 
            placeholder="dd/mm/yyyy" 
            className="w-full px-[8px] py-[6px] border border-slate-200 rounded-[4px] bg-white outline-none placeholder-slate-300 text-[11px]" 
          />
        </div>

        {/* BY PERSON */}
        <div className="space-y-[4px]">
          <label className="block font-bold text-slate-400 uppercase tracking-wider">By Person</label>
          <select 
            className="w-full px-[8px] py-[6px] border border-slate-200 rounded-[4px] bg-white outline-none text-[11px]"
            value={selectedPerson}
            onChange={(e) => setSelectedPerson(e.target.value)}
          >
            {uniquePersons.map(p => (
              <option key={p} value={p}>{p === 'All' ? 'All Persons' : p.split('@')[0]}</option>
            ))}
          </select>
        </div>

        {/* BY PROCESS */}
        <div className="space-y-[4px]">
          <label className="block font-bold text-slate-400 uppercase tracking-wider">By Process</label>
          <select 
            className="w-full px-[8px] py-[6px] border border-slate-200 rounded-[4px] bg-white outline-none text-[11px]"
            value={selectedProcess}
            onChange={(e) => setSelectedProcess(e.target.value)}
          >
            {uniqueProcesses.map(p => (
              <option key={p} value={p}>{p === 'All' ? 'All Processes' : p}</option>
            ))}
          </select>
        </div>

        {/* BY M/C NO */}
        <div className="space-y-[4px]">
          <label className="block font-bold text-slate-400 uppercase tracking-wider">By M/C No</label>
          <select 
            className="w-full px-[8px] py-[6px] border border-slate-200 rounded-[4px] bg-white outline-none text-[11px]"
            value={selectedMachine}
            onChange={(e) => setSelectedMachine(e.target.value)}
          >
            {uniqueMachines.map(m => (
              <option key={m} value={m}>{m === 'All' ? 'All Machines' : m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main requests Table card */}
      <div className="bg-white border border-slate-200 rounded-[12px] shadow-sm overflow-hidden">
        <div className="p-[20px] border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-[8px]">
            <h3 className="font-heading text-[18px] font-bold text-slate-900">All change requests</h3>
            <ClipboardList size={18} className="text-slate-400" />
          </div>
          {/* Showing results count */}
          <span className="bg-slate-100 border border-slate-200 text-slate-500 rounded-full px-[10px] py-[2px] text-[10px] font-bold select-none">
            Showing {filteredData.length} of {combinedData.length}
          </span>
        </div>

        <div className="overflow-x-auto">
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
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-[48px] text-slate-400 text-[14px]">
                    No matching change requests found.
                  </td>
                </tr>
              ) : (
                filteredData.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-[16px] text-[12px] text-slate-500 font-semibold">{idx + 1}</td>
                    <td className="p-[16px] text-[12px] font-bold text-[#0066cc] hover:underline cursor-pointer">{r.id}</td>
                    <td className="p-[16px] text-[12px] text-slate-600 font-medium">{r.machineNo}</td>
                    <td className="p-[16px] text-[12px] text-slate-600 font-medium">{r.department}</td>
                    <td className="p-[16px] text-[12px] text-slate-500">{r.date}</td>
                    <td className="p-[16px]">
                      <span className={`inline-flex items-center gap-[4px] px-[10px] py-[2px] rounded-full text-[11px] font-semibold border ${
                        r.status === 'Pending' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                        r.status === 'Approved' ? 'bg-emerald-50 border-emerald-250 text-emerald-700' :
                        'bg-rose-50 border-rose-250 text-rose-700'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
