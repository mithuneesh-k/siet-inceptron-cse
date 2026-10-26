import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { UndoDeleteProvider } from './contexts/UndoDeleteContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import MandatoryPasswordChangeModal from './components/MandatoryPasswordChangeModal';

function lazyWithPreload(factory) {
  const Component = lazy(factory);
  Component.preload = factory;
  return Component;
}

const Landing = lazyWithPreload(() => import('./pages/Landing'));
const Intro = lazyWithPreload(() => import('./pages/Intro'));
const Showcase = lazyWithPreload(() => import('./pages/Showcase'));
const ShowcaseManage = lazyWithPreload(() => import('./pages/ShowcaseManage'));
const Login = lazyWithPreload(() => import('./pages/Login'));
const Profile = lazyWithPreload(() => import('./pages/Profile'));
const Leaderboard = lazyWithPreload(() => import('./pages/Leaderboard'));
const Teams = lazyWithPreload(() => import('./pages/Teams'));
const Admin = lazyWithPreload(() => import('./pages/Admin'));
const Approvals = lazyWithPreload(() => import('./pages/Approvals'));
const Students = lazyWithPreload(() => import('./pages/Students'));
const EditProfile = lazyWithPreload(() => import('./pages/EditProfile'));
const News = lazyWithPreload(() => import('./pages/News'));
const ThemeSettings = lazyWithPreload(() => import('./pages/ThemeSettings'));

const priorityPreloads = [Leaderboard, Students, News, Showcase];
const backgroundPreloads = [Landing, Intro, Login, Profile, Teams, Admin, Approvals, EditProfile, ThemeSettings];

function preloadRoutes(routes) {
  routes.forEach((route) => {
    if (route?.preload) route.preload();
  });
}

preloadRoutes(priorityPreloads);

if (typeof window !== 'undefined') {
  const schedule = window.requestIdleCallback || ((cb) => window.setTimeout(cb, 1500));
  schedule(() => preloadRoutes(backgroundPreloads));
}

function ProtectedRoute({ children, adminOnly = false }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const isStaff = Boolean(user.is_admin || user.role === 'admin' || user.role === 'faculty');
  if (adminOnly && !isStaff) return <Navigate to="/home" replace />;
  return children;
}

function FacultyOnlyRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'faculty') return <Navigate to="/home" replace />;
  return children;
}

function AppContent() {
  const { user } = useAuth();
  const location = useLocation();

  const isStandalonePage = location.pathname === '/' || location.pathname === '/intro' || location.pathname === '/showcase' || location.pathname === '/login';
  const showHeaderFooter = Boolean(user) && !isStandalonePage;

  return (
    <>
      <MandatoryPasswordChangeModal />
      {showHeaderFooter && <Navbar />}
      <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
        <Routes>
          <Route path="/" element={<Intro />} />
          <Route path="/intro" element={<Intro />} />
          <Route path="/showcase" element={<Showcase />} />
          <Route path="/showcase/manage" element={<ProtectedRoute adminOnly><ShowcaseManage /></ProtectedRoute>} />
          <Route path="/home" element={<Landing />} />
          <Route path="/login" element={user ? <Navigate to="/home" replace /> : <Login />} />
          <Route path="/register" element={<Navigate to="/login" replace />} />
          <Route path="/dashboard" element={<ProtectedRoute><Landing /></ProtectedRoute>} />
          <Route path="/updates" element={<Navigate to="/news" replace />} />
          <Route path="/news" element={<ProtectedRoute><News /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
          <Route path="/teams" element={<ProtectedRoute><Teams /></ProtectedRoute>} />
          <Route path="/students" element={<ProtectedRoute adminOnly><Students /></ProtectedRoute>} />
          <Route path="/profile/:id" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
          <Route path="/theme" element={<ProtectedRoute><ThemeSettings /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
          <Route path="/approvals" element={user?.role === 'faculty' ? <Navigate to="/admin?tab=overview" replace /> : <Navigate to="/home" replace />} />
          <Route path="/team-od" element={user?.role === 'faculty' || user?.is_admin ? <Navigate to="/admin?tab=team-od" replace /> : <Navigate to="/home" replace />} />
          <Route path="/team-od/manage" element={user?.role === 'admin' || user?.is_hod ? <Navigate to="/admin?tab=team-od-mgmt" replace /> : <Navigate to="/home" replace />} />
          <Route path="*" element={<Navigate to={user ? "/home" : "/"} replace />} />
        </Routes>
      </Suspense>
      {showHeaderFooter && <Footer />}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UndoDeleteProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </UndoDeleteProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
