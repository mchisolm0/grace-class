import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id, Doc } from '../../convex/_generated/dataModel';

type Activity = Doc<'activities'>;
type ActivityType = Activity['type'];

const activityTypeLabels: Record<ActivityType, string> = {
  commit: 'Commits',
  pr: 'Pull Requests',
  issue: 'Issues',
  pr_comment: 'PR Comments',
  issue_comment: 'Issue Comments',
  commit_comment: 'Commit Comments',
  discussion: 'Discussions',
  discussion_comment: 'Discussion Comments',
};

const activityTypeIcons: Record<ActivityType, string> = {
  commit: '📝',
  pr: '🔀',
  issue: '🎯',
  pr_comment: '💬',
  issue_comment: '💭',
  commit_comment: '📌',
  discussion: '🗣️',
  discussion_comment: '💡',
};

export function StudentActivity() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const student = useQuery(api.students.get, studentId ? { id: studentId as Id<'students'> } : 'skip');
  const activities = useQuery(
    api.activities.listByStudent,
    studentId ? { studentId: studentId as Id<'students'> } : 'skip',
  );
  const counts = useQuery(
    api.activities.getCountsByStudent,
    studentId ? { studentId: studentId as Id<'students'> } : 'skip',
  );
  const lastFetchTime = useQuery(
    api.activities.getLastFetchTime,
    studentId ? { studentId: studentId as Id<'students'> } : 'skip',
  );

  const fetchActivity = useAction(api.activities.fetchForStudent);

  const [isFetching, setIsFetching] = useState(false);
  const [fetchResult, setFetchResult] = useState<{ success: boolean; message: string } | null>(null);
  const [selectedType, setSelectedType] = useState<ActivityType | 'all'>('all');

  const handleRefresh = async () => {
    if (!studentId) return;

    setIsFetching(true);
    setFetchResult(null);

    try {
      const result = await fetchActivity({ studentId: studentId as Id<'students'> });
      setFetchResult(result);
    } catch (err) {
      setFetchResult({
        success: false,
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsFetching(false);
    }
  };

  if (student === undefined) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-300 dark:bg-slate-600 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-1/4 mb-8"></div>
          <div className="h-32 bg-slate-300 dark:bg-slate-600 rounded"></div>
        </div>
      </div>
    );
  }

  if (student === null) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-8 text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-4">Student not found.</p>
          <button
            onClick={() => {
              void navigate('/classes');
            }}
            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors"
          >
            Back to Classes
          </button>
        </div>
      </div>
    );
  }

  const filteredActivities =
    selectedType === 'all' ? activities : activities?.filter((a) => a.type === selectedType);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => {
            void navigate(-1);
          }}
          className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-2 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {student.avatarUrl ? (
              <img src={student.avatarUrl} alt={student.githubUsername} className="w-16 h-16 rounded-full" />
            ) : (
              <div className="w-16 h-16 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
            )}
            <div>
              <h1 className="text-3xl font-bold">{student.name}</h1>
              <a
                href={`https://github.com/${student.githubUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                @{student.githubUsername}
              </a>
            </div>
          </div>
          <button
            onClick={() => void handleRefresh()}
            disabled={isFetching}
            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isFetching ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Fetching...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh Activity
              </>
            )}
          </button>
        </div>

        {/* Fetch result message */}
        {fetchResult && (
          <div
            className={`mt-4 p-3 rounded-md ${
              fetchResult.success
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
            }`}
          >
            {fetchResult.message}
          </div>
        )}

        {/* Last fetch time */}
        {lastFetchTime && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Last fetched: {new Date(lastFetchTime).toLocaleString()}
          </p>
        )}
      </div>

      {/* Activity Summary */}
      {counts && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Activity Summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(activityTypeLabels).map(([type, label]) => (
              <button
                key={type}
                onClick={() => setSelectedType(selectedType === type ? 'all' : (type as ActivityType))}
                className={`p-4 rounded-lg text-left transition-colors ${
                  selectedType === type
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span className="text-2xl">{activityTypeIcons[type as ActivityType]}</span>
                <p className="text-2xl font-bold mt-1">{counts[type] ?? 0}</p>
                <p className="text-sm opacity-75">{label}</p>
              </button>
            ))}
          </div>
          <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <p className="text-lg">
              <span className="font-bold text-2xl">{counts.total}</span>{' '}
              <span className="text-slate-600 dark:text-slate-400">total activities</span>
            </p>
          </div>
        </section>
      )}

      {/* Activity Filter */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-slate-600 dark:text-slate-400">Filter:</span>
        <button
          onClick={() => setSelectedType('all')}
          className={`px-3 py-1 text-sm rounded-full transition-colors ${
            selectedType === 'all'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
              : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
          }`}
        >
          All
        </button>
        {Object.entries(activityTypeLabels).map(([type, label]) => (
          <button
            key={type}
            onClick={() => setSelectedType(type as ActivityType)}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              selectedType === type
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Activity Timeline */}
      <section>
        <h2 className="text-xl font-semibold mb-4">
          Activity Timeline
          {selectedType !== 'all' && (
            <span className="text-slate-500 dark:text-slate-400 font-normal text-base ml-2">
              ({activityTypeLabels[selectedType]})
            </span>
          )}
        </h2>

        {activities === undefined ? (
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-16 bg-slate-300 dark:bg-slate-600 rounded"></div>
              <div className="h-16 bg-slate-300 dark:bg-slate-600 rounded"></div>
              <div className="h-16 bg-slate-300 dark:bg-slate-600 rounded"></div>
            </div>
          </div>
        ) : filteredActivities && filteredActivities.length > 0 ? (
          <div className="space-y-3">
            {filteredActivities.map((activity) => (
              <ActivityCard key={activity._id} activity={activity} />
            ))}
          </div>
        ) : (
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-8 text-center">
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {selectedType === 'all'
                ? 'No activities found. Click "Refresh Activity" to fetch from GitHub.'
                : `No ${activityTypeLabels[selectedType].toLowerCase()} found.`}
            </p>
            {selectedType === 'all' && (
              <button
                onClick={() => void handleRefresh()}
                disabled={isFetching}
                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                {isFetching ? 'Fetching...' : 'Refresh Activity'}
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function ActivityCard({ activity }: { activity: Activity }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{activityTypeIcons[activity.type]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-full">
              {activityTypeLabels[activity.type]}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{activity.repoFullName}</span>
          </div>
          <a
            href={activity.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-blue-600 dark:text-blue-400 hover:underline line-clamp-2"
          >
            {activity.title ?? 'View on GitHub'}
          </a>
          {activity.body && (
            <div className="mt-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                {isExpanded ? 'Hide details' : 'Show details'}
              </button>
              {isExpanded && (
                <div className="mt-2 p-3 bg-slate-200 dark:bg-slate-700 rounded text-sm whitespace-pre-wrap break-words max-h-48 overflow-auto">
                  {activity.body}
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {new Date(activity.activityCreatedAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
