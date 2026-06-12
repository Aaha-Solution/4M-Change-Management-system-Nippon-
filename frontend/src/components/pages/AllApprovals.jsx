import { useState, useEffect } from 'react';
import {
  Search,
  Eye,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Filter,
  FileText,
  Paperclip,
  Folder,
  Calendar,
  RefreshCw,
  Building2,
  User,
  Hash,
  ShieldCheck,
  XCircle,
  MessageSquare,
  Download
} from 'lucide-react';
import TablePagination from '@mui/material/TablePagination';
import {
  getHodApprovalsByDept,
  getAllHodApprovals,
  submitHodApproval
} from '../../api/apiRoutes';
import {
  getL1Details,
  getL1Attachment,
  getUsers
} from '../../api/apiRoutes';
import { formatDateToDDMMYYYY } from '../../utils/dateUtils';
import { exportApprovalsListPDF } from '../../utils/pdfExport';

// Map raw DB dept string to display name
const mapDept = (raw) => {
  if (!raw) return '';
  const d = raw.trim().toLowerCase();
  if (d === 'qad' || d === 'quality') return 'Quality';
  if (d === 'ped') return 'PED';
  if (d === 'production') return 'Production';
  if (d === 'maintenance') return 'Maintenance';
  if (d === 'pc & l' || d === 'pcl') return 'PC & L';
  if (d === 'materials') return 'Materials';
  if (d === 'marketing') return 'Marketing';
  if (d === 'hr') return 'HR';
  if (d === 'safety') return 'Safety';
  if (d === 'unit head' || d === 'unit_head') return 'Unit Head';
  return raw;
};

const StatusBadge = ({ status }) => {
  if (!status || status === 'Pending') return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border bg-amber-50 border-amber-200 text-amber-700">
      <Clock size={11} /> Pending
    </span>
  );
  if (status === 'Approved') return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border bg-emerald-50 border-emerald-200 text-emerald-700">
      <CheckCircle2 size={11} /> Approved
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border bg-rose-50 border-rose-200 text-rose-700">
      <XCircle size={11} /> Rejected
    </span>
  );
};

