import { useState } from 'react';
import { createChange } from '../api/apiRoutes';
import { FilePlus, Loader2, Plus } from 'lucide-react';

export const NewRequest = ({
  userEmail,
  onTabChange,
  changes,
  setChanges,
  logAction,
  setToastMsg,
  onLocalSignOut
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState('Medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateChange = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setToastMsg('Please enter a change request title.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await createChange({
        title: newTitle.trim(),
        requester: userEmail,
        priority: newPriority
      });
      const data = response.data;

      setChanges([data.change, ...changes]);
      setToastMsg(`Created request: ${data.change.id}`);
      logAction('Change Created', `Successfully registered new change request ${data.change.id}: "${newTitle.trim()}"`);
      
      // Reset form fields
      setNewTitle('');
      setNewPriority('Medium');
      // Navigate back to overview to see the new request
      onTabChange('dashboard');
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        onLocalSignOut();
      } else {
        setToastMsg('Error saving change to server.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[600px] mx-auto bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm relative animate-fade-in-up">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#0066cc] to-sky-400 rounded-t-xl" />
      
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-[#0066cc]/10 text-[#0066cc] flex items-center justify-center">
          <FilePlus size={20} />
        </div>
        <div>
          <h3 className="font-heading text-xl font-bold text-slate-900">Request New Change</h3>
          <p className="text-slate-500 text-sm">Register modification request details for CAB review.</p>
        </div>
      </div>

      <form onSubmit={handleCreateChange} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="form-title" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
            Change Description / Title
          </label>
          <input
            id="form-title"
            type="text"
            required
            placeholder="e.g. Upgrade node runtime environment on cloud servers"
            className="w-full bg-slate-50 border border-slate-200 focus:border-[#0066cc] focus:ring-4 focus:ring-[#0066cc]/10 rounded-lg py-2.5 px-4 text-sm outline-none transition-all"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Priority Level</label>
          <div className="grid grid-cols-3 gap-3">
            {['Low', 'Medium', 'High'].map(prio => (
              <button
                key={prio}
                type="button"
                onClick={() => setNewPriority(prio)}
                disabled={isSubmitting}
                className={`py-2 px-3 rounded-lg text-sm font-medium border text-center transition-all cursor-pointer ${
                  newPriority === prio
                    ? prio === 'High'
                      ? 'bg-rose-50 border-rose-500 text-rose-700 font-semibold'
                      : prio === 'Medium'
                      ? 'bg-amber-50 border-amber-500 text-amber-700 font-semibold'
                      : 'bg-slate-100 border-slate-400 text-slate-700 font-semibold'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-500'
                }`}
              >
                {prio}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="form-requester" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
            Requester
          </label>
          <input
            id="form-requester"
            type="text"
            disabled
            className="w-full bg-slate-100 border border-slate-200 rounded-lg py-2.5 px-4 text-sm text-slate-500 outline-none cursor-not-allowed"
            value={userEmail}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-150">
          <button
            type="button"
            onClick={() => onTabChange('dashboard')}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-medium transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !newTitle.trim()}
            className="flex items-center gap-1.5 bg-[#0066cc] hover:bg-[#0052a3] disabled:opacity-60 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-sm cursor-pointer"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
            Submit Request
          </button>
        </div>
      </form>
    </div>
  );
};
