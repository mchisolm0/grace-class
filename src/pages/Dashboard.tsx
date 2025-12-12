import { Authenticated, Unauthenticated, useQuery } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-react';
import { GitHubConnection } from '../components/GitHubConnection';
import { RateLimitStatus } from '../components/RateLimitStatus';
import { api } from '../../convex/_generated/api';
import { Doc } from '../../convex/_generated/dataModel';

type ClassDocument = Doc<'classes'>;

export function Dashboard() {
  return (
    <>
      <Authenticated>
        <DashboardContent />
      </Authenticated>
      <Unauthenticated>
        <UnauthenticatedView />
      </Unauthenticated>
    </>
  );
}

function DashboardContent() {
  const connection = useQuery(api.github.getConnection);
  const organizations = useQuery(api.organizations.list);
  const classes = useQuery(api.classes.list);
  const students = useQuery(api.students.list);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {/* GitHub Connection Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">GitHub Integration</h2>
        <GitHubConnection />
      </section>

      {/* Rate Limit Status */}
      {connection && (
        <section className="mb-8">
          <RateLimitStatus />
        </section>
      )}

      {/* Quick Stats */}
      {connection && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Organizations"
              value={organizations?.length ?? 0}
              href="/organizations"
              loading={organizations === undefined}
            />
            <StatCard title="Classes" value={classes?.length ?? 0} href="/classes" loading={classes === undefined} />
            <StatCard title="Students" value={students?.length ?? 0} loading={students === undefined} />
          </div>
        </section>
      )}

      {/* Recent Classes */}
      {connection && classes && classes.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Your Classes</h2>
            <a href="/classes" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              View all
            </a>
          </div>
          <div className="space-y-3">
            {classes.slice(0, 3).map((classDoc: ClassDocument) => (
              <ClassSummaryCard key={classDoc._id} classDoc={classDoc} />
            ))}
          </div>
        </section>
      )}

      {/* Getting Started */}
      {connection && organizations?.length === 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Get Started</h2>
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-6">
            <ol className="list-decimal list-inside space-y-3 text-slate-600 dark:text-slate-400">
              <li>
                <a href="/organizations" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Add a GitHub organization
                </a>{' '}
                to import students from
              </li>
              <li>Sync members to pull in student GitHub accounts</li>
              <li>Create classes to organize your students</li>
              <li>Assign students to classes to start tracking their activity</li>
              <li>
                <strong>Fetch activity</strong> for students to see their commits, PRs, issues, and comments
              </li>
            </ol>
          </div>
        </section>
      )}

      {/* Activity Tracking Info */}
      {connection && organizations && organizations.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Activity Tracking</h2>
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-6">
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Track GitHub activity for your students including:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ActivityTypeCard emoji="📝" label="Commits" />
              <ActivityTypeCard emoji="🔀" label="Pull Requests" />
              <ActivityTypeCard emoji="🎯" label="Issues" />
              <ActivityTypeCard emoji="💬" label="PR Comments" />
              <ActivityTypeCard emoji="💭" label="Issue Comments" />
              <ActivityTypeCard emoji="📌" label="Commit Comments" />
              <ActivityTypeCard emoji="🗣️" label="Discussions" />
              <ActivityTypeCard emoji="💡" label="Discussion Comments" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-4">
              Go to a class and click "Refresh All" to fetch activity for all students, or view individual students to
              refresh their activity.
            </p>
          </div>
        </section>
      )}

      {/* No GitHub Connection Prompt */}
      {connection === null && (
        <section className="mb-8">
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-6 text-center">
            <p className="text-slate-600 dark:text-slate-400 mb-2">
              Connect your GitHub account to start tracking student activity.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

function ActivityTypeCard({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="bg-slate-200 dark:bg-slate-700 rounded-lg p-3 text-center">
      <span className="text-xl">{emoji}</span>
      <p className="text-xs mt-1 text-slate-600 dark:text-slate-400">{label}</p>
    </div>
  );
}

function StatCard({ title, value, href, loading }: { title: string; value: number; href?: string; loading: boolean }) {
  const content = (
    <div
      className={`bg-slate-100 dark:bg-slate-800 rounded-lg p-6 ${
        href ? 'hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors' : ''
      }`}
    >
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{title}</p>
      {loading ? (
        <div className="h-8 w-12 bg-slate-300 dark:bg-slate-600 rounded animate-pulse"></div>
      ) : (
        <p className="text-3xl font-bold">{value}</p>
      )}
    </div>
  );

  if (href) {
    return <a href={href}>{content}</a>;
  }

  return content;
}

function ClassSummaryCard({ classDoc }: { classDoc: ClassDocument }) {
  const organization = useQuery(api.organizations.get, {
    id: classDoc.organizationId,
  });
  const studentCount = useQuery(api.classes.getStudentCount, {
    id: classDoc._id,
  });

  return (
    <a
      href={`/classes/${classDoc._id}`}
      className="block bg-slate-100 dark:bg-slate-800 rounded-lg p-4 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{classDoc.name}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {classDoc.year} • {organization?.name ?? '...'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{studentCount ?? '...'}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">students</p>
        </div>
      </div>
    </a>
  );
}

function UnauthenticatedView() {
  const { signIn } = useAuth();

  return (
    <div className="max-w-2xl mx-auto text-center">
      <h1 className="text-4xl font-bold mb-4">Welcome to Grace Class</h1>
      <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
        Track your students' GitHub activity including commits, pull requests, issues, and discussions all in one place.
      </p>
      <button
        onClick={() => void signIn()}
        className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors text-lg font-medium"
      >
        Sign In to Get Started
      </button>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        <FeatureCard
          title="Track Activity"
          description="Monitor commits, PRs, issues, and discussions across all student repositories."
        />
        <FeatureCard
          title="Organize Classes"
          description="Import students from your GitHub organizations and organize them into classes."
        />
        <FeatureCard
          title="View Summaries"
          description="Get activity summaries and timelines for each student at a glance."
        />
      </div>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-6">
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
    </div>
  );
}
