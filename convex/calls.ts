import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query("calls")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();
    return items;
  },
});

export const create = mutation({
  args: {
    number: v.string(),
    name: v.optional(v.string()),
    type: v.union(v.literal("incoming"), v.literal("outgoing"), v.literal("missed")),
    twilioCallSid: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("initiating"),
      v.literal("ringing"),
      v.literal("in-progress"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("busy"),
      v.literal("no-answer"),
      v.literal("canceled")
    )),
  },
  handler: async (ctx, args) => {
    const createdAt = Date.now();
    const id = await ctx.db.insert("calls", { 
      ...args, 
      createdAt,
      status: args.status || "initiating",
      startTime: createdAt,
    });
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("calls") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const updateByTwilioSid = mutation({
  args: {
    twilioCallSid: v.string(),
    status: v.optional(v.union(
      v.literal("initiating"),
      v.literal("ringing"),
      v.literal("in-progress"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("busy"),
      v.literal("no-answer"),
      v.literal("canceled")
    )),
    duration: v.optional(v.number()),
    endTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const call = await ctx.db
      .query("calls")
      .withIndex("by_twilioCallSid", q => q.eq("twilioCallSid", args.twilioCallSid))
      .first();
    
    if (call) {
      await ctx.db.patch(call._id, {
        status: args.status,
        duration: args.duration,
        endTime: args.endTime,
      });
    }
  },
});

export const updateCallStatus = mutation({
  args: {
    id: v.id("calls"),
    status: v.union(
      v.literal("initiating"),
      v.literal("ringing"),
      v.literal("in-progress"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("busy"),
      v.literal("no-answer"),
      v.literal("canceled")
    ),
    twilioCallSid: v.optional(v.string()),
    duration: v.optional(v.number()),
    endTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const getActiveCall = query({
  args: {},
  handler: async (ctx) => {
    const activeCalls = await ctx.db
      .query("calls")
      .filter(q => 
        q.or(
          q.eq(q.field("status"), "initiating"),
          q.eq(q.field("status"), "ringing"),
          q.eq(q.field("status"), "in-progress")
        )
      )
      .order("desc")
      .first();
    
    return activeCalls;
  },
});


