import { v } from 'convex/values';
import { mutation, query, internalQuery } from './_generated/server';

// Query to get the current user's GitHub connection
export const getConnection = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const connection = await ctx.db
      .query('githubConnections')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .unique();

    if (!connection) {
      return null;
    }

    // Don't expose the access token to the client
    return {
      _id: connection._id,
      githubUsername: connection.githubUsername,
      githubId: connection.githubId,
      avatarUrl: connection.avatarUrl,
      connectedAt: connection.connectedAt,
    };
  },
});

// Mutation to disconnect GitHub account
export const disconnect = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const connection = await ctx.db
      .query('githubConnections')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .unique();

    if (connection) {
      await ctx.db.delete(connection._id);
    }
  },
});

// Mutation for frontend to save GitHub connection after OAuth callback
export const saveConnection = mutation({
  args: {
    accessToken: v.string(),
    githubUsername: v.string(),
    githubId: v.number(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Check if connection already exists
    const existing = await ctx.db
      .query('githubConnections')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .unique();

    if (existing) {
      // Update existing connection
      await ctx.db.patch(existing._id, {
        accessToken: args.accessToken,
        githubUsername: args.githubUsername,
        githubId: args.githubId,
        avatarUrl: args.avatarUrl,
        connectedAt: Date.now(),
      });
      return existing._id;
    }

    // Create new connection
    return await ctx.db.insert('githubConnections', {
      userId: identity.subject,
      accessToken: args.accessToken,
      githubUsername: args.githubUsername,
      githubId: args.githubId,
      avatarUrl: args.avatarUrl,
      connectedAt: Date.now(),
    });
  },
});

// Internal query to get access token for API calls
export const getAccessToken = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const connection = await ctx.db
      .query('githubConnections')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .unique();

    return connection?.accessToken ?? null;
  },
});

// Internal query to get access token (for use by other Convex functions)
export const getAccessTokenInternal = internalQuery({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query('githubConnections')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .unique();

    return connection?.accessToken ?? null;
  },
});

// Generate the GitHub OAuth URL for the frontend
export const getOAuthUrl = query({
  args: {},
  handler: async () => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      throw new Error('GITHUB_CLIENT_ID not configured');
    }

    // The callback URL should point to your Convex HTTP endpoint
    // This will be set up in http.ts
    const redirectUri = `${process.env.CONVEX_SITE_URL}/api/github/callback`;

    const scope = 'read:user read:org repo';

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state: crypto.randomUUID(), // For CSRF protection
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  },
});
