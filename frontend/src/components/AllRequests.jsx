import { useState } from 'react';
import { Search, Plus, Zap } from 'lucide-react';

export const AllRequests = ({
  changes,
  onTabChange
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  const filteredChanges = changes.filter(c => {
    const matchesQuery = c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.requester.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    const matchesPriority = priorityFilter === 'All' || c.priority === priorityFilter;
    return matchesQuery && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header and filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h3 className="font-heading text-lg font-bold text-slate-900">All Change Requests</h3>
            <p className="text-slate-500 text-xs">Examine, search, and filter all registered system records.</p>
          </div>
          <button
            onClick={() => onTabChange('new-request')}
            className="flex items-center justify-center gap-1.5 bg-[#0066cc] hover:bg-[#0052a3] text-white px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer self-start"
          >
            <Plus size={14} /> New Request
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search ID, title, requester..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#0066cc] transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-[#0066cc]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Evaluating">Evaluating</option>
              <option value="Approved">Approved</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-[#0066cc]"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="All">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Title / Context</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Requester</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredChanges.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 text-sm">
                    No matching change requests found.
                  </td>
                </tr>
              ) : (
                filteredChanges.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="p-4 text-xs font-mono text-slate-400 font-bold">{c.id}</td>
                    <td className="p-4 text-sm font-medium text-slate-800">{c.title}</td>
                    <td className="p-4 text-sm text-slate-500">{c.requester}</td>
                    <td className="p-4 text-sm text-slate-500">{c.date}</td>
                    <td className="p-4 text-sm font-semibold">
                      <span className={c.priority === 'High' ? 'text-rose-600' : c.priority === 'Medium' ? 'text-amber-600' : 'text-slate-500'}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        c.status === 'Pending' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                        c.status === 'Approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                        c.status === 'Evaluating' ? 'bg-cyan-50 border-cyan-200 text-cyan-700' :
                        'bg-indigo-50 border-indigo-200 text-indigo-700'
                      }`}>
                        <Zap size={10} className="fill-current" />
                        {c.status}
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
