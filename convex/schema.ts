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
    conferenceRoom: v.optional(v.string()), // conference name if this was a conference call
    participants: v.optional(v.array(v.string())), // phone numbers of conference participants
    isConference: v.optional(v.boolean()), // whether this was a conference call
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"])
    .index("by_twilioCallSid", ["twilioCallSid"]),
});


