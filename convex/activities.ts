import { v } from 'convex/values';
import { query, action, internalMutation, internalQuery, internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { Id } from './_generated/dataModel';

// Activity types
export const activityTypes = [
  'commit',
  'pr',
  'issue',
  'pr_comment',
  'issue_comment',
  'commit_comment',
  'discussion',
  'discussion_comment',
] as const;

export type ActivityType = (typeof activityTypes)[number];

// Query to list activities for a student
export const listByStudent = query({
  args: {
    studentId: v.id('students'),
    type: v.optional(
      v.union(
        v.literal('commit'),
        v.literal('pr'),
        v.literal('issue'),
        v.literal('pr_comment'),
        v.literal('issue_comment'),
        v.literal('commit_comment'),
        v.literal('discussion'),
        v.literal('discussion_comment'),
      ),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Verify the student belongs to the current user
    const student = await ctx.db.get(args.studentId);
    if (!student || student.userId !== identity.subject) {
      return [];
    }

    let activitiesQuery;
    if (args.type) {
      activitiesQuery = ctx.db
        .query('activities')
        .withIndex('by_student_and_type', (q) => q.eq('studentId', args.studentId).eq('type', args.type!));
    } else {
      activitiesQuery = ctx.db.query('activities').withIndex('by_student', (q) => q.eq('studentId', args.studentId));
    }

    const activities = await activitiesQuery.collect();

    // Sort by activityCreatedAt descending
    activities.sort((a, b) => b.activityCreatedAt - a.activityCreatedAt);

    if (args.limit) {
      return activities.slice(0, args.limit);
    }

    return activities;
  },
});

// Query to get activity counts by type for a student
export const getCountsByStudent = query({
  args: { studentId: v.id('students') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const student = await ctx.db.get(args.studentId);
    if (!student || student.userId !== identity.subject) {
      return null;
    }

    const activities = await ctx.db
      .query('activities')
      .withIndex('by_student', (q) => q.eq('studentId', args.studentId))
      .collect();

    const counts: Record<string, number> = {
      commit: 0,
      pr: 0,
      issue: 0,
      pr_comment: 0,
      issue_comment: 0,
      commit_comment: 0,
      discussion: 0,
      discussion_comment: 0,
      total: 0,
    };

    for (const activity of activities) {
      counts[activity.type]++;
      counts.total++;
    }

    return counts;
  },
});

// Query to get activity counts for all students in a class
export const getCountsByClass = query({
  args: { classId: v.id('classes') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Get all students in this class
    const students = await ctx.db
      .query('students')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .collect();

    const classStudents = students.filter((s) => s.classIds.includes(args.classId));

    const results = [];
    for (const student of classStudents) {
      const activities = await ctx.db
        .query('activities')
        .withIndex('by_student', (q) => q.eq('studentId', student._id))
        .collect();

      const counts: Record<string, number> = {
        commit: 0,
        pr: 0,
        issue: 0,
        pr_comment: 0,
        issue_comment: 0,
        commit_comment: 0,
        discussion: 0,
        discussion_comment: 0,
        total: 0,
      };

      for (const activity of activities) {
        counts[activity.type]++;
        counts.total++;
      }

      results.push({
        student,
        counts,
        lastActivityAt: activities.length > 0 ? Math.max(...activities.map((a) => a.activityCreatedAt)) : null,
      });
    }

    // Sort by total activity descending
    results.sort((a, b) => b.counts.total - a.counts.total);

    return results;
  },
});

// Query to get the last fetch time for a student
export const getLastFetchTime = query({
  args: { studentId: v.id('students') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const student = await ctx.db.get(args.studentId);
    if (!student || student.userId !== identity.subject) {
      return null;
    }

    const activities = await ctx.db
      .query('activities')
      .withIndex('by_student', (q) => q.eq('studentId', args.studentId))
      .collect();

    if (activities.length === 0) {
      return null;
    }

    return Math.max(...activities.map((a) => a.fetchedAt));
  },
});

// Internal mutation to store activities (called by the action)
export const storeActivities = internalMutation({
  args: {
    activities: v.array(
      v.object({
        studentId: v.id('students'),
        type: v.union(
          v.literal('commit'),
          v.literal('pr'),
          v.literal('issue'),
          v.literal('pr_comment'),
          v.literal('issue_comment'),
          v.literal('commit_comment'),
          v.literal('discussion'),
          v.literal('discussion_comment'),
        ),
        githubId: v.string(),
        title: v.optional(v.string()),
        body: v.optional(v.string()),
        url: v.string(),
        repoFullName: v.string(),
        activityCreatedAt: v.number(),
        fetchedAt: v.number(),
        rawData: v.any(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let skipped = 0;

    for (const activity of args.activities) {
      // Check if this activity already exists (by githubId)
      const existing = await ctx.db
        .query('activities')
        .withIndex('by_github_id', (q) => q.eq('githubId', activity.githubId))
        .unique();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert('activities', activity);
      inserted++;
    }

    return { inserted, skipped };
  },
});

// Internal mutation to delete all activities for a student
export const deleteByStudent = internalMutation({
  args: { studentId: v.id('students') },
  handler: async (ctx, args) => {
    const activities = await ctx.db
      .query('activities')
      .withIndex('by_student', (q) => q.eq('studentId', args.studentId))
      .collect();

    for (const activity of activities) {
      await ctx.db.delete(activity._id);
    }

    return { deleted: activities.length };
  },
});

// Helper type for rate limit info
interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetAt: number;
}

// Helper function to parse rate limit headers
function parseRateLimitHeaders(headers: Headers): RateLimitInfo {
  return {
    remaining: parseInt(headers.get('x-ratelimit-remaining') || '5000', 10),
    limit: parseInt(headers.get('x-ratelimit-limit') || '5000', 10),
    resetAt: parseInt(headers.get('x-ratelimit-reset') || '0', 10) * 1000,
  };
}

// Helper function to make authenticated GitHub API requests
async function githubFetch(
  url: string,
  accessToken: string,
  customHeaders?: Record<string, string>,
): Promise<{ data: unknown; rateLimit: RateLimitInfo; ok: boolean }> {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Grace-Class-App',
      ...customHeaders,
    },
  });

  const rateLimit = parseRateLimitHeaders(response.headers);

  if (!response.ok) {
    console.error(`GitHub API error: ${response.status} ${response.statusText}`);
    return { data: null, rateLimit, ok: false };
  }

  const data = await response.json();
  return { data, rateLimit, ok: true };
}

// Helper function to fetch paginated data from GitHub (for endpoints that return arrays)
async function githubFetchPaginated(
  baseUrl: string,
  accessToken: string,
  maxPages: number = 3,
): Promise<{ items: unknown[]; rateLimit: RateLimitInfo }> {
  const items: unknown[] = [];
  let page = 1;
  let rateLimit: RateLimitInfo = { remaining: 5000, limit: 5000, resetAt: 0 };

  while (page <= maxPages) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    const url = `${baseUrl}${separator}page=${page}&per_page=100`;

    const result = await githubFetch(url, accessToken);
    rateLimit = result.rateLimit;

    if (!result.ok || !Array.isArray(result.data)) {
      break;
    }

    const pageData = result.data as unknown[];
    items.push(...pageData);

    if (pageData.length < 100) {
      break; // Last page
    }

    page++;

    // Check rate limit
    if (rateLimit.remaining < 10) {
      console.warn('Rate limit nearly exhausted, stopping pagination');
      break;
    }
  }

  return { items, rateLimit };
}

// Helper function to fetch paginated data from GitHub Search API
// Search API returns { items: [...], total_count: ... } wrapper
async function githubSearchPaginated(
  baseUrl: string,
  accessToken: string,
  maxPages: number = 2,
  customHeaders?: Record<string, string>,
): Promise<{ items: unknown[]; rateLimit: RateLimitInfo }> {
  const items: unknown[] = [];
  let page = 1;
  let rateLimit: RateLimitInfo = { remaining: 5000, limit: 5000, resetAt: 0 };

  while (page <= maxPages) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    const url = `${baseUrl}${separator}page=${page}&per_page=100`;

    const result = await githubFetch(url, accessToken, customHeaders);
    rateLimit = result.rateLimit;

    if (!result.ok) {
      console.error('GitHub Search API error:', result.data);
      break;
    }

    // Search API returns { items: [...], total_count: number, incomplete_results: boolean }
    const searchResponse = result.data as { items?: unknown[]; total_count?: number };

    if (!searchResponse.items || !Array.isArray(searchResponse.items)) {
      console.error('Unexpected Search API response format:', result.data);
      break;
    }

    const pageData = searchResponse.items;
    items.push(...pageData);

    if (pageData.length < 100) {
      break; // Last page
    }

    page++;

    // Check rate limit - Search API has stricter limits (30/min)
    if (rateLimit.remaining < 5) {
      console.warn('Rate limit nearly exhausted, stopping pagination');
      break;
    }
  }

  return { items, rateLimit };
}

