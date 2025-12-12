import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id, Doc } from '../../convex/_generated/dataModel';

type ClassDocument = Doc<'classes'>;
type Organization = Doc<'organizations'>;

export function Classes() {
  const classes = useQuery(api.classes.list);
  const organizations = useQuery(api.organizations.list);
  const [isCreating, setIsCreating] = useState(false);

  const hasOrganizations = organizations && organizations.length > 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Classes</h1>
        {hasOrganizations && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors"
          >
            Create Class
          </button>
        )}
      </div>

      {isCreating && organizations && (
        <CreateClassModal organizations={organizations} onClose={() => setIsCreating(false)} />
      )}

      {classes === undefined ? (
        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-slate-300 dark:bg-slate-600 rounded"></div>
            <div className="h-20 bg-slate-300 dark:bg-slate-600 rounded"></div>
          </div>
        </div>
      ) : !hasOrganizations ? (
        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-8 text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            You need to add an organization before creating classes.
          </p>
          <a
            href="/organizations"
            className="inline-block px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors"
          >
            Add Organization
          </a>
        </div>
      ) : classes.length === 0 ? (
        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-8 text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            No classes created yet. Create a class to start organizing students.
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors"
          >
            Create Your First Class
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {classes.map((classDoc: ClassDocument) => (
            <ClassCard key={classDoc._id} classDoc={classDoc} />
          ))}
        </div>
      )}
    </div>
  );
}

function CreateClassModal({ organizations, onClose }: { organizations: Organization[]; onClose: () => void }) {
  const createClass = useMutation(api.classes.create);
  const [name, setName] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [organizationId, setOrganizationId] = useState<Id<'organizations'> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || organizationId === null) {
      setError('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createClass({
        organizationId,
        name: name.trim(),
        year,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create class');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Create Class</h2>
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

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Class Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., CS 101 - Fall"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="year" className="block text-sm font-medium mb-1">
              Year
            </label>
            <input
              type="number"
              id="year"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              min={2000}
              max={2100}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="organization" className="block text-sm font-medium mb-1">
              Organization
            </label>
            <select
              id="organization"
              value={organizationId ?? ''}
              onChange={(e) => setOrganizationId(e.target.value ? (e.target.value as Id<'organizations'>) : null)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select an organization</option>
              {organizations.map((org) => (
                <option key={org._id} value={org._id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ClassCard({ classDoc }: { classDoc: ClassDocument }) {
  const organization = useQuery(api.organizations.get, { id: classDoc.organizationId });
  const studentCount = useQuery(api.classes.getStudentCount, { id: classDoc._id });
  const removeClass = useMutation(api.classes.remove);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${classDoc.name}"? Students will be unassigned from this class.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await removeClass({ id: classDoc._id });
    } catch (err) {
      console.error('Failed to delete class:', err);
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-semibold">{classDoc.name}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {classDoc.year} • {organization?.name ?? 'Loading...'}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {studentCount === undefined ? '...' : studentCount} students
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/classes/${classDoc._id}`}
            className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Manage Students
          </a>
          <button
            onClick={() => void handleDelete()}
            disabled={isDeleting}
            className="px-3 py-1 text-sm text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
