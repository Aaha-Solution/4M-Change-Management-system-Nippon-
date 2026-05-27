import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { CheckCircle } from 'lucide-react';

function App() {
  const [userEmail, setUserEmail] = useState(() => {
    const token = localStorage.getItem('cms_token') || sessionStorage.getItem('cms_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.email || '';
      } catch (error) {
        console.warn('Failed to parse email from token:', error);
      }
    }
    return '';
  });

  const [userRole, setUserRole] = useState(() => {
    const token = localStorage.getItem('cms_token') || sessionStorage.getItem('cms_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.role || '';
      } catch (error) {
        console.warn('Failed to parse role from token:', error);
      }
    }
    return '';
  });

  const [toastMsg, setToastMsg] = useState(null);

  // Clear toast notifications
  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  const handleLoginSuccess = (email, role, token, rememberMe) => {
    if (rememberMe) {
      localStorage.setItem('cms_token', token);
    } else {
      sessionStorage.setItem('cms_token', token);
    }
    setUserEmail(email);
    setUserRole(role);
    setToastMsg(`Signed in as ${role}`);
  };

  const handleSignOut = () => {
    localStorage.removeItem('cms_token');
    sessionStorage.removeItem('cms_token');
    setUserEmail('');
    setUserRole('');
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <Login onLoginSuccess={handleLoginSuccess} />
          }
        />
        <Route
          path="/dashboard"
          element={
            <Dashboard
              userEmail={userEmail}
              userRole={userRole}
              onSignOut={handleSignOut}
            />
          }
        />
        {/* Fallback route redirection */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-8 right-8 bg-white border border-slate-200/80 rounded-xl px-5 py-4 flex items-center gap-3 shadow-xl z-50 animate-slide-in-right">
          <CheckCircle size={18} className="text-emerald-500" />
          <span className="text-sm text-slate-800 font-medium">{toastMsg}</span>
        </div>
      )}
    </Router>
  );
}

export default App;

