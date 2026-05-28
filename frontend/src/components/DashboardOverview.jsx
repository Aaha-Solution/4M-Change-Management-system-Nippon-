import { Clock, Zap, CheckCircle, TrendingUp, Plus, Loader2 } from 'lucide-react';

export const DashboardOverview = ({
  changes,
  isFetchingChanges,
  onTabChange
}) => {
  // Compile metrics dynamically
  const pendingCount = changes.filter(c => c.status === 'Pending').length;
  const evaluatingCount = changes.filter(c => c.status === 'Evaluating').length;
  const approvedCount = changes.filter(c => c.status === 'Approved').length;
  const completedCount = changes.filter(c => c.status === 'Completed').length;

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Overview Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-heading text-2xl font-bold text-slate-900">Dashboard Overview</h3>
          <p className="text-slate-500 text-sm">Real-time status summaries and workflow metrics.</p>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Pending Card */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-11 h-11 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Reviews</h4>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {isFetchingChanges ? <Loader2 className="animate-spin text-slate-400" size={20} /> : pendingCount}
            </div>
          </div>
        </div>

        {/* Evaluating Card */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-11 h-11 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center flex-shrink-0">
            <Zap size={20} />
          </div>
          <div>
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Evaluating</h4>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {isFetchingChanges ? <Loader2 className="animate-spin text-slate-400" size={20} /> : evaluatingCount}
            </div>
          </div>
        </div>

        {/* Approved Card */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle size={20} />
          </div>
          <div>
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Approved</h4>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {isFetchingChanges ? <Loader2 className="animate-spin text-slate-400" size={20} /> : approvedCount}
            </div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-11 h-11 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={20} />
          </div>
          <div>
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Success Rate</h4>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {completedCount + approvedCount > 0 
                ? `${Math.round(((completedCount + approvedCount) / (changes.length || 1)) * 1000) / 10}%` 
                : '100%'}
            </div>
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="font-heading text-lg font-bold text-slate-900">Recent Change Requests</h3>
            <p className="text-slate-500 text-xs">Latest submissions awaiting evaluation or verification.</p>
          </div>
          <button
            onClick={() => onTabChange('new-request')}
            className="flex items-center gap-1.5 bg-[#0066cc] hover:bg-[#0052a3] text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus size={14} /> Add Request
          </button>
        </div>

        <div className="overflow-x-auto">
          {isFetchingChanges ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
              <Loader2 className="animate-spin text-[#0066cc]" size={28} />
              <span className="text-sm">Fetching changes...</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Requester</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {changes.slice(0, 5).map(c => (
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
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
