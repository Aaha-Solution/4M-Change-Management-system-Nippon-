import { CheckCircle, Info, Zap } from 'lucide-react';

export const Approvals = ({
  userRole,
  changes,
  onStatusUpdate
}) => {
  const pendingOrEvaluating = changes.filter(c => c.status === 'Pending' || c.status === 'Evaluating');

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h3 className="font-heading text-2xl font-bold text-slate-900">Pending Approvals</h3>
        <p className="text-slate-500 text-sm">Review, evaluate, and authorize submitted change plans.</p>
      </div>

      {/* Authorization check */}
      {userRole !== 'Admin' && userRole !== 'Administrator' && userRole !== 'Change Manager' ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-3 text-amber-800">
          <Info size={20} className="flex-shrink-0" />
          <div>
            <h4 className="font-bold text-sm">Restricted Access</h4>
            <p className="text-xs mt-0.5">Only Administrators and Change Managers are authorized to review or approve change plans.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {pendingOrEvaluating.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400">
              <CheckCircle size={32} className="mx-auto text-emerald-500 mb-2" />
              <p className="text-sm font-semibold">Zero Pending Requests</p>
              <p className="text-xs text-slate-400 mt-0.5">All incoming requests are fully reviewed.</p>
            </div>
          ) : (
            pendingOrEvaluating.map(c => (
              <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400">{c.id}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                      c.priority === 'High' ? 'bg-rose-50 border-rose-200 text-rose-600' :
                      c.priority === 'Medium' ? 'bg-amber-50 border-amber-200 text-amber-600' :
                      'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      {c.priority} Priority
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">{c.date}</span>
                  </div>
                  <h4 className="text-base font-bold text-slate-800">{c.title}</h4>
                  <p className="text-xs text-slate-500">Submitted by: <span className="font-semibold">{c.requester}</span></p>
                </div>

                {/* Control actions */}
                <div className="flex gap-2 self-end md:self-auto">
                  {c.status === 'Pending' && (
                    <button
                      onClick={() => onStatusUpdate(c.id, 'Evaluating')}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-250 text-slate-700 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                    >
                      Send to Evaluating
                    </button>
                  )}
                  <button
                    onClick={() => onStatusUpdate(c.id, 'Approved')}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-all shadow-sm cursor-pointer"
                  >
                    Approve Change
                  </button>
                  {c.status === 'Evaluating' && (
                    <button
                      onClick={() => onStatusUpdate(c.id, 'Completed')}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-all shadow-sm cursor-pointer"
                    >
                      Mark Completed
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
