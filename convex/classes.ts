import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// Query to list all classes for the current user
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const classes = await ctx.db
      .query('classes')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .collect();

    return classes;
  },
});

// Query to list classes for a specific organization
export const listByOrganization = query({
  args: { organizationId: v.id('organizations') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const classes = await ctx.db
      .query('classes')
      .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
      .filter((q) => q.eq(q.field('userId'), identity.subject))
      .collect();

    return classes;
  },
});

// Query to get a single class by ID
export const get = query({
  args: { id: v.id('classes') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const classDoc = await ctx.db.get(args.id);
    if (!classDoc || classDoc.userId !== identity.subject) {
      return null;
    }

    return classDoc;
  },
});

// Mutation to create a new class
export const create = mutation({
  args: {
    organizationId: v.id('organizations'),
    name: v.string(),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Verify the organization belongs to this user
    const org = await ctx.db.get(args.organizationId);
    if (!org || org.userId !== identity.subject) {
      throw new Error('Organization not found');
    }

    return await ctx.db.insert('classes', {
      userId: identity.subject,
      organizationId: args.organizationId,
      name: args.name,
      year: args.year,
      createdAt: Date.now(),
    });
  },
});

// Mutation to update a class
export const update = mutation({
  args: {
    id: v.id('classes'),
    name: v.optional(v.string()),
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const classDoc = await ctx.db.get(args.id);
    if (!classDoc || classDoc.userId !== identity.subject) {
      throw new Error('Class not found');
    }

    const updates: { name?: string; year?: number } = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.year !== undefined) updates.year = args.year;

    await ctx.db.patch(args.id, updates);
  },
});

// Mutation to delete a class
export const remove = mutation({
  args: { id: v.id('classes') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const classDoc = await ctx.db.get(args.id);
    if (!classDoc || classDoc.userId !== identity.subject) {
      throw new Error('Class not found');
    }

    // Remove this class from all students' classIds
    const students = await ctx.db
      .query('students')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .collect();

    for (const student of students) {
      if (student.classIds.includes(args.id)) {
        await ctx.db.patch(student._id, {
          classIds: student.classIds.filter((cid) => cid !== args.id),
        });
      }
    }

    // Delete the class
    await ctx.db.delete(args.id);
  },
});

// Query to get student count for a class
export const getStudentCount = query({
  args: { id: v.id('classes') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return 0;
    }

    const students = await ctx.db
      .query('students')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .collect();

    return students.filter((s) => s.classIds.includes(args.id)).length;
  },
});
