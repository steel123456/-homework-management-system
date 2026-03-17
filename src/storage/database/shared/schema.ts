import { pgTable, serial, varchar, text, timestamp, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { z } from "zod"

// 用户表
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  password: text("password").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("student"),
  avatar: text("avatar"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }),
});

// 班级表
export const classes = pgTable("classes", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  invite_code: varchar("invite_code", { length: 20 }).notNull().unique(),
  teacher_id: varchar("teacher_id", { length: 36 }).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 班级成员表
export const classMembers = pgTable("class_members", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  class_id: varchar("class_id", { length: 36 }).notNull(),
  student_id: varchar("student_id", { length: 36 }).notNull(),
  joined_at: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
});

// 作业表
export const assignments = pgTable("assignments", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  class_id: varchar("class_id", { length: 36 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  requirements: text("requirements"),
  due_date: timestamp("due_date", { withTimezone: true }),
  teacher_id: varchar("teacher_id", { length: 36 }).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 作业提交表
export const submissions = pgTable("submissions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  assignment_id: varchar("assignment_id", { length: 36 }).notNull(),
  student_id: varchar("student_id", { length: 36 }).notNull(),
  content: text("content"),
  image_url: text("image_url"),
  image_key: text("image_key"),
  status: varchar("status", { length: 20 }).notNull().default("submitted"),
  score: integer("score"),
  feedback: text("feedback"),
  submitted_at: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  graded_at: timestamp("graded_at", { withTimezone: true }),
});

// Zod schemas for validation
export const insertUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
  role: z.enum(['teacher', 'student']),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  avatar: z.string().optional(),
}).partial();

export const insertClassSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  teacherId: z.string().min(1),
});

export const insertAssignmentSchema = z.object({
  classId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  requirements: z.string().optional(),
  dueDate: z.string().optional(),
  teacherId: z.string().min(1),
});

export const insertSubmissionSchema = z.object({
  assignmentId: z.string().min(1),
  studentId: z.string().min(1),
  content: z.string().optional(),
  imageUrl: z.string().optional(),
  imageKey: z.string().optional(),
});

// TypeScript types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;

export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;

export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;

export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;

export type ClassMember = typeof classMembers.$inferSelect;
