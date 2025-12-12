import { v } from 'convex/values';
import { mutation, query, action, internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';

// Query to list all organizations for the current user
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const organizations = await ctx.db
      .query('organizations')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .collect();

    return organizations;
  },
});

// Query to get a single organization by ID
export const get = query({
  args: { id: v.id('organizations') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const org = await ctx.db.get(args.id);
    if (!org || org.userId !== identity.subject) {
      return null;
    }

    return org;
  },
});

// Mutation to add an organization
export const add = mutation({
  args: {
    name: v.string(),
    githubId: v.number(),
    url: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Check if org already exists for this user
    const existing = await ctx.db
      .query('organizations')
      .withIndex('by_github_id', (q) => q.eq('githubId', args.githubId))
      .filter((q) => q.eq(q.field('userId'), identity.subject))
      .unique();

    if (existing) {
      throw new Error('Organization already added');
    }

    return await ctx.db.insert('organizations', {
      userId: identity.subject,
      name: args.name,
      githubId: args.githubId,
      url: args.url,
      avatarUrl: args.avatarUrl,
      addedAt: Date.now(),
    });
  },
});

// Mutation to remove an organization
export const remove = mutation({
  args: { id: v.id('organizations') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const org = await ctx.db.get(args.id);
    if (!org || org.userId !== identity.subject) {
      throw new Error('Organization not found');
    }

    // Delete all students associated with this org
    const students = await ctx.db
      .query('students')
      .withIndex('by_organization', (q) => q.eq('organizationId', args.id))
      .collect();

    for (const student of students) {
      await ctx.db.delete(student._id);
    }

    // Delete all classes associated with this org
    const classes = await ctx.db
      .query('classes')
      .withIndex('by_organization', (q) => q.eq('organizationId', args.id))
      .collect();

    for (const classDoc of classes) {
      await ctx.db.delete(classDoc._id);
    }

    // Delete the organization
    await ctx.db.delete(args.id);
  },
});

// Internal mutation to store fetched organization members
export const storeMembers = internalMutation({
  args: {
    organizationId: v.id('organizations'),
    userId: v.string(),
    members: v.array(
      v.object({
        login: v.string(),
        id: v.number(),
        avatar_url: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // Get existing students for this org
    const existingStudents = await ctx.db
      .query('students')
      .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
      .collect();

    const existingGithubIds = new Set(existingStudents.map((s) => s.githubId));

    // Add new members that don't already exist
    for (const member of args.members) {
      if (!existingGithubIds.has(member.id)) {
        await ctx.db.insert('students', {
          userId: args.userId,
          organizationId: args.organizationId,
          classIds: [],
          name: member.login, // Use login as default name
          githubUsername: member.login,
          githubId: member.id,
          avatarUrl: member.avatar_url,
          addedAt: Date.now(),
        });
      }
    }

    return { added: args.members.length - existingGithubIds.size };
  },
});

// Action to fetch organization members from GitHub API
export const fetchMembers = action({
  args: { organizationId: v.id('organizations') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Get the organization
    const org = await ctx.runQuery(internal.organizations.getInternal, {
      id: args.organizationId,
      userId: identity.subject,
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    // Get the GitHub access token
    const accessToken = await ctx.runQuery(internal.github.getAccessTokenInternal, {
      userId: identity.subject,
    });

    if (!accessToken) {
      throw new Error('GitHub not connected');
    }

    // Fetch members from GitHub API (paginated)
    const allMembers: Array<{ login: string; id: number; avatar_url: string }> = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await fetch(`https://api.github.com/orgs/${org.name}/members?per_page=${perPage}&page=${page}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Grace-Class-App',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('GitHub API error:', response.status, errorText);
        throw new Error(`Failed to fetch organization members: ${response.status}`);
      }

      const members = await response.json();

      if (members.length === 0) {
        break;
      }

      allMembers.push(
        ...members.map((m: { login: string; id: number; avatar_url: string }) => ({
          login: m.login,
          id: m.id,
          avatar_url: m.avatar_url,
        })),
      );

      if (members.length < perPage) {
        break;
      }

      page++;
    }

    // Store the members in the database
    await ctx.runMutation(internal.organizations.storeMembers, {
      organizationId: args.organizationId,
      userId: identity.subject,
      members: allMembers,
    });

    return { memberCount: allMembers.length };
  },
});

// Internal query to get organization (bypasses auth for internal use)
export const getInternal = internalQuery({
  args: {
    id: v.id('organizations'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.id);
    if (!org || org.userId !== args.userId) {
      return null;
    }
    return org;
  },
});

// Action to search for GitHub organizations the user has access to
export const searchUserOrgs = action({
  args: {},
  handler: async (ctx): Promise<Array<{ name: string; githubId: number; avatarUrl: string; url: string }>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Get the GitHub access token
    const accessToken: string | null = await ctx.runQuery(internal.github.getAccessTokenInternal, {
      userId: identity.subject,
    });

    if (!accessToken) {
      throw new Error('GitHub not connected');
    }

    // Fetch user's organizations from GitHub
    const response: Response = await fetch('https://api.github.com/user/orgs?per_page=100', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Grace-Class-App',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API error:', response.status, errorText);
      throw new Error(`Failed to fetch organizations: ${response.status}`);
    }

    const orgs: Array<{ login: string; id: number; avatar_url: string; url: string }> = await response.json();

    return orgs.map((org) => ({
      name: org.login,
      githubId: org.id,
      avatarUrl: org.avatar_url,
      url: `https://github.com/${org.login}`,
    }));
  },
});
