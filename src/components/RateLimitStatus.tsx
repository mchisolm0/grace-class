import { useState, useEffect, useCallback } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetAt: number;
}

export function RateLimitStatus() {
  const checkRateLimit = useAction(api.activities.checkRateLimit);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRateLimit = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await checkRateLimit({});
      if (result.success && result.rateLimit) {
        setRateLimit(result.rateLimit);
      } else {
        setError(result.message ?? 'Failed to fetch rate limit');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [checkRateLimit]);

  useEffect(() => {
    void fetchRateLimit();
  }, [fetchRateLimit]);

  const getResetTime = () => {
    if (!rateLimit) return '';
    const resetDate = new Date(rateLimit.resetAt);
    const now = new Date();
    const diffMs = resetDate.getTime() - now.getTime();

    if (diffMs <= 0) return 'now';

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'less than a minute';
    if (diffMins === 1) return '1 minute';
    if (diffMins < 60) return `${diffMins} minutes`;

    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    if (diffHours === 1) {
      return remainingMins > 0 ? `1 hour ${remainingMins} min` : '1 hour';
    }
    return remainingMins > 0 ? `${diffHours} hours ${remainingMins} min` : `${diffHours} hours`;
  };

  const getPercentage = () => {
    if (!rateLimit) return 0;
    return Math.round((rateLimit.remaining / rateLimit.limit) * 100);
  };

  const getStatusColor = () => {
    const percentage = getPercentage();
    if (percentage > 50) return 'bg-green-500';
    if (percentage > 20) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <span className="text-red-500">⚠️</span>
        <span>{error}</span>
        <button onClick={() => void fetchRateLimit()} className="text-blue-600 dark:text-blue-400 hover:underline">
          Retry
        </button>
      </div>
    );
  }

  if (isLoading && !rateLimit) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <div className="w-4 h-4 border-2 border-slate-300 dark:border-slate-600 border-t-slate-600 dark:border-t-slate-300 rounded-full animate-spin"></div>
        <span>Checking rate limit...</span>
      </div>
    );
  }

  if (!rateLimit) {
    return null;
  }

  return (
    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-sm">GitHub API Rate Limit</h3>
        <button
          onClick={() => void fetchRateLimit()}
          disabled={isLoading}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="flex items-center gap-3">
        {/* Progress bar */}
        <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${getStatusColor()} transition-all duration-300`}
            style={{ width: `${getPercentage()}%` }}
          ></div>
        </div>

        {/* Count */}
        <span className="text-sm font-medium whitespace-nowrap">
          {rateLimit.remaining.toLocaleString()} / {rateLimit.limit.toLocaleString()}
        </span>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Resets in {getResetTime()}</p>

      {getPercentage() < 20 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
          ⚠️ Rate limit is low. Consider waiting before making more requests.
        </p>
      )}
    </div>
  );
}
