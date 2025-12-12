import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id, Doc } from '../../convex/_generated/dataModel';

type Student = Doc<'students'>;

export function ClassDetail() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const classDoc = useQuery(api.classes.get, classId ? { id: classId as Id<'classes'> } : 'skip');
  const organization = useQuery(api.organizations.get, classDoc ? { id: classDoc.organizationId } : 'skip');
  const classStudents = useQuery(api.students.listByClass, classId ? { classId: classId as Id<'classes'> } : 'skip');
  const orgStudents = useQuery(
    api.students.listByOrganization,
    classDoc ? { organizationId: classDoc.organizationId } : 'skip',
  );
  const activityCounts = useQuery(
    api.activities.getCountsByClass,
    classId ? { classId: classId as Id<'classes'> } : 'skip',
  );

  const fetchForClass = useAction(api.activities.fetchForClass);

  const [isAssigning, setIsAssigning] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchResult, setFetchResult] = useState<{
    success: boolean;
    message: string;
    results?: Array<{ student: string; success: boolean; message: string }>;
  } | null>(null);

  const handleFetchAll = async () => {
    if (!classId) return;

    setIsFetching(true);
    setFetchResult(null);

    try {
      const result = await fetchForClass({ classId: classId as Id<'classes'> });
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

  if (classDoc === undefined) {
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

  if (classDoc === null) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-8 text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-4">Class not found.</p>
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

  const assignedStudentIds = new Set(classStudents?.map((s: Student) => s._id) ?? []);
  const unassignedStudents = orgStudents?.filter((s: Student) => !assignedStudentIds.has(s._id)) ?? [];

  // Create a map of student activity counts
  const studentCountsMap = new Map(activityCounts?.map((item) => [item.student._id, item.counts]) ?? []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <button
          onClick={() => {
            void navigate('/classes');
          }}
          className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-2 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Classes
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{classDoc.name}</h1>
            <p className="text-slate-600 dark:text-slate-400">
              {classDoc.year} • {organization?.name ?? 'Loading...'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void handleFetchAll()}
              disabled={isFetching || !classStudents || classStudents.length === 0}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                  Refresh All
                </>
              )}
            </button>
            <button
              onClick={() => setIsAssigning(true)}
              disabled={unassignedStudents.length === 0}
              className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Students
            </button>
          </div>
        </div>
      </div>

      {/* Fetch result message */}
      {fetchResult && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            fetchResult.success
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
          }`}
        >
          <p className="font-medium mb-2">{fetchResult.message}</p>
          {fetchResult.results && fetchResult.results.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer hover:underline">View details</summary>
              <ul className="mt-2 space-y-1 pl-4">
                {fetchResult.results.map((r, i) => (
                  <li
                    key={i}
                    className={r.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}
                  >
                    <span className="font-medium">@{r.student}:</span> {r.message}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {isAssigning && classId && (
        <AssignStudentsModal
          classId={classId as Id<'classes'>}
          unassignedStudents={unassignedStudents}
          onClose={() => setIsAssigning(false)}
        />
      )}

      <section>
        <h2 className="text-xl font-semibold mb-4">Students ({classStudents?.length ?? 0})</h2>

        {classStudents === undefined ? (
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-12 bg-slate-300 dark:bg-slate-600 rounded"></div>
              <div className="h-12 bg-slate-300 dark:bg-slate-600 rounded"></div>
              <div className="h-12 bg-slate-300 dark:bg-slate-600 rounded"></div>
            </div>
          </div>
        ) : classStudents.length === 0 ? (
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-8 text-center">
            <p className="text-slate-600 dark:text-slate-400 mb-4">No students assigned to this class yet.</p>
            {unassignedStudents.length > 0 ? (
              <button
                onClick={() => setIsAssigning(true)}
                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors"
              >
                Add Students
              </button>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-500">
                Sync members from the organization first to add students.
              </p>
            )}
          </div>
        ) : (
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg divide-y divide-slate-200 dark:divide-slate-700">
            {classStudents.map((student: Student) => (
              <StudentRow
                key={student._id}
                student={student}
                classId={classId as Id<'classes'>}
                activityCount={studentCountsMap.get(student._id)?.total ?? 0}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StudentRow({
  student,
  classId,
  activityCount,
}: {
  student: Student;
  classId: Id<'classes'>;
  activityCount: number;
}) {
  const removeFromClass = useMutation(api.students.removeFromClass);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await removeFromClass({ studentId: student._id, classId });
    } catch (err) {
      console.error('Failed to remove student:', err);
      setIsRemoving(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        {student.avatarUrl ? (
          <img src={student.avatarUrl} alt={student.githubUsername} className="w-10 h-10 rounded-full" />
        ) : (
          <div className="w-10 h-10 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <Link
              to={`/students/${student._id}`}
              className="font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {student.name}
            </Link>
            {activityCount > 0 && (
              <span className="text-xs px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-full">
                {activityCount} activities
              </span>
            )}
          </div>
          <a
            href={`https://github.com/${student.githubUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            @{student.githubUsername}
          </a>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link
          to={`/students/${student._id}`}
          className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          View Activity
        </Link>
        <button
          onClick={() => void handleRemove()}
          disabled={isRemoving}
          className="px-3 py-1 text-sm text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function AssignStudentsModal({
  classId,
  unassignedStudents,
  onClose,
}: {
  classId: Id<'classes'>;
  unassignedStudents: Student[];
  onClose: () => void;
}) {
  const assignManyToClass = useMutation(api.students.assignManyToClass);
  const [selectedIds, setSelectedIds] = useState<Set<Id<'students'>>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStudents = unassignedStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.githubUsername.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const toggleStudent = (id: Id<'students'>) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredStudents.map((s) => s._id)));
  };

  const selectNone = () => {
    setSelectedIds(new Set());
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) return;

    setIsSubmitting(true);
    try {
      await assignManyToClass({
        studentIds: Array.from(selectedIds),
        classId,
      });
      onClose();
    } catch (err) {
      console.error('Failed to assign students:', err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-lg w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Add Students to Class</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search students..."
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-slate-600 dark:text-slate-400">{selectedIds.size} selected</span>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-blue-600 dark:text-blue-400 hover:underline">
              Select All
            </button>
            <span className="text-slate-400">|</span>
            <button onClick={selectNone} className="text-blue-600 dark:text-blue-400 hover:underline">
              Select None
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto border border-slate-200 dark:border-slate-700 rounded-md mb-4">
          {filteredStudents.length === 0 ? (
            <div className="p-4 text-center text-slate-600 dark:text-slate-400">
              {searchQuery ? 'No students match your search.' : 'No unassigned students available.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredStudents.map((student) => (
                <label
                  key={student._id}
                  className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(student._id)}
                    onChange={() => toggleStudent(student._id)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                  />
                  {student.avatarUrl ? (
                    <img src={student.avatarUrl} alt={student.githubUsername} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{student.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate">@{student.githubUsername}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || selectedIds.size === 0}
            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Adding...' : `Add ${selectedIds.size} Student${selectedIds.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