export const AllApprovals = ({
  userEmail,
  userRole,
  userDept,
  setToastMsg,
  logAction,
  fetchChanges,
  autoOpenChangeNo,
  clearAutoOpen
}) => {
  const [requests, setRequests] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actingDept, setActingDept] = useState('');

  // Modal
  const [selectedReq, setSelectedReq] = useState(null);
  const [l1Details, setL1Details] = useState(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [fileUrls, setFileUrls] = useState({});
  const [previewFile, setPreviewFile] = useState(null);

  // Filter & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const isAdmin = userRole && (
    userRole.toLowerCase() === 'admin' ||
    userRole.toLowerCase() === 'administrator'
  );
  const isHOD = userRole && (
    userRole.toLowerCase().includes('hod') ||
    userRole.toLowerCase().includes('manager') ||
    userRole.toLowerCase().includes('unit head')
  );

  useEffect(() => { setPage(0); }, [search, statusFilter]);

  // Resolve acting department from DB user record
  useEffect(() => {
    const resolve = async () => {
      if (!userEmail) return;
      try {
        const res = await getUsers();
        const me = (res.data || []).find(u => u.email.toLowerCase() === userEmail.toLowerCase());
        if (me && me.department) {
          setActingDept(mapDept(me.department));
        } else if (userDept) {
          setActingDept(mapDept(userDept));
        }
      } catch (err) {
        console.error('Error resolving dept:', err);
        if (userDept) setActingDept(mapDept(userDept));
      }
    };
    resolve();
  }, [userEmail, userDept]);

  const fetchRequests = async () => {
    setIsFetching(true);
    try {
      let res;
      if (isAdmin) {
        res = await getAllHodApprovals();
      } else {
        const dept = actingDept || mapDept(userDept) || 'PED';
        res = await getHodApprovalsByDept(dept);
      }
      setRequests(res.data || []);
    } catch (err) {
      console.error(err);
      if (setToastMsg) setToastMsg('Error loading HOD approval requests.');
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (actingDept || isAdmin) fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actingDept, isAdmin]);

  // Auto-open from notification click
  useEffect(() => {
    if (autoOpenChangeNo && requests.length > 0) {
      const req = requests.find(r => r.changeNo === autoOpenChangeNo);
      if (req) {
        handleOpenModal(req);
        if (clearAutoOpen) clearAutoOpen();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenChangeNo, requests]);

  const handleOpenModal = async (req) => {
    setSelectedReq(req);
    setRemarks(req.hodRemarks || '');
    setL1Details(null);
    setIsFetchingDetails(true);
    try {
      const res = await getL1Details(req.changeNo);
      setL1Details(res.data);
    } catch (err) {
      console.error('Error fetching L1 details:', err);
    } finally {
      setIsFetchingDetails(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedReq(null);
    setL1Details(null);
    setRemarks('');
    setPreviewFile(null);
  };

  const handleViewAttachment = async (filename, changeNo) => {
    if (!filename || filename === '-') return;
    setPreviewFile(filename);
    if (!fileUrls[filename]) {
      try {
        const res = await getL1Attachment(changeNo, filename);
        const url = URL.createObjectURL(res.data);
        setFileUrls(prev => ({ ...prev, [filename]: url }));
      } catch (err) {
        console.error('Error loading attachment:', err);
      }
    }
  };

  const renderFilePills = (filenames, changeNo) => {
    if (!filenames) return null;
    return filenames.split(',').map(f => f.trim()).filter(Boolean).map((f, i) => (
      <span
        key={i}
        onClick={() => handleViewAttachment(f, changeNo)}
        className="inline-flex items-center gap-1.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-md py-1 px-2 text-[11px] font-medium text-[#0066cc] cursor-pointer transition-colors"
      >
        <Paperclip size={10} className="text-slate-400" />
        <span className="underline truncate max-w-[160px]">{f}</span>
      </span>
    ));
  };

  const handleDecision = async (status) => {
    if (!selectedReq) return;
    setIsSubmitting(true);
    try {
      await submitHodApproval(selectedReq.changeNo, actingDept, status, remarks);
      if (setToastMsg) setToastMsg(`✅ ${actingDept} HOD approval saved as "${status}" for ${selectedReq.changeNo}`);
      if (logAction) logAction('HOD Approval', `${status} for ${selectedReq.changeNo} by ${actingDept} HOD`);
      await fetchRequests();
      if (fetchChanges) await fetchChanges();
      handleCloseModal();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || 'Failed to save HOD approval.';
      if (setToastMsg) setToastMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter
  const filtered = requests.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r.changeNo.toLowerCase().includes(q) ||
      (r.requestBy || '').toLowerCase().includes(q) ||
      (r.dept || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'All' ||
      (statusFilter === 'Pending' && (!r.hodStatus || r.hodStatus === 'Pending')) ||
      r.hodStatus === statusFilter;
    return matchSearch && matchStatus;
  });
  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleExportPDF = () => {
    exportApprovalsListPDF(filtered, {
      searchQuery: search,
      statusFilter,
      actingDept
    }, setToastMsg);
  };

  // Stats
  const pendingCount = requests.filter(r => !r.hodStatus || r.hodStatus === 'Pending').length;
  const approvedCount = requests.filter(r => r.hodStatus === 'Approved').length;
  const rejectedCount = requests.filter(r => r.hodStatus === 'Rejected').length;

  const alreadyDecided = selectedReq &&
    selectedReq.hodStatus &&
    selectedReq.hodStatus !== 'Pending';

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">

      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0066cc] to-indigo-600 flex items-center justify-center shadow-md shadow-blue-200">
              <ShieldCheck size={16} className="text-white" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">All Approvals</h2>
          </div>
          <p className="text-sm text-slate-500 ml-10">
            Review and action L1 Change Requests assigned to your department —{' '}
            <span className="font-semibold text-[#0066cc]">{actingDept || '...'}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchRequests}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm cursor-pointer disabled:opacity-60"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin text-[#0066cc]' : ''} />
            Refresh
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer"
            title="Export filtered approvals to PDF"
          >
            <Download size={14} />
            Export PDF
          </button>
        </div>
      </div>

      {/* ─── Summary Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Pending Your Decision', value: pendingCount, icon: <Clock size={18} />, gradient: 'from-amber-500 to-orange-500', border: 'border-amber-100', text: 'text-amber-700' },
          { label: 'Approved by You', value: approvedCount, icon: <CheckCircle2 size={18} />, gradient: 'from-emerald-500 to-teal-500', border: 'border-emerald-100', text: 'text-emerald-700' },
          { label: 'Rejected by You', value: rejectedCount, icon: <XCircle size={18} />, gradient: 'from-rose-500 to-pink-500', border: 'border-rose-100', text: 'text-rose-700' },
        ].map((card, i) => (
          <div key={i} className={`relative bg-white border ${card.border} rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group`}>
            <div className={`absolute top-0 right-0 w-20 h-20 rounded-full bg-gradient-to-br ${card.gradient} opacity-[0.07] -translate-y-4 translate-x-4 group-hover:opacity-[0.13] transition-opacity`} />
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white shadow-sm mb-3`}>
              {card.icon}
            </div>
            <div className={`text-3xl font-black ${card.text}`}>{card.value}</div>
            <div className="text-xs font-semibold text-rose-600 mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      {/* ─── Filters ─── */}
      <div className="bg-white border border-slate-200/70 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search by Change No., Requester, Department..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0066cc] focus:ring-4 focus:ring-[#0066cc]/10 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-slate-400" />
          {['All', 'Pending', 'Approved', 'Rejected'].map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                statusFilter === f
                  ? 'bg-[#0066cc] text-white border-[#0066cc] shadow-md shadow-blue-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Table ─── */}
      <div className="bg-white border border-slate-200/70 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
        {isFetching ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
            <Loader2 className="animate-spin text-[#0066cc]" size={28} />
            <span className="text-sm font-semibold">Loading approval requests...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
              <ShieldCheck size={28} className="text-slate-300" />
            </div>
            <p className="text-sm font-semibold">No approval requests found</p>
            <p className="text-xs text-slate-400">Try adjusting your search or filter</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200 text-[10px] uppercase tracking-wider">
                    <th className="px-5 py-3.5 font-black text-slate-500"><div className="flex items-center gap-1.5"><Hash size={11} />Change No.</div></th>
                    <th className="px-5 py-3.5 font-black text-slate-500"><div className="flex items-center gap-1.5"><Calendar size={11} />Date</div></th>
                    <th className="px-5 py-3.5 font-black text-slate-500"><div className="flex items-center gap-1.5"><User size={11} />Requested By</div></th>
                    <th className="px-5 py-3.5 font-black text-slate-500"><div className="flex items-center gap-1.5"><Building2 size={11} />Dept</div></th>
                    <th className="px-5 py-3.5 font-black text-slate-500">HOD Decision</th>
                    <th className="px-5 py-3.5 font-black text-slate-500 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginated.map((req, idx) => {
                    const isPending = !req.hodStatus || req.hodStatus === 'Pending';
                    return (
                      <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="px-5 py-3.5">
                          <span className="font-mono font-bold text-[#0066cc] text-[12px] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            {req.changeNo}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[12px] text-slate-500 font-medium">{req.date || '-'}</td>
                        <td className="px-5 py-3.5">
                          <div className="text-[12px] font-semibold text-slate-800 truncate max-w-[160px]">{req.requestBy || req.requesterEmail}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{req.requesterEmail}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">{req.dept || '-'}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={req.hodStatus} />
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => handleOpenModal(req)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:border-[#0066cc] hover:text-[#0066cc] hover:bg-blue-50 rounded-lg text-[11px] font-bold transition-all shadow-sm cursor-pointer group-hover:shadow"
                          >
                            <Eye size={12} />
                            View
                            {isPending && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-100">
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={filtered.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              />
            </div>
          </>
        )}
      </div>

      {/* ─── Details Modal ─── */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCloseModal} />

          <div className="relative bg-white w-full max-w-[720px] max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-10 animate-fade-in-up">

            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#0066cc] to-indigo-600 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <FileText size={18} className="text-white" />
                </div>
                <div>
                  <h4 className="text-[15px] font-extrabold text-white">L1 Change Request Details</h4>
                  <p className="text-[11px] text-blue-100 mt-0.5">
                    <span className="font-mono font-bold text-white">{selectedReq.changeNo}</span>
                    <span className="mx-2 text-blue-300">·</span>
                    Raised by: <span className="font-semibold text-white">{selectedReq.requestBy || selectedReq.requesterEmail}</span>
                  </p>
                </div>
              </div>
              <button onClick={handleCloseModal} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-[13px] text-slate-700">
              {isFetchingDetails ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                  <Loader2 className="animate-spin text-[#0066cc]" size={24} />
                  <span className="text-sm font-semibold">Loading request details...</span>
                </div>
              ) : l1Details ? (
                <div className="space-y-5">
                  {/* General Info */}
                  <section className="space-y-3">
                    <h5 className="text-[11px] font-black text-[#0066cc] uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-100">
                      <Folder size={13} /> General Information
                    </h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/60 rounded-xl p-4 border border-slate-100">
                      {[
                        { label: 'Change No', value: <span className="font-mono font-bold text-[#0066cc]">{l1Details.change_no}</span> },
                        { label: 'Date', value: l1Details.crDate ? formatDateToDDMMYYYY(l1Details.crDate) : '-' },
                        { label: 'Department', value: l1Details.dept || '-' },
                        { label: 'Change Type', value: l1Details.change_type || '-' },
                      ].map((item, i) => (
                        <div key={i} className="space-y-1">
                          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">{item.label}</span>
                          <div className="font-semibold text-slate-800">{item.value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { label: 'Requested By', value: l1Details.request_by },
                        { label: 'Process Name', value: l1Details.process_name },
                        { label: 'Machine No', value: l1Details.machine_no },
                      ].map((item, i) => (
                        <div key={i} className="space-y-1">
                          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">{item.label}</span>
                          <div className="font-semibold text-slate-800">{item.value || '-'}</div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Description */}
                  <section className="space-y-3">
                    <h5 className="text-[11px] font-black text-[#0066cc] uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-100">
                      <FileText size={13} /> Description & Justification
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Change Description</span>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 leading-relaxed min-h-[60px] text-slate-700 text-[12px]">
                          {l1Details.description || '-'}
                        </div>
                        <div className="flex flex-wrap gap-1.5">{renderFilePills(l1Details.file_desc, l1Details.change_no)}</div>
                      </div>
                      <div className="space-y-1.5">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Area of Improvement</span>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 leading-relaxed min-h-[60px] text-slate-700 text-[12px]">
                          {l1Details.improvement_area || '-'}
                        </div>
                        <div className="flex flex-wrap gap-1.5">{renderFilePills(l1Details.file_improvement, l1Details.change_no)}</div>
                      </div>
                    </div>
                  </section>

                  {/* Timeline */}
                  <section>
                    <h5 className="text-[11px] font-black text-[#0066cc] uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-100 mb-3">
                      <Calendar size={13} /> Implementation Timeline
                    </h5>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'Target Start', value: l1Details.date_start ? formatDateToDDMMYYYY(l1Details.date_start) : '-' },
                        { label: 'Target Close', value: l1Details.date_close ? formatDateToDDMMYYYY(l1Details.date_close) : '-' },
                      ].map((item, i) => (
                        <div key={i} className="space-y-1">
                          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">{item.label}</span>
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5"><Calendar size={12} className="text-slate-400" />{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Risk & Traceability */}
                  <section className="space-y-3">
                    <h5 className="text-[11px] font-black text-[#0066cc] uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-100">
                      <AlertTriangle size={13} /> Risk & Traceability
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: 'Traceability FROM', value: l1Details.trace_from, file: l1Details.file_trace_from },
                        { label: 'Traceability TO', value: l1Details.trace_to, file: l1Details.file_trace_to },
                        { label: 'Risk Analysis', value: l1Details.risk_analysis, file: l1Details.file_risk },
                        { label: 'SOP / WI Update', value: l1Details.sop_update, file: l1Details.file_sop },
                      ].map((item, i) => (
                        <div key={i} className="space-y-1.5">
                          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">{item.label}</span>
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[12px] text-slate-700 leading-relaxed min-h-[44px]">{item.value || '-'}</div>
                          <div className="flex flex-wrap gap-1.5">{renderFilePills(item.file, l1Details.change_no)}</div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* If already decided — show previous decision */}
                  {alreadyDecided && (
                    <section className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                      <h5 className="text-[11px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                        <ShieldCheck size={13} /> Previous HOD Decision
                      </h5>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={selectedReq.hodStatus} />
                        <span className="text-[12px] text-slate-500">
                          by{' '}
                          <span className="font-semibold text-slate-700">
                            {selectedReq.hodName || selectedReq.hodEmail}
                          </span>{' '}
                          {selectedReq.hodDept && (
                            <span className="text-slate-400 font-normal">({selectedReq.hodDept})</span>
                          )}
                        </span>
                      </div>
                      {selectedReq.hodRemarks && (
                        <p className="text-[12px] text-slate-600 bg-white border border-slate-200 rounded-lg p-2.5 leading-relaxed">{selectedReq.hodRemarks}</p>
                      )}
                    </section>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                  <FileText size={28} className="text-slate-300" />
                  <p className="text-sm">No L1 request details found for this change.</p>
                </div>
              )}

              {/* Remarks input */}
              {!alreadyDecided && (isAdmin || isHOD) && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-1.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <MessageSquare size={12} /> Remarks <span className="text-slate-400 font-normal normal-case">(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    placeholder="Enter your remarks or reason for decision..."
                    className="w-full border border-slate-200 rounded-xl p-3 text-[12px] text-slate-700 outline-none focus:border-[#0066cc] focus:ring-4 focus:ring-[#0066cc]/10 transition-all resize-none"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer — Decision */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                {alreadyDecided ? (
                  <span className={`inline-flex items-center gap-2 text-[12px] font-bold px-3 py-1.5 rounded-xl border ${
                    selectedReq.hodStatus === 'Approved' 
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                      : 'text-rose-700 bg-rose-50 border-rose-200'
                  }`}>
                    {selectedReq.hodStatus === 'Approved' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    {(() => {
                      const showAsSelf = !isAdmin && isHOD && userEmail && selectedReq.hodEmail && userEmail.toLowerCase() === selectedReq.hodEmail.toLowerCase();
                      if (showAsSelf) {
                        return `Already ${selectedReq.hodStatus} by You`;
                      } else {
                        const displayName = selectedReq.hodName || selectedReq.hodEmail || 'HOD';
                        const displayDept = selectedReq.hodDept ? ` (${selectedReq.hodDept})` : '';
                        return `Already ${selectedReq.hodStatus} by ${displayName}${displayDept}`;
                      }
                    })()}
                  </span>
                ) : (isAdmin || isHOD) ? (
                  <>
                    <span className="text-[11px] font-bold text-slate-600">Your decision as <span className="text-[#0066cc]">{actingDept}</span> HOD:</span>
                    <button
                      onClick={() => handleDecision('Approved')}
                      disabled={isSubmitting}
                      className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-[12px] font-bold shadow-md shadow-emerald-200 transition-all cursor-pointer"
                    >
                      {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                      Approve
                    </button>
                    <button
                      onClick={() => handleDecision('Rejected')}
                      disabled={isSubmitting}
                      className="flex items-center gap-1.5 px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-[12px] font-bold shadow-md shadow-rose-200 transition-all cursor-pointer"
                    >
                      {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                      Reject
                    </button>
                  </>
                ) : (
                  <span className="text-[12px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl">
                    Not authorized to approve
                  </span>
                )}
              </div>
              <button
                onClick={handleCloseModal}
                className="flex items-center gap-1.5 px-5 py-2 bg-white border border-slate-200 rounded-xl text-[12px] font-bold text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-all shadow-sm cursor-pointer whitespace-nowrap"
              >
                <X size={13} /> Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Attachment Preview ─── */}
      {previewFile && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setPreviewFile(null)}>
          <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
              <span className="font-bold text-slate-800 text-[13px] truncate max-w-[80%]">{previewFile}</span>
              <button onClick={() => setPreviewFile(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-100/60">
              {fileUrls[previewFile] ? (
                previewFile.match(/\.(png|jpg|jpeg|gif|webp)$/i)
                  ? <img src={fileUrls[previewFile]} alt={previewFile} className="max-w-full max-h-[70vh] rounded-xl shadow-lg object-contain" />
                  : <iframe src={fileUrls[previewFile]} title={previewFile} className="w-full h-[70vh] rounded-xl border border-slate-200 shadow" />
              ) : (
                <div className="flex flex-col items-center gap-3 text-slate-400 py-16">
                  <Loader2 className="animate-spin text-[#0066cc]" size={28} />
                  <span className="text-sm font-semibold">Loading preview...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
