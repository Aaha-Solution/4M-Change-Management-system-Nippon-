export const AuditLog = ({ auditLogs }) => {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h3 className="font-heading text-2xl font-bold text-slate-900">System Audit Log</h3>
        <p className="text-slate-500 text-sm">Review security audits, session activities, and transaction logs.</p>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-400 uppercase">Chronological Records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150">
                <th className="p-3.5 font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                <th className="p-3.5 font-bold text-slate-500 uppercase tracking-wider">Action</th>
                <th className="p-3.5 font-bold text-slate-500 uppercase tracking-wider">Trigger User</th>
                <th className="p-3.5 font-bold text-slate-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/50">
                  <td className="p-3.5 font-mono text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="p-3.5 font-bold text-slate-700">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      log.action.includes('Created') ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                      log.action.includes('Updated') ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      log.action.includes('Start') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-650 font-semibold">{log.user}</td>
                  <td className="p-3.5 text-slate-500 font-medium">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
