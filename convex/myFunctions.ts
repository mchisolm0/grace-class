// Placeholder file for custom Convex functions
// The example functions have been removed as they referenced tables that no longer exist.
// Add your custom queries, mutations, and actions here.

import { query } from './_generated/server';

// Example: Get current user info
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    return {
      subject: identity.subject,
      name: identity.name,
      email: identity.email,
    };
  },
});
