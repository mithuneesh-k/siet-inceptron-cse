import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

function lazyWithPreload(factory) {
  const Component = lazy(factory);
  Component.preload = factory;
  return Component;
}

const Landing = lazyWithPreload(() => import('./pages/Landing'));
const Login = lazyWithPreload(() => import('./pages/Login'));
const Profile = lazyWithPreload(() => import('./pages/Profile'));
const Leaderboard = lazyWithPreload(() => import('./pages/Leaderboard'));
const CompetitiveLeaderboard = lazyWithPreload(() => import('./pages/CompetitiveLeaderboard'));
const Teams = lazyWithPreload(() => import('./pages/Teams'));
const Admin = lazyWithPreload(() => import('./pages/Admin'));
const Approvals = lazyWithPreload(() => import('./pages/Approvals'));
const Students = lazyWithPreload(() => import('./pages/Students'));
const EditProfile = lazyWithPreload(() => import('./pages/EditProfile'));
const Updates = lazyWithPreload(() => import('./pages/Updates'));
const Platforms = lazyWithPreload(() => import('./pages/Platforms'));
const News = lazyWithPreload(() => import('./pages/News'));

const priorityPreloads = [Leaderboard, CompetitiveLeaderboard, Students, Updates, Platforms, News];
const backgroundPreloads = [Landing, Login, Profile, Teams, Admin, Approvals, EditProfile];

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
  if (adminOnly && !user.is_admin) return <Navigate to="/" replace />;
  return children;
}

function StudentOnlyRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.is_admin || (user.role && user.role !== 'student')) return <Navigate to="/" replace />;
  return children;
}

function AppContent() {
  const { user } = useAuth();
  const location = useLocation();

  const isLoginPage = location.pathname === '/login';
  const showHeaderFooter = Boolean(user) && !isLoginPage;

  return (
    <>
      {showHeaderFooter && <Navbar />}
      <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
        <Routes>
          <Route path="/" element={<ProtectedRoute><Landing /></ProtectedRoute>} />
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/updates" element={<StudentOnlyRoute><Updates /></StudentOnlyRoute>} />
          <Route path="/news" element={<ProtectedRoute><News /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
          <Route path="/competitive-leaderboard" element={<ProtectedRoute><CompetitiveLeaderboard /></ProtectedRoute>} />
          <Route path="/platforms" element={<ProtectedRoute><Platforms /></ProtectedRoute>} />
          <Route path="/teams" element={<ProtectedRoute><Teams /></ProtectedRoute>} />
          <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
          <Route path="/profile/:id" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
          <Route path="/approvals" element={<ProtectedRoute adminOnly><Approvals /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
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
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
