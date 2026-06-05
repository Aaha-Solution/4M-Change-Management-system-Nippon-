import { useState, useEffect } from 'react';
import { ClipboardList } from 'lucide-react';
import TablePagination from '@mui/material/TablePagination';
import { formatDateToDDMMYY, parseDDMMYYYYToDate } from '../utils/dateUtils';
import { CustomDatePicker } from './CustomDatePicker';

export const AllRequests = ({
  changes
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedPerson, setSelectedPerson] = useState('All');
  const [selectedProcess, setSelectedProcess] = useState('All');
  const [selectedMachine, setSelectedMachine] = useState('All');

  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Reset page when any filter changes
  useEffect(() => {
    setPage(0);
  }, [searchQuery, selectedMonth, fromDate, toDate, selectedPerson, selectedProcess, selectedMachine]);

  const monthsList = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const currentYearShort = String(new Date().getFullYear()).slice(-2);
  const monthOptions = monthsList.map(m => `${m}-${currentYearShort}`);


  const formattedDbChanges = changes.map((c) => {
    const displayDate = formatDateToDDMMYY(c.date);

    let displayStatus = c.status;
    if (c.status === 'Pending' || c.status === 'Evaluating') {
      displayStatus = c.l2Status === 'Accepted' ? 'Approved' : 'Pending L2';
    }
    if (c.status === 'Completed') displayStatus = 'Closed';

    return {
      id: c.id,
      machineNo: c.machineNo || '',
      processName: c.processName || '',
      department: c.dept || c.department || 'PRODUCTION',
      date: displayDate,
      status: displayStatus,
      requester: c.requester,
      title: c.title,
      rawDate: c.date
    };
  });

  const combinedData = formattedDbChanges;

  // Get unique filter options
  const uniquePersons = ['All', ...new Set(combinedData.map(i => i.requester).filter(Boolean))];
  const filterProcesses = ['All', ...new Set(combinedData.map(i => i.processName).filter(Boolean))];
  const filterMachines = ['All', ...new Set(combinedData.map(i => i.machineNo).filter(Boolean))];

  // Apply filters
  const filteredData = combinedData.filter(item => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || 
      item.id.toLowerCase().includes(query) ||
      (item.department && item.department.toLowerCase().includes(query)) ||
      (item.machineNo && item.machineNo.toLowerCase().includes(query)) ||
      (item.requester && item.requester.toLowerCase().includes(query));

    const matchesPerson = selectedPerson === 'All' || item.requester === selectedPerson;
    const matchesProcess = selectedProcess === 'All' || item.processName === selectedProcess;
    const matchesMachine = selectedMachine === 'All' || item.machineNo === selectedMachine;

    let matchesMonth = true;
    if (selectedMonth !== 'All') {
      try {
        const [selMonthName, selYearShort] = selectedMonth.split('-');
        const d = new Date(item.rawDate);
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

    return matchesSearch && matchesPerson && matchesProcess && matchesMachine && matchesMonth && matchesFromDate && matchesToDate;
  });

  const paginatedData = filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <div className="space-y-[20px] animate-fade-in-up w-full min-w-0">
      {/* Search and Filters row */}
      <div className="flex flex-wrap gap-[12px] p-[16px] bg-white border border-slate-200 rounded-[12px] shadow-sm text-[10px]">
        {/* SEARCH QUERY */}
        <div className="flex-1 min-w-[200px] space-y-[4px]">
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
            onChange={setFromDate}
            inputClassName="w-full pl-[8px] pr-[24px] py-[6px] border border-slate-200 rounded-[4px] bg-white outline-none placeholder-slate-350 text-[11px] text-slate-500"
            buttonClassName="right-[8px] bottom-[8px]"
          />
        </div>

        {/* TO DATE */}
        <div className="flex-1 min-w-[130px] space-y-[4px] relative">
          <label className="block font-bold text-slate-400 uppercase tracking-wider">To Date</label>
          <CustomDatePicker 
            value={toDate}
            onChange={setToDate}
            inputClassName="w-full pl-[8px] pr-[24px] py-[6px] border border-slate-200 rounded-[4px] bg-white outline-none placeholder-slate-355 text-[11px] text-slate-500"
            buttonClassName="right-[8px] bottom-[8px]"
          />
        </div>

        {/* BY PERSON */}
        <div className="flex-1 min-w-[130px] space-y-[4px]">
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
      </div>

      {/* Main requests Table card */}
      <div className="bg-white border border-slate-200 rounded-[12px] shadow-sm overflow-hidden w-full max-w-full min-w-0">
        <div className="p-[20px] border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-[12px]">
          <div className="flex items-center gap-[8px]">
            <h3 className="font-heading text-[18px] font-bold text-slate-900">All change requests</h3>
            <ClipboardList size={18} className="text-slate-400" />
          </div>
          {/* Showing results count */}
          <span className="bg-slate-100 border border-slate-200 text-slate-500 rounded-full px-[10px] py-[2px] text-[10px] font-bold select-none">
            Showing {filteredData.length} of {combinedData.length}
          </span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse table-fixed min-w-[780px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150">
                <th className="p-[16px] text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[80px]">SL. NO.</th>
                <th className="p-[16px] text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[150px]">CHANGE NO.</th>
                <th className="p-[16px] text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[130px]">MACHINE NO.</th>
                <th className="p-[16px] text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[150px]">DEPARTMENT</th>
                <th className="p-[16px] text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[140px]">REQUEST DATE</th>
                <th className="p-[16px] text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[130px]">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-[48px] text-slate-400 text-[14px]">
                    No matching change requests found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-[16px] text-[12px] text-slate-500 font-semibold">{page * rowsPerPage + idx + 1}</td>
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

    </div>
  );
};
