export const Reports = ({
  changes,
  effectivenessLogs
}) => {
  const totalLoggedChanges = changes.length;
  const activeMonitoredLogs = effectivenessLogs.length;
  const approvedQaLogs = effectivenessLogs.filter(l => l.qaApproval === 'Approved').length;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h3 className="font-heading text-2xl font-bold text-slate-900">Reporting Analytics</h3>
        <p className="text-slate-500 text-sm">System performance audits and change distribution summaries.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Priority Breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h4 className="font-heading font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">Priority Distribution</h4>
          <div className="space-y-3 pt-2">
            {['High', 'Medium', 'Low'].map(prio => {
              const count = changes.filter(c => c.priority === prio).length;
              const percentage = totalLoggedChanges > 0 ? Math.round((count / totalLoggedChanges) * 100) : 0;
              return (
                <div key={prio} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-700">{prio} Priority</span>
                    <span className="text-slate-400 font-mono">{count} requests ({percentage}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${prio === 'High' ? 'bg-rose-500' : prio === 'Medium' ? 'bg-amber-500' : 'bg-slate-400'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h4 className="font-heading font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">Status Tracking</h4>
          <div className="space-y-3 pt-2">
            {['Pending', 'Evaluating', 'Approved', 'Completed'].map(status => {
              const count = changes.filter(c => c.status === status).length;
              const percentage = totalLoggedChanges > 0 ? Math.round((count / totalLoggedChanges) * 100) : 0;
              return (
                <div key={status} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-700">{status}</span>
                    <span className="text-slate-400 font-mono">{count} requests ({percentage}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        status === 'Pending' ? 'bg-amber-500' :
                        status === 'Evaluating' ? 'bg-cyan-500' :
                        status === 'Approved' ? 'bg-emerald-500' :
                        'bg-indigo-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Analytical Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-center">
          <h5 className="text-[11px] font-bold text-slate-400 uppercase">Total Logged Changes</h5>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">{totalLoggedChanges}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-center">
          <h5 className="text-[11px] font-bold text-slate-400 uppercase">Active Monitoring logs</h5>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">{activeMonitoredLogs}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-center">
          <h5 className="text-[11px] font-bold text-slate-400 uppercase">QA Approval Rate</h5>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">
            {activeMonitoredLogs > 0
              ? `${Math.round((approvedQaLogs / activeMonitoredLogs) * 100)}%`
              : '100%'}
          </p>
        </div>
      </div>
    </div>
  );
};
