import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  quizzes: defineTable({
    title: v.string(),
    url: v.string(),
    questions: v.array(
      v.object({
        question: v.string(),
        options: v.array(v.string()),
        correctAnswers: v.array(v.number()),
        type: v.string(), // "single" or "multiple"
      })
    ),
  }),
  
  attempts: defineTable({
    quizId: v.id("quizzes"),
    score: v.number(),
    answers: v.array(v.array(v.number())), // Array of arrays for multi-select
    completed: v.boolean(),
  }),
});
