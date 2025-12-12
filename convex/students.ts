import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// Query to list all students for the current user
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const students = await ctx.db
      .query('students')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .collect();

    return students;
  },
});

// Query to list students by organization
export const listByOrganization = query({
  args: { organizationId: v.id('organizations') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const students = await ctx.db
      .query('students')
      .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
      .filter((q) => q.eq(q.field('userId'), identity.subject))
      .collect();

    return students;
  },
});

// Query to list students by class
export const listByClass = query({
  args: { classId: v.id('classes') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Get all students for the user and filter by classId
    const students = await ctx.db
      .query('students')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .collect();

    return students.filter((s) => s.classIds.includes(args.classId));
  },
});

// Query to get a single student by ID
export const get = query({
  args: { id: v.id('students') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const student = await ctx.db.get(args.id);
    if (!student || student.userId !== identity.subject) {
      return null;
    }

    return student;
  },
});

// Mutation to update a student's name
export const updateName = mutation({
  args: {
    id: v.id('students'),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const student = await ctx.db.get(args.id);
    if (!student || student.userId !== identity.subject) {
      throw new Error('Student not found');
    }

    await ctx.db.patch(args.id, { name: args.name });
  },
});

// Mutation to assign a student to a class
export const assignToClass = mutation({
  args: {
    studentId: v.id('students'),
    classId: v.id('classes'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const student = await ctx.db.get(args.studentId);
    if (!student || student.userId !== identity.subject) {
      throw new Error('Student not found');
    }

    const classDoc = await ctx.db.get(args.classId);
    if (!classDoc || classDoc.userId !== identity.subject) {
      throw new Error('Class not found');
    }

    // Check if already assigned
    if (student.classIds.includes(args.classId)) {
      return; // Already assigned
    }

    await ctx.db.patch(args.studentId, {
      classIds: [...student.classIds, args.classId],
    });
  },
});

// Mutation to remove a student from a class
export const removeFromClass = mutation({
  args: {
    studentId: v.id('students'),
    classId: v.id('classes'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const student = await ctx.db.get(args.studentId);
    if (!student || student.userId !== identity.subject) {
      throw new Error('Student not found');
    }

    await ctx.db.patch(args.studentId, {
      classIds: student.classIds.filter((cid) => cid !== args.classId),
    });
  },
});

// Mutation to assign multiple students to a class at once
export const assignManyToClass = mutation({
  args: {
    studentIds: v.array(v.id('students')),
    classId: v.id('classes'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const classDoc = await ctx.db.get(args.classId);
    if (!classDoc || classDoc.userId !== identity.subject) {
      throw new Error('Class not found');
    }

    for (const studentId of args.studentIds) {
      const student = await ctx.db.get(studentId);
      if (student && student.userId === identity.subject) {
        if (!student.classIds.includes(args.classId)) {
          await ctx.db.patch(studentId, {
            classIds: [...student.classIds, args.classId],
          });
        }
      }
    }
  },
});

// Mutation to remove multiple students from a class at once
export const removeManyFromClass = mutation({
  args: {
    studentIds: v.array(v.id('students')),
    classId: v.id('classes'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    for (const studentId of args.studentIds) {
      const student = await ctx.db.get(studentId);
      if (student && student.userId === identity.subject) {
        await ctx.db.patch(studentId, {
          classIds: student.classIds.filter((cid) => cid !== args.classId),
        });
      }
    }
  },
});

// Mutation to delete a student
export const remove = mutation({
  args: { id: v.id('students') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const student = await ctx.db.get(args.id);
    if (!student || student.userId !== identity.subject) {
      throw new Error('Student not found');
    }

    // Delete all activities for this student
    const activities = await ctx.db
      .query('activities')
      .withIndex('by_student', (q) => q.eq('studentId', args.id))
      .collect();

    for (const activity of activities) {
      await ctx.db.delete(activity._id);
    }

    // Delete the student
    await ctx.db.delete(args.id);
  },
});
