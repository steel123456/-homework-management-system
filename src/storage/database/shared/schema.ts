import { pgTable, serial, varchar, text, timestamp, boolean, integer, jsonb, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { createSchemaFactory } from "drizzle-zod"
import { z } from "zod"

// 系统健康检查表
export const healthCheck = pgTable("health_check", {
	id: serial("id").primaryKey(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 用户表
export const users = pgTable(
	"users",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		email: varchar("email", { length: 255 }).notNull().unique(),
		name: varchar("name", { length: 128 }).notNull(),
		password: text("password").notNull(),
		role: varchar("role", { length: 20 }).notNull().default("student"), // 'teacher' or 'student'
		avatar: text("avatar"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [
		index("users_email_idx").on(table.email),
		index("users_role_idx").on(table.role),
	]
);

// 班级表
export const classes = pgTable(
	"classes",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		name: varchar("name", { length: 200 }).notNull(),
		description: text("description"),
		code: varchar("code", { length: 20 }).notNull().unique(), // 班级邀请码
		teacherId: varchar("teacher_id", { length: 36 }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [
		index("classes_code_idx").on(table.code),
		index("classes_teacher_id_idx").on(table.teacherId),
	]
);

// 班级成员表
export const classMembers = pgTable(
	"class_members",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		classId: varchar("class_id", { length: 36 }).notNull(),
		studentId: varchar("student_id", { length: 36 }).notNull(),
		joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("class_members_class_id_idx").on(table.classId),
		index("class_members_student_id_idx").on(table.studentId),
	]
);

// 作业表
export const assignments = pgTable(
	"assignments",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		classId: varchar("class_id", { length: 36 }).notNull(),
		title: varchar("title", { length: 200 }).notNull(),
		description: text("description"),
		requirements: text("requirements"),
		dueDate: timestamp("due_date", { withTimezone: true }),
		teacherId: varchar("teacher_id", { length: 36 }).notNull(),
		status: varchar("status", { length: 20 }).notNull().default("active"), // 'active', 'closed', 'archived'
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [
		index("assignments_class_id_idx").on(table.classId),
		index("assignments_teacher_id_idx").on(table.teacherId),
		index("assignments_status_idx").on(table.status),
	]
);

// 作业提交表
export const submissions = pgTable(
	"submissions",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		assignmentId: varchar("assignment_id", { length: 36 }).notNull(),
		studentId: varchar("student_id", { length: 36 }).notNull(),
		content: text("content"), // 文字内容
		imageUrl: text("image_url"), // 图片URL（对象存储中的key）
		imageKey: text("image_key"), // 图片存储key
		status: varchar("status", { length: 20 }).notNull().default("submitted"), // 'submitted', 'grading', 'graded'
		score: integer("score"), // 分数
		feedback: text("feedback"), // AI批改反馈
		submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
		gradedAt: timestamp("graded_at", { withTimezone: true }),
	},
	(table) => [
		index("submissions_assignment_id_idx").on(table.assignmentId),
		index("submissions_student_id_idx").on(table.studentId),
		index("submissions_status_idx").on(table.status),
	]
);

// Zod schemas for validation
const { createInsertSchema: createCoercedInsertSchema } = createSchemaFactory({
	coerce: { date: true },
});

// User schemas
export const insertUserSchema = createCoercedInsertSchema(users).pick({
	email: true,
	name: true,
	password: true,
	role: true,
});

export const updateUserSchema = createCoercedInsertSchema(users)
	.pick({
		name: true,
		avatar: true,
	})
	.partial();

// Class schemas
export const insertClassSchema = createCoercedInsertSchema(classes).pick({
	name: true,
	description: true,
	teacherId: true,
});

// Assignment schemas
export const insertAssignmentSchema = createCoercedInsertSchema(assignments).pick({
	classId: true,
	title: true,
	description: true,
	requirements: true,
	dueDate: true,
	teacherId: true,
});

// Submission schemas
export const insertSubmissionSchema = createCoercedInsertSchema(submissions).pick({
	assignmentId: true,
	studentId: true,
	content: true,
	imageUrl: true,
	imageKey: true,
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