// Action to fetch GitHub activity for a student
export const fetchForStudent = action({
  args: { studentId: v.id('students') },
  handler: async (ctx, args): Promise<{ success: boolean; message: string; rateLimit?: RateLimitInfo }> => {
    // Get the current user's identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, message: 'Not authenticated' };
    }

    // Get the student
    const student = await ctx.runQuery(internal.activities.getStudentInternal, {
      studentId: args.studentId,
      userId: identity.subject,
    });

    if (!student) {
      return { success: false, message: 'Student not found' };
    }

    // Get the access token
    const accessToken = await ctx.runQuery(internal.activities.getAccessTokenInternal, {
      userId: identity.subject,
    });

    if (!accessToken) {
      return { success: false, message: 'GitHub not connected' };
    }

    const username = student.githubUsername;
    const now = Date.now();
    const allActivities: Array<{
      studentId: Id<'students'>;
      type: ActivityType;
      githubId: string;
      title?: string;
      body?: string;
      url: string;
      repoFullName: string;
      activityCreatedAt: number;
      fetchedAt: number;
      rawData: unknown;
    }> = [];

    let lastRateLimit: RateLimitInfo = { remaining: 5000, limit: 5000, resetAt: 0 };

    try {
      // Fetch Issues created by the user (using Search API)
      const issuesResult = await githubSearchPaginated(
        `https://api.github.com/search/issues?q=author:${username}+type:issue&sort=created&order=desc`,
        accessToken,
        2,
      );
      lastRateLimit = issuesResult.rateLimit;

      for (const item of issuesResult.items as Array<{
        id: number;
        title: string;
        body: string | null;
        html_url: string;
        created_at: string;
        repository_url: string;
      }>) {
        const repoFullName = item.repository_url.replace('https://api.github.com/repos/', '');
        allActivities.push({
          studentId: args.studentId,
          type: 'issue',
          githubId: `issue-${item.id}`,
          title: item.title,
          body: item.body ?? undefined,
          url: item.html_url,
          repoFullName,
          activityCreatedAt: new Date(item.created_at).getTime(),
          fetchedAt: now,
          rawData: item,
        });
      }

      // Fetch PRs created by the user (using Search API)
      const prsResult = await githubSearchPaginated(
        `https://api.github.com/search/issues?q=author:${username}+type:pr&sort=created&order=desc`,
        accessToken,
        2,
      );
      lastRateLimit = prsResult.rateLimit;

      for (const item of prsResult.items as Array<{
        id: number;
        title: string;
        body: string | null;
        html_url: string;
        created_at: string;
        repository_url: string;
      }>) {
        const repoFullName = item.repository_url.replace('https://api.github.com/repos/', '');
        allActivities.push({
          studentId: args.studentId,
          type: 'pr',
          githubId: `pr-${item.id}`,
          title: item.title,
          body: item.body ?? undefined,
          url: item.html_url,
          repoFullName,
          activityCreatedAt: new Date(item.created_at).getTime(),
          fetchedAt: now,
          rawData: item,
        });
      }

      // Fetch commits using Search API (works for private repos the user has access to)
      // Commits Search API requires special Accept header
      const commitsResult = await githubSearchPaginated(
        `https://api.github.com/search/commits?q=author:${username}&sort=author-date&order=desc`,
        accessToken,
        2,
        { Accept: 'application/vnd.github.cloak-preview+json' },
      );
      console.log(`Search API: Found ${commitsResult.items.length} commits for ${username}`);
      lastRateLimit = commitsResult.rateLimit;

      for (const item of commitsResult.items as Array<{
        sha: string;
        html_url: string;
        commit: {
          message: string;
          author: { date: string };
        };
        repository: { full_name: string };
      }>) {
        allActivities.push({
          studentId: args.studentId,
          type: 'commit',
          githubId: `commit-${item.sha}`,
          title: item.commit.message.split('\n')[0],
          body: item.commit.message,
          url: item.html_url,
          repoFullName: item.repository.full_name,
          activityCreatedAt: new Date(item.commit.author.date).getTime(),
          fetchedAt: now,
          rawData: item,
        });
      }

      // Fetch user events (includes commits from public repos, comments, etc.)
      // Note: Events API only returns public events, but we use it for comments
      const eventsResult = await githubFetchPaginated(
        `https://api.github.com/users/${username}/events/public`,
        accessToken,
        5, // Fetch more pages for events since they're lightweight
      );
      console.log(`Events API: Found ${eventsResult.items.length} events for ${username}`);
      lastRateLimit = eventsResult.rateLimit;

      // Log event types for debugging
      const eventTypes = new Map<string, number>();
      for (const e of eventsResult.items as Array<{ type: string }>) {
        eventTypes.set(e.type, (eventTypes.get(e.type) || 0) + 1);
      }
      console.log(`Event types for ${username}:`, Object.fromEntries(eventTypes));

      for (const event of eventsResult.items as Array<{
        id: string;
        type: string;
        created_at: string;
        repo: { name: string };
        payload: {
          commits?: Array<{ sha: string; message: string; url: string }>;
          comment?: { id: number; body: string; html_url: string };
          issue?: { number: number; title: string };
          pull_request?: { number: number; title: string; html_url: string };
          action?: string;
        };
      }>) {
        const repoFullName = event.repo.name;
        const createdAt = new Date(event.created_at).getTime();

        switch (event.type) {
          case 'PushEvent':
            // Skip commits from Events API - we already got them from Search API
            // Search API is more reliable for private repos
            break;

          case 'IssueCommentEvent':
            if (event.payload.comment) {
              allActivities.push({
                studentId: args.studentId,
                type: 'issue_comment',
                githubId: `issue-comment-${event.payload.comment.id}`,
                title: `Comment on: ${event.payload.issue?.title ?? 'Unknown'}`,
                body: event.payload.comment.body,
                url: event.payload.comment.html_url,
                repoFullName,
                activityCreatedAt: createdAt,
                fetchedAt: now,
                rawData: event,
              });
            }
            break;

          case 'PullRequestReviewCommentEvent':
            if (event.payload.comment) {
              allActivities.push({
                studentId: args.studentId,
                type: 'pr_comment',
                githubId: `pr-comment-${event.payload.comment.id}`,
                title: `Review comment on: ${event.payload.pull_request?.title ?? 'Unknown'}`,
                body: event.payload.comment.body,
                url: event.payload.comment.html_url,
                repoFullName,
                activityCreatedAt: createdAt,
                fetchedAt: now,
                rawData: event,
              });
            }
            break;

          case 'PullRequestReviewEvent':
            if (event.payload.action === 'submitted') {
              allActivities.push({
                studentId: args.studentId,
                type: 'pr_comment',
                githubId: `pr-review-${event.id}`,
                title: `Review on: ${event.payload.pull_request?.title ?? 'Unknown'}`,
                url: event.payload.pull_request?.html_url ?? `https://github.com/${repoFullName}`,
                repoFullName,
                activityCreatedAt: createdAt,
                fetchedAt: now,
                rawData: event,
              });
            }
            break;

          case 'CommitCommentEvent':
            if (event.payload.comment) {
              allActivities.push({
                studentId: args.studentId,
                type: 'commit_comment',
                githubId: `commit-comment-${event.payload.comment.id}`,
                title: 'Comment on commit',
                body: event.payload.comment.body,
                url: event.payload.comment.html_url,
                repoFullName,
                activityCreatedAt: createdAt,
                fetchedAt: now,
                rawData: event,
              });
            }
            break;
        }
      }

      // Store all activities
      const result = await ctx.runMutation(internal.activities.storeActivities, {
        activities: allActivities,
      });

      return {
        success: true,
        message: `Fetched ${allActivities.length} activities. ${result.inserted} new, ${result.skipped} already existed.`,
        rateLimit: lastRateLimit,
      };
    } catch (error) {
      console.error('Error fetching GitHub activities:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        rateLimit: lastRateLimit,
      };
    }
  },
});

