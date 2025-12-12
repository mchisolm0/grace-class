import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // GitHub OAuth connections for the teacher
  githubConnections: defineTable({
    userId: v.string(), // WorkOS user ID
    accessToken: v.string(), // GitHub OAuth access token
    githubUsername: v.string(),
    githubId: v.number(),
    avatarUrl: v.optional(v.string()),
    connectedAt: v.number(), // Timestamp
  }).index('by_user', ['userId']),

  // Organizations the teacher is tracking
  organizations: defineTable({
    userId: v.string(), // Owner (teacher)
    name: v.string(), // Org name
    githubId: v.number(),
    url: v.string(),
    avatarUrl: v.optional(v.string()),
    addedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_github_id', ['githubId']),

  // Classes for organizing students
  classes: defineTable({
    userId: v.string(), // Owner (teacher)
    organizationId: v.id('organizations'),
    name: v.string(),
    year: v.number(),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_organization', ['organizationId']),

  // Students from GitHub organizations
  students: defineTable({
    userId: v.string(), // Owner (teacher)
    organizationId: v.id('organizations'),
    classIds: v.array(v.id('classes')), // Can be in multiple classes
    name: v.string(),
    githubUsername: v.string(),
    githubId: v.number(),
    avatarUrl: v.optional(v.string()),
    addedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_organization', ['organizationId'])
    .index('by_github_id', ['githubId'])
    .index('by_class', ['classIds']),

  // Cached GitHub activities
  activities: defineTable({
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
    githubId: v.string(), // Unique GitHub identifier for deduplication
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    url: v.string(),
    repoFullName: v.string(),
    activityCreatedAt: v.number(), // When it happened on GitHub
    fetchedAt: v.number(), // When we fetched it
    rawData: v.any(), // Full GitHub API response
  })
    .index('by_student', ['studentId'])
    .index('by_github_id', ['githubId'])
    .index('by_type', ['type'])
    .index('by_student_and_type', ['studentId', 'type']),
});
