import { Authenticated, Unauthenticated } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-react';
import { GitHubConnection } from '../components/GitHubConnection';

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
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {/* GitHub Connection Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">GitHub Integration</h2>
        <GitHubConnection />
      </section>

      {/* Placeholder for future sections */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Your Classes</h2>
        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-6 text-center text-slate-600 dark:text-slate-400">
          <p>No classes yet. Connect GitHub and add an organization to get started.</p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-6 text-center text-slate-600 dark:text-slate-400">
          <p>No activity to display. Add students to start tracking their GitHub activity.</p>
        </div>
      </section>
    </div>
  );
}

function UnauthenticatedView() {
  const { signIn } = useAuth();

  return (
    <div className="max-w-2xl mx-auto text-center">
      <h1 className="text-4xl font-bold mb-4">Welcome to Grace Class</h1>
      <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
        Track your students' GitHub activity including commits, pull requests, issues, and
        discussions all in one place.
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
