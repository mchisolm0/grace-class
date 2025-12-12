import { useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

type CallbackState = { type: 'processing' } | { type: 'error'; message: string } | { type: 'success' };

function parseCallbackParams(searchParams: URLSearchParams): CallbackState {
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    return { type: 'error', message: errorDescription || error };
  }

  const success = searchParams.get('success');
  const accessToken = searchParams.get('access_token');
  const githubUsername = searchParams.get('github_username');
  const githubId = searchParams.get('github_id');

  if (success === 'true' && accessToken && githubUsername && githubId) {
    return { type: 'processing' };
  }

  return { type: 'error', message: 'Invalid callback parameters' };
}

export function GitHubCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const saveConnection = useMutation(api.github.saveConnection);
  const processedRef = useRef(false);

  const initialState = useMemo(() => parseCallbackParams(searchParams), [searchParams]);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (processedRef.current) {
      return;
    }

    if (initialState.type !== 'processing') {
      return;
    }

    processedRef.current = true;

    const accessToken = searchParams.get('access_token')!;
    const githubUsername = searchParams.get('github_username')!;
    const githubId = searchParams.get('github_id')!;
    const avatarUrl = searchParams.get('avatar_url');

    void saveConnection({
      accessToken,
      githubUsername,
      githubId: parseInt(githubId, 10),
      avatarUrl: avatarUrl || undefined,
    }).then(
      () => {
        // Navigate after successful save
        window.setTimeout(() => {
          void navigate('/', { replace: true });
        }, 1500);
      },
      (err: unknown) => {
        console.error('Failed to save GitHub connection:', err);
        void navigate('/?github_error=save_failed', { replace: true });
      },
    );
  }, [initialState, searchParams, saveConnection, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-8 max-w-md w-full text-center">
        {initialState.type === 'processing' && (
          <>
            <div className="w-12 h-12 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Connecting GitHub...</h2>
            <p className="text-slate-600 dark:text-slate-400">Please wait while we complete the connection.</p>
          </>
        )}

        {initialState.type === 'error' && (
          <>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2 text-red-600 dark:text-red-400">Connection Failed</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">{initialState.message}</p>
            <a
              href="/"
              className="inline-block px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors"
            >
              Back to Dashboard
            </a>
          </>
        )}
      </div>
    </div>
  );
}
