import { useState, useEffect } from 'react';
import { ClipboardList, Eye, X, Loader2, AlertTriangle, Paperclip, Folder, Cpu, Clock, CheckCircle2, FileText, Calendar, Download } from 'lucide-react';
import TablePagination from '@mui/material/TablePagination';
import { formatDateToDDMMYY, parseDDMMYYYYToDate, formatDateToDDMMYYYY } from '../../utils/dateUtils';
import { getSyncedDate } from '../../utils/timeSync';
import { CustomDatePicker } from '../ui/CustomDatePicker';
import { getL1Details, getL1Attachment, getL2Details, getL2Attachment, getL3Approvals } from '../../api/apiRoutes';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const AllRequests = ({
  changes,
  onTabChange,
  setToastMsg
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

  // Details Modal States
  const [selectedLog, setSelectedLog] = useState(null);
  const [selectedL1Details, setSelectedL1Details] = useState(null);
  const [selectedL2Details, setSelectedL2Details] = useState(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('l1');
  const [previewFile, setPreviewFile] = useState(null);
  const [fileUrls, setFileUrls] = useState({});

  // Reset page when any filter changes
  useEffect(() => {
    setPage(0);
  }, [searchQuery, selectedMonth, fromDate, toDate, selectedPerson, selectedProcess, selectedMachine]);

  const monthsList = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const currentYearShort = String(getSyncedDate().getFullYear()).slice(-2);
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

  // Load details handler
  const handleViewDetails = async (request) => {
    setIsFetchingDetails(true);
    try {
      const [l1Res, l2Res, l3Res] = await Promise.all([
        getL1Details(request.id),
        getL2Details(request.id).catch(() => ({ data: null })),
        getL3Approvals().catch(() => ({ data: [] }))
      ]);

      setSelectedL1Details(l1Res.data);
      setSelectedL2Details(l2Res.data);

      const matchedL3 = l3Res.data?.find(log => log.changeNo === request.id);
      setSelectedLog(matchedL3 || {
        changeNo: request.id,
        requester: request.requester,
        date: request.rawDate,
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

      setActiveTab('l1');
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

  const handleExportPDF = () => {
    try {
      if (filteredData.length === 0) {
        setToastMsg?.('No data available to export.');
        return;
      }

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4'
      });

      // Headers for A4 Landscape Table
      const headers = [['SL. NO.', 'CHANGE NO.', 'MACHINE NO.', 'DEPARTMENT', 'PROCESS NAME', 'REQUESTER', 'REQUEST DATE', 'STATUS']];

      // Format row values from filteredData
      const tableData = filteredData.map((item, idx) => [
        idx + 1,
        item.id,
        item.machineNo,
        item.department,
        item.processName,
        item.requester ? item.requester.split('@')[0] : '-',
        item.date,
        item.status
      ]);

      // Title & Branding (Blue theme)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(0, 102, 204); // #0066cc
      doc.text('4M Change Management System', 40, 45);

      // Metadata details
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text(`Exported Date: ${formatDateToDDMMYYYY(getSyncedDate())}`, 40, 60);

      const filterParts = [];
      if (searchQuery) filterParts.push(`Search: "${searchQuery}"`);
      if (selectedMonth !== 'All') filterParts.push(`Month: "${selectedMonth}"`);
      if (fromDate) filterParts.push(`From: "${fromDate}"`);
      if (toDate) filterParts.push(`To: "${toDate}"`);
      if (selectedPerson !== 'All') filterParts.push(`Person: "${selectedPerson.split('@')[0]}"`);
      if (selectedProcess !== 'All') filterParts.push(`Process: "${selectedProcess}"`);
      if (selectedMachine !== 'All') filterParts.push(`Machine: "${selectedMachine}"`);

      const filterText = filterParts.length > 0 
        ? `Active Filters -> ${filterParts.join(', ')}`
        : 'Active Filters -> None';

      doc.text(filterText, 40, 75);

      // AutoTable generator
      autoTable(doc, {
        startY: 90,
        head: headers,
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [0, 102, 204],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'left'
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [51, 65, 85] // Slate-700
        },
        columnStyles: {
          0: { cellWidth: 50 },  // SL. NO.
          1: { cellWidth: 90, fontStyle: 'bold' },  // CHANGE NO.
          2: { cellWidth: 90 },  // MACHINE NO.
          3: { cellWidth: 110 }, // DEPARTMENT
          4: { cellWidth: 120 }, // PROCESS NAME
          5: { cellWidth: 110 }, // REQUESTER
          6: { cellWidth: 90 },  // REQUEST DATE
          7: { cellWidth: 100 }  // STATUS
        },
        margin: { top: 40, bottom: 40, left: 40, right: 40 },
        didDrawPage: (data) => {
          // Footer
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184); // Slate-400
          doc.text(`Page ${data.pageNumber} of ${pageCount}`, doc.internal.pageSize.width - 80, doc.internal.pageSize.height - 20);
          doc.text('NIPPON QUALITY ASSURANCE - CONFIDENTIAL', 40, doc.internal.pageSize.height - 20);
        }
      });

      doc.save(`4M_Change_Requests_${formatDateToDDMMYYYY(getSyncedDate()).replace(/\//g, '-')}.pdf`);
      setToastMsg?.('PDF exported successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      setToastMsg?.('Error generating PDF export.');
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
          <table className="w-full text-left border-collapse table-fixed min-w-[880px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150">
                <th className="p-[16px] text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[80px]">SL. NO.</th>
                <th className="p-[16px] text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[150px]">CHANGE NO.</th>
                <th className="p-[16px] text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[130px]">MACHINE NO.</th>
                <th className="p-[16px] text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[150px]">DEPARTMENT</th>
                <th className="p-[16px] text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[140px]">REQUEST DATE</th>
                <th className="p-[16px] text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[130px]">STATUS</th>
                <th className="p-[16px] text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center w-[100px]">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-[48px] text-slate-400 text-[14px]">
                    No matching change requests found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-[16px] text-[12px] text-slate-500 font-semibold">{page * rowsPerPage + idx + 1}</td>
                    <td className="p-[16px] text-[12px] font-bold text-[#0066cc] hover:underline cursor-pointer" onClick={() => handleViewDetails(r)}>{r.id}</td>
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
                className="p-[6px] hover:bg-slate-200/60 rounded-full text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
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
                3. L3 Approval Matrix
              </button>
            </div>

            {/* Content */}
            <div className="p-[24px] overflow-y-auto space-y-[24px] text-[13px] text-slate-600 flex-1">
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
                            selectedL1Details.crStatus === 'Approved' 
                              ? 'bg-emerald-50 border-emerald-220 text-emerald-700' 
                              : 'bg-amber-50 border-amber-220 text-amber-700'
                          }`}>
                            L1 {selectedL1Details.crStatus}
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
                          let tableData = [];
                          try {
                            tableData = JSON.parse(selectedL1Details.improvement_table_data);
                          } catch (e) {
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
                            L2 {selectedL2Details.status || 'Pending'}
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
            </div>

            {/* Footer */}
            <div className="px-[24px] py-[16px] bg-slate-50 border-t border-slate-200 flex justify-end">
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

      {/* Loading spinner for details */}
      {isFetchingDetails && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xl flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-[#0066cc]" size={32} />
            <span className="text-sm font-semibold text-slate-700">Loading Change Request details...</span>
          </div>
        </div>
      )}

      {/* Attachment Preview Modal */}
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
                className="text-slate-400 hover:text-slate-650 p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer"
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
