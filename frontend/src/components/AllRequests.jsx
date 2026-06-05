import { useState, useEffect } from 'react';
import { ClipboardList, Plus, X, Trash2, AlertTriangle } from 'lucide-react';
import TablePagination from '@mui/material/TablePagination';
import { getProcesses, addProcess, deleteProcess, getMachines, addMachine, deleteMachine } from '../api/apiRoutes';
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

  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [tempProcessName, setTempProcessName] = useState('');
  const [tempMachineNo, setTempMachineNo] = useState('');
  const [itemToDelete, setItemToDelete] = useState(null);
  
  const [dbProcesses, setDbProcesses] = useState([]);
  const [dbMachines, setDbMachines] = useState([]);

  useEffect(() => {
    fetchOptions();
  }, []);

  async function fetchOptions() {
    try {
      const [pRes, mRes] = await Promise.all([
        getProcesses(),
        getMachines()
      ]);
      setDbProcesses(pRes.data);
      setDbMachines(mRes.data);
    } catch (e) {
      console.error('Error fetching options:', e);
    }
  };

  const handleAddProcess = async () => {
    if (tempProcessName.trim()) {
      try {
        await addProcess(tempProcessName.trim());
        setTempProcessName('');
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
        if (selectedProcess === itemToDelete.name) setSelectedProcess('All');
      } else {
        await deleteMachine(itemToDelete.name);
        if (selectedMachine === itemToDelete.name) setSelectedMachine('All');
      }
      fetchOptions();
    } catch (err) {
      console.error('Error deleting:', err);
    } finally {
      setItemToDelete(null);
    }
  };
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
  const filterProcesses = ['All', ...new Set([...dbProcesses, ...combinedData.map(i => i.processName).filter(Boolean)])];
  const filterMachines = ['All', ...new Set([...dbMachines, ...combinedData.map(i => i.machineNo).filter(Boolean)])];

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
          <div className="flex gap-[4px]">
            <select 
              className="flex-1 px-[8px] py-[6px] border border-slate-200 rounded-[4px] bg-white outline-none text-[11px]"
              value={selectedProcess}
              onChange={(e) => setSelectedProcess(e.target.value)}
            >
              {filterProcesses.map(p => (
                <option key={p} value={p}>{p === 'All' ? 'All Processes' : p}</option>
              ))}
            </select>
            <button 
              type="button"
              onClick={() => {
                setTempProcessName('');
                setIsProcessModalOpen(true);
              }}
              className="flex items-center justify-center w-[28px] bg-white border border-slate-200 rounded-[4px] text-slate-500 hover:bg-slate-50 hover:text-[#0066cc] transition-colors"
              title="View DB & Add Process Filter"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* BY M/C NO */}
        <div className="flex-1 min-w-[150px] space-y-[4px]">
          <label className="block font-bold text-slate-400 uppercase tracking-wider">By M/C No</label>
          <div className="flex gap-[4px]">
            <select 
              className="flex-1 px-[8px] py-[6px] border border-slate-200 rounded-[4px] bg-white outline-none text-[11px]"
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
            >
              {filterMachines.map(m => (
                <option key={m} value={m}>{m === 'All' ? 'All Machines' : m}</option>
              ))}
            </select>
            <button 
              type="button"
              onClick={() => {
                setTempMachineNo('');
                setIsMachineModalOpen(true);
              }}
              className="flex items-center justify-center w-[28px] bg-white border border-slate-200 rounded-[4px] text-slate-500 hover:bg-slate-50 hover:text-[#0066cc] transition-colors"
              title="View DB & Add Machine Filter"
            >
              <Plus size={14} />
            </button>
          </div>
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

      {/* Process Modal */}
      {isProcessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-[16px]">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsProcessModalOpen(false)} />
          <div className="relative bg-white w-full max-w-[400px] rounded-[16px] shadow-2xl border border-slate-200 flex flex-col z-10 max-h-[80vh]">
            <div className="bg-slate-50 px-[20px] py-[14px] border-b border-slate-100 flex items-center justify-between rounded-t-[16px]">
              <h4 className="text-[14px] font-bold text-slate-800">Process Filters in DB</h4>
              <button onClick={() => setIsProcessModalOpen(false)} className="p-[4px] hover:bg-slate-200/60 rounded-full text-slate-400 hover:text-slate-650 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-[20px] overflow-y-auto space-y-[16px]">
              <div className="space-y-[4px]">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search / Add Filter</label>
                <div className="flex gap-[8px]">
                  <input 
                    type="text" 
                    placeholder="Enter process name..." 
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
                          setSelectedProcess(p);
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
                  <p className="text-[12px] text-slate-400">No existing processes found.</p>
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
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search / Add Filter</label>
                <div className="flex gap-[8px]">
                  <input 
                    type="text" 
                    placeholder="Enter machine no..." 
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
                          setTempMachineNo('');
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
                          setSelectedMachine(m);
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
                  <p className="text-[12px] text-slate-400">No existing machines found.</p>
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
