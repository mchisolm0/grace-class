import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Authenticated, Unauthenticated } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-react';
import { Dashboard } from './pages/Dashboard';
import { GitHubCallback } from './pages/GitHubCallback';
import { Organizations } from './pages/Organizations';
import { Classes } from './pages/Classes';
import { ClassDetail } from './pages/ClassDetail';
import { StudentActivity } from './pages/StudentActivity';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <Header />
        <main className="p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/github/callback" element={<GitHubCallbackRoute />} />
            <Route
              path="/organizations"
              element={
                <ProtectedRoute>
                  <Organizations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/classes"
              element={
                <ProtectedRoute>
                  <Classes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/classes/:classId"
              element={
                <ProtectedRoute>
                  <ClassDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students/:studentId"
              element={
                <ProtectedRoute>
                  <StudentActivity />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-10 bg-light dark:bg-dark p-4 border-b-2 border-slate-200 dark:border-slate-800">
      <div className="flex flex-row justify-between items-center max-w-6xl mx-auto">
        <div className="flex items-center gap-8">
          <a href="/" className="text-xl font-bold">
            Grace Class
          </a>
          <Authenticated>
            <nav className="flex items-center gap-4">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `text-sm hover:text-slate-600 dark:hover:text-slate-300 ${
                    isActive ? 'font-semibold' : 'text-slate-500 dark:text-slate-400'
                  }`
                }
                end
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/organizations"
                className={({ isActive }) =>
                  `text-sm hover:text-slate-600 dark:hover:text-slate-300 ${
                    isActive ? 'font-semibold' : 'text-slate-500 dark:text-slate-400'
                  }`
                }
              >
                Organizations
              </NavLink>
              <NavLink
                to="/classes"
                className={({ isActive }) =>
                  `text-sm hover:text-slate-600 dark:hover:text-slate-300 ${
                    isActive ? 'font-semibold' : 'text-slate-500 dark:text-slate-400'
                  }`
                }
              >
                Classes
              </NavLink>
            </nav>
          </Authenticated>
        </div>
        <AuthButton />
      </div>
    </header>
  );
}

function AuthButton() {
  const { user, signIn, signOut } = useAuth();

  if (user) {
    return (
      <button
        onClick={() => signOut()}
        className="bg-dark dark:bg-light text-light dark:text-dark text-sm px-4 py-2 rounded-md border-2 hover:opacity-80 transition-opacity"
      >
        Sign out
      </button>
    );
  }

  return (
    <button
      onClick={() => void signIn()}
      className="bg-dark dark:bg-light text-light dark:text-dark text-sm px-4 py-2 rounded-md border-2 hover:opacity-80 transition-opacity"
    >
      Sign in
    </button>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { signIn } = useAuth();

  return (
    <>
      <Authenticated>{children}</Authenticated>
      <Unauthenticated>
        <div className="max-w-md mx-auto text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Sign In Required</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">Please sign in to access this page.</p>
          <button
            onClick={() => void signIn()}
            className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors"
          >
            Sign In
          </button>
        </div>
      </Unauthenticated>
    </>
  );
}

function GitHubCallbackRoute() {
  return (
    <>
      <Authenticated>
        <GitHubCallback />
      </Authenticated>
      <Unauthenticated>
        <div className="text-center p-8">
          <p className="text-slate-600 dark:text-slate-400">Please sign in to complete GitHub connection.</p>
        </div>
      </Unauthenticated>
    </>
  );
}
