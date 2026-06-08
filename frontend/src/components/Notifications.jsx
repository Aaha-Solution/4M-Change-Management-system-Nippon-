import { useState, useEffect } from 'react';
import {
  Search,
  CheckCheck,
  Trash2,
  RotateCcw,
  Sliders,
  Mail,
  MailOpen,
  AlertTriangle,
  Check,
  FileText,
  Layers,
  Activity,
  Clock,
  User,
  ExternalLink
} from 'lucide-react';
import {
  toggleNotificationRead,
  markAllNotificationsRead,
  clearReadNotifications,
  deleteNotification
} from '../api/apiRoutes';


export const Notifications = ({ setToastMsg, notifications, setNotifications, fetchNotifications }) => {
  const alerts = notifications || [];
  const [search, setSearch] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState('All'); // 'All' | 'Unread' | 'Action' | 'System' | 'Read'

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      await fetchNotifications();
      setToastMsg('All notifications marked as read.');
    } catch (error) {
      console.error(error);
      setToastMsg('Error marking notifications as read.');
    }
  };

  const handleClearRead = async () => {
    try {
      await clearReadNotifications();
      await fetchNotifications();
      setToastMsg('Read notifications cleared.');
    } catch (error) {
      console.error(error);
      setToastMsg('Error clearing read notifications.');
    }
  };



  const toggleReadStatus = async (id) => {
    try {
      const response = await toggleNotificationRead(id);
      // Backend returns the updated notification item in response.data
      setNotifications(prev => prev.map(n => n.id === id ? response.data : n));
    } catch (error) {
      console.error(error);
      setToastMsg('Error updating notification status.');
    }
  };

  const handleDeleteAlert = async (id) => {
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setToastMsg('Notification deleted.');
    } catch (error) {
      console.error(error);
      setToastMsg('Error deleting notification.');
    }
  };

  // Filter and Search logic
  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch =
      alert.title.toLowerCase().includes(search.toLowerCase()) ||
      alert.details.toLowerCase().includes(search.toLowerCase()) ||
      alert.changeNo.toLowerCase().includes(search.toLowerCase()) ||
      alert.category.toLowerCase().includes(search.toLowerCase()) ||
      alert.dept.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilterTab === 'Unread') return !alert.isRead;
    if (activeFilterTab === 'Read') return alert.isRead;
    if (activeFilterTab === 'Action') return alert.type === 'Action Required';
    if (activeFilterTab === 'System') return alert.type === 'System Logs';

    return true;
  });

  // Calculate counts dynamically
  const countAll = alerts.length;
  const countUnread = alerts.filter(a => !a.isRead).length;
  const countAction = alerts.filter(a => a.type === 'Action Required').length;
  const countSystem = alerts.filter(a => a.type === 'System Logs').length;
  const countRead = alerts.filter(a => a.isRead).length;

  const getTagColor = (category) => {
    const cat = category.toUpperCase();
    if (cat === 'MACHINE') return 'bg-purple-50 text-purple-700 border-purple-100';
    if (cat === 'METHOD') return 'bg-amber-50 text-amber-700 border-amber-100';
    if (cat === 'MATERIAL') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (cat === 'MAN') return 'bg-sky-50 text-sky-700 border-sky-100';
    return 'bg-slate-50 text-slate-700 border-slate-100';
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Title */}
      <div>
        <h3 className="font-heading text-2xl font-bold text-slate-900">Notifications Centre</h3>
        <p className="text-slate-500 text-sm">Review alerts, track approvals, and manage notification triggers for Plant A.</p>
      </div>

      {/* Control bar */}
      <div className="bg-white border border-slate-200/60 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 space-y-4">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative max-w-md">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by ID, title, process, sender..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0066cc] focus:ring-4 focus:ring-[#0066cc]/10 transition-all duration-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            
          </div>
        </div>

        {/* Filters tabs bar */}
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          {[
            { id: 'All', label: 'All Alerts', count: countAll, badgeColor: 'bg-blue-600 text-white' },
            { id: 'Read', label: 'Read', count: countRead, badgeColor: 'bg-slate-155 text-slate-700' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilterTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${activeFilterTab === tab.id
                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${tab.badgeColor}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Notifications list */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400 text-xs">
            No notifications matches the current filter settings.
          </div>
        ) : (
          filteredAlerts.map(alert => {
            return (
              <div className="mt-12 space-y-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white px-4">Live Activity Streams</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {/* L1 Notification Card: Production/Machine */}
                  <div className="relative group overflow-hidden bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                            <Layers size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded shadow-sm">L1 DATA</span>
                              <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">#4M-2026-1</span>
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 mt-0.5">Machine Change Authorization</h3>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1 text-slate-400">
                            <Clock size={10} />
                            <span className="text-[9px] font-bold">14:30 Today</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-2.5 mb-3 border border-slate-100">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700">
                          <Activity size={12} className="text-indigo-500" />
                          <span>Impacted Asset: <span className="text-indigo-600">Welding Line A</span></span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">
                          Initiated by <span className="font-bold text-slate-900 underline decoration-indigo-200">Kumar Selvam</span> for machine <strong className="text-slate-900">MFG-MC-2011</strong> (Unit 1).
                        </p>
                      </div>

                      <div className="flex justify-between items-center bg-white pt-1">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600 border border-white shadow-sm">KS</div>
                          <span className="text-[9px] font-bold text-slate-500">Requester</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button className="flex items-center gap-1 text-[9px] font-black text-slate-500 hover:text-slate-700 transition-colors uppercase tracking-wider">
                            <Check size={10} /> Mark Read
                          </button>
                          <button className="flex items-center gap-1 text-[9px] font-black text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-wider group-hover:gap-1.5">
                            View Details <ExternalLink size={10} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* L2 Notification Card: Documents/Approval */}
                  <div className="relative group overflow-hidden bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                            <FileText size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black bg-emerald-600 text-white px-1.5 py-0.5 rounded shadow-sm">L2 DATA</span>
                              <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">#4M-2026-2</span>
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 mt-0.5">Validation Logs Accepted</h3>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1 text-slate-400">
                            <Clock size={10} />
                            <span className="text-[9px] font-bold">13:23 Today</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-2.5 mb-3 border border-slate-100">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700">
                          <User size={12} className="text-emerald-500" />
                          <span>Validated by <span className="text-emerald-600">Kumar Selvam</span> for <span className="font-mono font-bold text-emerald-700 tracking-tighter">4M-2026-1</span></span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center bg-white pt-1">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[9px] font-bold text-white border border-white shadow-sm">KS</div>
                          <span className="text-[9px] font-bold text-emerald-600">Validated</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button className="flex items-center gap-1 text-[9px] font-black text-slate-500 hover:text-slate-700 transition-colors uppercase tracking-wider">
                            <Check size={10} /> Mark Read
                          </button>
                          <button className="flex items-center gap-1 text-[9px] font-black text-emerald-600 hover:text-emerald-700 transition-colors uppercase tracking-wider group-hover:gap-1.5">
                            View Details <ExternalLink size={10} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
             
            );
          })
        )}
      </div>

      {/* L1 & L2 Specific Data Section */}
    
    </div>
  );
};
