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
  Check
} from 'lucide-react';
import { 
  toggleNotificationRead, 
  markAllNotificationsRead, 
  clearReadNotifications, 
  deleteNotification, 
  resetNotifications 
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

  const handleResetAlerts = async () => {
    try {
      await resetNotifications();
      await fetchNotifications();
      setToastMsg('Notifications reset to defaults.');
    } catch (error) {
      console.error(error);
      setToastMsg('Error resetting notifications.');
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
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative max-w-md">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by ID, title, process, sender..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0066cc] transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-slate-700"
            >
              <CheckCheck size={14} />
              <span>Mark all read</span>
            </button>
            <button
              onClick={handleClearRead}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-slate-700"
            >
              <Trash2 size={14} />
              <span>Clear read</span>
            </button>
            <button
              onClick={handleResetAlerts}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-slate-700"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
            <button
              onClick={() => setToastMsg('Notification preferences opened.')}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-slate-700"
            >
              <Sliders size={14} />
              <span>Preferences</span>
            </button>
          </div>
        </div>

        {/* Filters tabs bar */}
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          {[
            { id: 'All', label: 'All Alerts', count: countAll, badgeColor: 'bg-blue-600 text-white' },
            { id: 'Unread', label: 'Unread', count: countUnread, badgeColor: 'bg-rose-600 text-white' },
            { id: 'Action', label: 'Action Required', count: countAction, badgeColor: 'bg-slate-155 text-slate-700' },
            { id: 'System', label: 'System Logs', count: countSystem, badgeColor: 'bg-slate-155 text-slate-700' },
            { id: 'Read', label: 'Read', count: countRead, badgeColor: 'bg-slate-155 text-slate-700' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilterTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                activeFilterTab === tab.id
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
              <div
                key={alert.id}
                className={`group border border-slate-200 rounded-xl bg-white shadow-sm flex items-start gap-4 p-4 relative overflow-hidden transition-all duration-200 hover:shadow-md ${
                  !alert.isRead ? 'border-l-4 border-l-blue-600 bg-blue-50/10' : ''
                }`}
              >
                {/* Left Side Accent Ribbon for read alerts */}
                {alert.isRead && (
                  <div className={`absolute left-0 inset-y-0 w-1 ${
                    alert.color === 'green' ? 'bg-emerald-500' :
                    alert.color === 'red' ? 'bg-rose-500' :
                    alert.color === 'orange' ? 'bg-amber-500' : 'bg-slate-300'
                  }`} />
                )}

                {/* Circle Icon Indicator */}
                <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm ${
                  alert.color === 'green' ? 'bg-emerald-50 text-emerald-600' :
                  alert.color === 'red' ? 'bg-rose-50 text-rose-600' :
                  alert.color === 'orange' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  {alert.color === 'red' ? (
                    <AlertTriangle size={18} />
                  ) : alert.color === 'green' ? (
                    <Check size={18} />
                  ) : (
                    <CheckCheck size={18} />
                  )}
                </div>

                {/* Content area */}
                <div className="flex-1 space-y-2 text-left">
                  <div className="flex justify-between items-start gap-4">
                    <h4 className="font-heading text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                      {alert.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">{alert.time}</span>
                  </div>

                  <p className="text-slate-600 text-xs leading-relaxed max-w-3xl">
                    {alert.details}
                  </p>

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] font-bold">
                    <span className="text-blue-700 font-mono">{alert.changeNo}</span>
                    <span className={`px-2 py-0.5 rounded border text-[9px] ${getTagColor(alert.category)}`}>
                      {alert.category}
                    </span>
                    <span className="text-slate-400 font-mono">📁 {alert.dept}</span>
                  </div>
                </div>

                {/* Inline Hover Action Panel */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm shrink-0 self-center absolute right-4 bottom-4 md:relative md:right-0 md:bottom-0">
                  <button
                    onClick={() => toggleReadStatus(alert.id)}
                    className="p-1.5 text-slate-500 hover:text-blue-650 hover:bg-slate-50 rounded"
                    title={alert.isRead ? 'Mark unread' : 'Mark read'}
                  >
                    {alert.isRead ? <Mail size={13} /> : <MailOpen size={13} />}
                  </button>
                  <button
                    onClick={() => handleDeleteAlert(alert.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"
                    title="Delete alert"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
