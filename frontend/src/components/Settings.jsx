export const Settings = ({
  userEmail,
  userRole
}) => {
  return (
    <div className="space-y-6 max-w-[650px] mx-auto animate-fade-in-up">
      <div>
        <h3 className="font-heading text-2xl font-bold text-slate-900">System Settings</h3>
        <p className="text-slate-500 text-sm">Configure parameters and adjust user preferences.</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white border border-slate-200/60 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 space-y-4">
        <h4 className="font-heading font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">User Profile</h4>
        <div className="space-y-2 text-xs sm:text-sm">
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span className="text-slate-400">Account Email</span>
            <span className="text-slate-800 font-semibold">{userEmail}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span className="text-slate-400">Security Group</span>
            <span className="text-slate-800 font-semibold">{userRole}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span className="text-slate-400">Session Status</span>
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
            </span>
          </div>
        </div>
      </div>

      {/* System Config Mock */}
      <div className="bg-white border border-slate-200/60 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 space-y-4">
        <h4 className="font-heading font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">General Settings</h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h5 className="text-sm font-semibold text-slate-800">Email Notifications</h5>
              <p className="text-xs text-slate-400">Send alerts for CAB reviews and approved plans.</p>
            </div>
            <input type="checkbox" defaultChecked className="w-4 h-4 text-[#0066cc] rounded focus:ring-0 cursor-pointer" />
          </div>
          <div className="flex justify-between items-center">
            <div>
              <h5 className="text-sm font-semibold text-slate-800">API Access</h5>
              <p className="text-xs text-slate-400">Authorize automated integrations.</p>
            </div>
            <input type="checkbox" className="w-4 h-4 text-[#0066cc] rounded focus:ring-0 cursor-pointer" />
          </div>
        </div>
      </div>
    </div>
  );
};