// Action to fetch activities for all students in a class
export const fetchForClass = action({
  args: { classId: v.id('classes') },
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    message: string;
    results: Array<{ student: string; success: boolean; message: string }>;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, message: 'Not authenticated', results: [] };
    }

    // Get all students in the class
    const students = await ctx.runQuery(internal.activities.getStudentsByClassInternal, {
      classId: args.classId,
      userId: identity.subject,
    });

    if (!students || students.length === 0) {
      return { success: false, message: 'No students found in class', results: [] };
    }

    const results: Array<{ student: string; success: boolean; message: string }> = [];

    for (const student of students) {
      const result = await ctx.runAction(internal.activities.fetchForStudentInternal, {
        studentId: student._id,
        userId: identity.subject,
      });

      results.push({
        student: student.githubUsername,
        success: result.success,
        message: result.message,
      });

      // Check rate limit and stop if nearly exhausted
      if (result.rateLimit && result.rateLimit.remaining < 50) {
        results.push({
          student: 'STOPPED',
          success: false,
          message: `Rate limit nearly exhausted (${result.rateLimit.remaining} remaining). Stopping.`,
        });
        break;
      }
    }

    const successCount = results.filter((r) => r.success).length;
    return {
      success: successCount > 0,
      message: `Fetched activities for ${successCount}/${students.length} students`,
      results,
    };
  },
});

