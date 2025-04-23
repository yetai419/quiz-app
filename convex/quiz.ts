import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import OpenAI from "openai";
import { api } from "./_generated/api";

const openai = new OpenAI({
  baseURL: process.env.CONVEX_OPENAI_BASE_URL,
  apiKey: process.env.CONVEX_OPENAI_API_KEY,
});

export const generateQuiz = action({
  args: {
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const response = await fetch(args.url);
    if (!response.ok) {
      throw new Error("Failed to fetch webpage");
    }
    const html = await response.text();
    
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
      .match(/<article[^>]*>[\s\S]*?<\/article>|<main[^>]*>[\s\S]*?<\/main>|<div[^>]*content[^>]*>[\s\S]*?<\/div>/i)?.[0] || html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&[a-z]+;/g, '')
      .trim()
      .slice(0, 6000);

    const prompt = `Create a mixed set of 5 questions to test understanding of this content. Include both single-choice and multi-select questions. Make questions direct and natural without referencing any website or source material.

Content: "${textContent}"

Requirements:
1. Mix of single-choice and multi-select questions
2. Questions should be direct and natural (e.g., "What is the primary cause of..." instead of "According to the text...")
3. Test comprehension of key concepts and relationships
4. Include specific details but phrase questions independently
5. All options should be plausible

Format as JSON:
{
  "title": "Quiz: [Main Topic]",
  "questions": [
    {
      "question": "Question text",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswers": [0], // Array of correct option indices
      "type": "single" // "single" or "multiple"
    }
  ]
}

For multi-select questions, include 2-3 correct answers in the correctAnswers array.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const quizData = JSON.parse(completion.choices[0].message.content || "{}");
    
    await ctx.runMutation(api.quiz.createQuiz, {
      title: quizData.title,
      url: args.url,
      questions: quizData.questions,
    });
  },
});

export const createQuiz = mutation({
  args: {
    title: v.string(),
    url: v.string(),
    questions: v.array(
      v.object({
        question: v.string(),
        options: v.array(v.string()),
        correctAnswers: v.array(v.number()),
        type: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("quizzes", args);
  },
});

export const listQuizzes = query({
  handler: async (ctx) => {
    return await ctx.db.query("quizzes").order("desc").collect();
  },
});

export const submitAttempt = mutation({
  args: {
    quizId: v.id("quizzes"),
    answers: v.array(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    const quiz = await ctx.db.get(args.quizId);
    if (!quiz) throw new Error("Quiz not found");

    const score = args.answers.reduce((acc, answer, index) => {
      const correctAnswers = quiz.questions[index].correctAnswers;
      // For both single and multi-select, check if arrays match exactly
      const isCorrect = 
        answer.length === correctAnswers.length &&
        answer.every(a => correctAnswers.includes(a)) &&
        correctAnswers.every(a => answer.includes(a));
      return acc + (isCorrect ? 1 : 0);
    }, 0);

    return await ctx.db.insert("attempts", {
      quizId: args.quizId,
      score,
      answers: args.answers,
      completed: true,
    });
  },
});
