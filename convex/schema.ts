import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  calls: defineTable({
    number: v.string(),
    name: v.optional(v.string()),
    type: v.union(v.literal("incoming"), v.literal("outgoing"), v.literal("missed")),
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
    twilioCallSid: v.optional(v.string()),
    duration: v.optional(v.number()), // in seconds
    startTime: v.optional(v.number()), // timestamp
    endTime: v.optional(v.number()), // timestamp
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"])
    .index("by_twilioCallSid", ["twilioCallSid"]),
});