// Internal query to get student (for use by action)
export const getStudentInternal = internalQuery({
  args: {
    studentId: v.id('students'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const student = await ctx.db.get(args.studentId);
    if (!student || student.userId !== args.userId) {
      return null;
    }
    return student;
  },
});

// Internal query to get students by class (for use by action)
export const getStudentsByClassInternal = internalQuery({
  args: {
    classId: v.id('classes'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const students = await ctx.db
      .query('students')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    return students.filter((s) => s.classIds.includes(args.classId));
  },
});

// Internal query to get access token (for use by action)
export const getAccessTokenInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query('githubConnections')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .unique();

    return connection?.accessToken ?? null;
  },
});

// Internal action to fetch for a student (called by fetchForClass)
export const fetchForStudentInternal = internalAction({
  args: {
    studentId: v.id('students'),
    userId: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message: string; rateLimit?: RateLimitInfo }> => {
    // Get the student
    const student = await ctx.runQuery(internal.activities.getStudentInternal, {
      studentId: args.studentId,
      userId: args.userId,
    });

    if (!student) {
      return { success: false, message: 'Student not found' };
    }

    // Get the access token
    const accessToken = await ctx.runQuery(internal.activities.getAccessTokenInternal, {
      userId: args.userId,
    });

    if (!accessToken) {
      return { success: false, message: 'GitHub not connected' };
    }

    const username = student.githubUsername;
    const now = Date.now();
    const allActivities: Array<{
      studentId: Id<'students'>;
      type: ActivityType;
      githubId: string;
      title?: string;
      body?: string;
      url: string;
      repoFullName: string;
      activityCreatedAt: number;
      fetchedAt: number;
      rawData: unknown;
    }> = [];

    let lastRateLimit: RateLimitInfo = { remaining: 5000, limit: 5000, resetAt: 0 };

    try {
      // Fetch Issues created by the user (using Search API)
      const issuesResult = await githubSearchPaginated(
        `https://api.github.com/search/issues?q=author:${username}+type:issue&sort=created&order=desc`,
        accessToken,
        2,
      );
      lastRateLimit = issuesResult.rateLimit;

      for (const item of issuesResult.items as Array<{
        id: number;
        title: string;
        body: string | null;
        html_url: string;
        created_at: string;
        repository_url: string;
      }>) {
        const repoFullName = item.repository_url.replace('https://api.github.com/repos/', '');
        allActivities.push({
          studentId: args.studentId,
          type: 'issue',
          githubId: `issue-${item.id}`,
          title: item.title,
          body: item.body ?? undefined,
          url: item.html_url,
          repoFullName,
          activityCreatedAt: new Date(item.created_at).getTime(),
          fetchedAt: now,
          rawData: item,
        });
      }

      // Fetch PRs created by the user (using Search API)
      const prsResult = await githubSearchPaginated(
        `https://api.github.com/search/issues?q=author:${username}+type:pr&sort=created&order=desc`,
        accessToken,
        2,
      );
      lastRateLimit = prsResult.rateLimit;

      for (const item of prsResult.items as Array<{
        id: number;
        title: string;
        body: string | null;
        html_url: string;
        created_at: string;
        repository_url: string;
      }>) {
        const repoFullName = item.repository_url.replace('https://api.github.com/repos/', '');
        allActivities.push({
          studentId: args.studentId,
          type: 'pr',
          githubId: `pr-${item.id}`,
          title: item.title,
          body: item.body ?? undefined,
          url: item.html_url,
          repoFullName,
          activityCreatedAt: new Date(item.created_at).getTime(),
          fetchedAt: now,
          rawData: item,
        });
      }

      // Fetch commits using Search API (works for private repos the user has access to)
      // Commits Search API requires special Accept header
      const commitsResult = await githubSearchPaginated(
        `https://api.github.com/search/commits?q=author:${username}&sort=author-date&order=desc`,
        accessToken,
        2,
        { Accept: 'application/vnd.github.cloak-preview+json' },
      );
      lastRateLimit = commitsResult.rateLimit;

      for (const item of commitsResult.items as Array<{
        sha: string;
        html_url: string;
        commit: {
          message: string;
          author: { date: string };
        };
        repository: { full_name: string };
      }>) {
        allActivities.push({
          studentId: args.studentId,
          type: 'commit',
          githubId: `commit-${item.sha}`,
          title: item.commit.message.split('\n')[0],
          body: item.commit.message,
          url: item.html_url,
          repoFullName: item.repository.full_name,
          activityCreatedAt: new Date(item.commit.author.date).getTime(),
          fetchedAt: now,
          rawData: item,
        });
      }

      // Fetch user events (for comments - commits come from Search API above)
      const eventsResult = await githubFetchPaginated(
        `https://api.github.com/users/${username}/events/public`,
        accessToken,
        5, // Fetch more pages for events since they're lightweight
      );
      lastRateLimit = eventsResult.rateLimit;

      for (const event of eventsResult.items as Array<{
        id: string;
        type: string;
        created_at: string;
        repo: { name: string };
        payload: {
          commits?: Array<{ sha: string; message: string; url: string }>;
          comment?: { id: number; body: string; html_url: string };
          issue?: { number: number; title: string };
          pull_request?: { number: number; title: string; html_url: string };
          action?: string;
        };
      }>) {
        const repoFullName = event.repo.name;
        const createdAt = new Date(event.created_at).getTime();

        switch (event.type) {
          case 'PushEvent':
            // Skip commits from Events API - we already got them from Search API
            break;

          case 'IssueCommentEvent':
            if (event.payload.comment) {
              allActivities.push({
                studentId: args.studentId,
                type: 'issue_comment',
                githubId: `issue-comment-${event.payload.comment.id}`,
                title: `Comment on: ${event.payload.issue?.title ?? 'Unknown'}`,
                body: event.payload.comment.body,
                url: event.payload.comment.html_url,
                repoFullName,
                activityCreatedAt: createdAt,
                fetchedAt: now,
                rawData: event,
              });
            }
            break;

          case 'PullRequestReviewCommentEvent':
            if (event.payload.comment) {
              allActivities.push({
                studentId: args.studentId,
                type: 'pr_comment',
                githubId: `pr-comment-${event.payload.comment.id}`,
                title: `Review comment on: ${event.payload.pull_request?.title ?? 'Unknown'}`,
                body: event.payload.comment.body,
                url: event.payload.comment.html_url,
                repoFullName,
                activityCreatedAt: createdAt,
                fetchedAt: now,
                rawData: event,
              });
            }
            break;

          case 'PullRequestReviewEvent':
            if (event.payload.action === 'submitted') {
              allActivities.push({
                studentId: args.studentId,
                type: 'pr_comment',
                githubId: `pr-review-${event.id}`,
                title: `Review on: ${event.payload.pull_request?.title ?? 'Unknown'}`,
                url: event.payload.pull_request?.html_url ?? `https://github.com/${repoFullName}`,
                repoFullName,
                activityCreatedAt: createdAt,
                fetchedAt: now,
                rawData: event,
              });
            }
            break;

          case 'CommitCommentEvent':
            if (event.payload.comment) {
              allActivities.push({
                studentId: args.studentId,
                type: 'commit_comment',
                githubId: `commit-comment-${event.payload.comment.id}`,
                title: 'Comment on commit',
                body: event.payload.comment.body,
                url: event.payload.comment.html_url,
                repoFullName,
                activityCreatedAt: createdAt,
                fetchedAt: now,
                rawData: event,
              });
            }
            break;
        }
      }

      // Store all activities
      const result = await ctx.runMutation(internal.activities.storeActivities, {
        activities: allActivities,
      });

      return {
        success: true,
        message: `Fetched ${allActivities.length} activities. ${result.inserted} new, ${result.skipped} already existed.`,
        rateLimit: lastRateLimit,
      };
    } catch (error) {
      console.error('Error fetching GitHub activities:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        rateLimit: lastRateLimit,
      };
    }
  },
});

// Query to check GitHub rate limit status
export const checkRateLimit = action({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; rateLimit?: RateLimitInfo; message?: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, message: 'Not authenticated' };
    }

    const accessToken = await ctx.runQuery(internal.activities.getAccessTokenInternal, {
      userId: identity.subject,
    });

    if (!accessToken) {
      return { success: false, message: 'GitHub not connected' };
    }

    const result = await githubFetch('https://api.github.com/rate_limit', accessToken);

    if (!result.ok) {
      return { success: false, message: 'Failed to fetch rate limit' };
    }

    return {
      success: true,
      rateLimit: result.rateLimit,
    };
  },
});
