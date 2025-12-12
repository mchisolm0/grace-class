import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Authenticated, Unauthenticated } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-react';
import { Dashboard } from './pages/Dashboard';
import { GitHubCallback } from './pages/GitHubCallback';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <Header />
        <main className="p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/github/callback" element={<GitHubCallbackRoute />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-10 bg-light dark:bg-dark p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
      <a href="/" className="text-xl font-bold">
        Grace Class
      </a>
      <AuthButton />
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
