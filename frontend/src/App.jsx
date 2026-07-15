import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

function lazyWithPreload(factory) {
  const Component = lazy(factory);
  Component.preload = factory;
  return Component;
}

const Landing = lazyWithPreload(() => import('./pages/Landing'));
const Login = lazyWithPreload(() => import('./pages/Login'));
const Updates = lazyWithPreload(() => import('./pages/Updates'));
const Profile = lazyWithPreload(() => import('./pages/Profile'));
const Leaderboard = lazyWithPreload(() => import('./pages/Leaderboard'));
const Teams = lazyWithPreload(() => import('./pages/Teams'));
const Admin = lazyWithPreload(() => import('./pages/Admin'));
const Students = lazyWithPreload(() => import('./pages/Students'));
const EditProfile = lazyWithPreload(() => import('./pages/EditProfile'));

const priorityPreloads = [Leaderboard, Students, Updates];
const backgroundPreloads = [Landing, Login, Profile, Teams, Admin, EditProfile];

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

function AppContent() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/updates" element={<ProtectedRoute><Updates /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
          <Route path="/teams" element={<ProtectedRoute><Teams /></ProtectedRoute>} />
          <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
          <Route path="/profile/:id" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}
