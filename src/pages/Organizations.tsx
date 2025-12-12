import { useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Doc } from '../../convex/_generated/dataModel';

type Organization = Doc<'organizations'>;
type Student = Doc<'students'>;

export function Organizations() {
  const organizations = useQuery(api.organizations.list);
  const [isAddingOrg, setIsAddingOrg] = useState(false);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Organizations</h1>
        <button
          onClick={() => setIsAddingOrg(true)}
          className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors"
        >
          Add Organization
        </button>
      </div>

      {isAddingOrg && <AddOrganizationModal onClose={() => setIsAddingOrg(false)} />}

      {organizations === undefined ? (
        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-slate-300 dark:bg-slate-600 rounded"></div>
            <div className="h-16 bg-slate-300 dark:bg-slate-600 rounded"></div>
          </div>
        </div>
      ) : organizations.length === 0 ? (
        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-8 text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            No organizations added yet. Add a GitHub organization to start tracking students.
          </p>
          <button
            onClick={() => setIsAddingOrg(true)}
            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors"
          >
            Add Your First Organization
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {organizations.map((org: Organization) => (
            <OrganizationCard key={org._id} organization={org} />
          ))}
        </div>
      )}
    </div>
  );
}

function AddOrganizationModal({ onClose }: { onClose: () => void }) {
  const searchUserOrgs = useAction(api.organizations.searchUserOrgs);
  const addOrganization = useMutation(api.organizations.add);
  const [availableOrgs, setAvailableOrgs] = useState<
    Array<{ name: string; githubId: number; avatarUrl: string; url: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const orgs = await searchUserOrgs();
      setAvailableOrgs(orgs);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (org: { name: string; githubId: number; avatarUrl: string; url: string }) => {
    try {
      await addOrganization({
        name: org.name,
        githubId: org.githubId,
        url: org.url,
        avatarUrl: org.avatarUrl,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add organization');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-lg w-full max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Add Organization</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        {!searched ? (
          <div className="text-center py-4">
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Search for GitHub organizations you have access to.
            </p>
            <button
              onClick={() => void handleSearch()}
              disabled={loading}
              className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search My Organizations'}
            </button>
          </div>
        ) : availableOrgs.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-slate-600 dark:text-slate-400">
              No organizations found. Make sure you are a member of at least one GitHub organization.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {availableOrgs.map((org) => (
              <div
                key={org.githubId}
                className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-700 rounded-md"
              >
                <div className="flex items-center gap-3">
                  {org.avatarUrl ? (
                    <img src={org.avatarUrl} alt={org.name} className="w-10 h-10 rounded-md" />
                  ) : (
                    <div className="w-10 h-10 bg-slate-300 dark:bg-slate-600 rounded-md"></div>
                  )}
                  <div>
                    <p className="font-medium">{org.name}</p>
                    <a
                      href={org.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View on GitHub
                    </a>
                  </div>
                </div>
                <button
                  onClick={() => void handleAdd(org)}
                  className="px-3 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm rounded-md hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OrganizationCard({ organization }: { organization: Organization }) {
  const removeOrganization = useMutation(api.organizations.remove);
  const fetchMembers = useAction(api.organizations.fetchMembers);
  const students = useQuery(api.students.listByOrganization, { organizationId: organization._id });
  const [isFetching, setIsFetching] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleFetchMembers = async () => {
    setIsFetching(true);
    try {
      await fetchMembers({ organizationId: organization._id });
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleRemove = async () => {
    if (
      !confirm(
        'Are you sure you want to remove this organization? All associated students and classes will be deleted.',
      )
    ) {
      return;
    }
    setIsRemoving(true);
    try {
      await removeOrganization({ id: organization._id });
    } catch (err) {
      console.error('Failed to remove organization:', err);
      setIsRemoving(false);
    }
  };

  return (
    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {organization.avatarUrl ? (
            <img src={organization.avatarUrl} alt={organization.name} className="w-16 h-16 rounded-md" />
          ) : (
            <div className="w-16 h-16 bg-slate-300 dark:bg-slate-600 rounded-md"></div>
          )}
          <div>
            <h3 className="text-xl font-semibold">{organization.name}</h3>
            <a
              href={organization.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              View on GitHub
            </a>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {students === undefined ? '...' : students.length} members
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void handleFetchMembers()}
            disabled={isFetching}
            className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {isFetching ? 'Syncing...' : 'Sync Members'}
          </button>
          <button
            onClick={() => void handleRemove()}
            disabled={isRemoving}
            className="px-3 py-1 text-sm text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      </div>

      {students && students.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-sm font-medium mb-2">Members:</p>
          <div className="flex flex-wrap gap-2">
            {students.slice(0, 10).map((student: Student) => (
              <div
                key={student._id}
                className="flex items-center gap-2 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-md"
              >
                {student.avatarUrl && (
                  <img src={student.avatarUrl} alt={student.githubUsername} className="w-5 h-5 rounded-full" />
                )}
                <span className="text-sm">{student.githubUsername}</span>
              </div>
            ))}
            {students.length > 10 && (
              <span className="text-sm text-slate-600 dark:text-slate-400 px-2 py-1">+{students.length - 10} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
