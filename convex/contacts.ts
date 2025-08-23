import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("contacts").withIndex("by_createdAt").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    number: v.string(),
  },
  handler: async (ctx, args) => {
    const createdAt = Date.now();
    const id = await ctx.db.insert("contacts", { ...args, createdAt });
    return id;
  },
});

export const findByNumber = query({
  args: { number: v.string() },
  handler: async (ctx, args) => {
    const match = await ctx.db
      .query("contacts")
      .withIndex("by_number", (q) => q.eq("number", args.number))
      .first();
    return match;
  },
});


