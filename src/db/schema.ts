import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const profiles = pgTable('profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull().unique(),
  fullName: text('full_name'),
  role: text('role').notNull(), // 'student' | 'recruiter'
  collegeName: text('college_name'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const submissions = pgTable('submissions', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => users.id).notNull(),
  repoUrl: text('repo_url').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'analyzing' | 'analyzed' | 'failed'
  createdAt: timestamp('created_at').defaultNow(),
});

export const skillScores = pgTable('skill_scores', {
  id: serial('id').primaryKey(),
  submissionId: integer('submission_id').references(() => submissions.id).notNull(),
  competency: text('competency').notNull(),
  percentileScore: integer('percentile_score').notNull(),
  authenticityScore: integer('authenticity_score').notNull(),
  summaryText: text('summary_text').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const challenges = pgTable('challenges', {
  id: serial('id').primaryKey(),
  recruiterId: integer('recruiter_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  skillTag: text('skill_tag').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const challengeAttempts = pgTable('challenge_attempts', {
  id: serial('id').primaryKey(),
  challengeId: integer('challenge_id').references(() => challenges.id).notNull(),
  studentId: integer('student_id').references(() => users.id).notNull(),
  submissionId: integer('submission_id').references(() => submissions.id),
  badgeAwarded: boolean('badge_awarded').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
  submissions: many(submissions),
  challengesPosted: many(challenges),
  challengeAttempts: many(challengeAttempts),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}));

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  student: one(users, {
    fields: [submissions.studentId],
    references: [users.id],
  }),
  skillScores: many(skillScores),
  challengeAttempts: many(challengeAttempts),
}));

export const skillScoresRelations = relations(skillScores, ({ one }) => ({
  submission: one(submissions, {
    fields: [skillScores.submissionId],
    references: [submissions.id],
  }),
}));

export const challengesRelations = relations(challenges, ({ one, many }) => ({
  recruiter: one(users, {
    fields: [challenges.recruiterId],
    references: [users.id],
  }),
  attempts: many(challengeAttempts),
}));

export const challengeAttemptsRelations = relations(challengeAttempts, ({ one }) => ({
  challenge: one(challenges, {
    fields: [challengeAttempts.challengeId],
    references: [challenges.id],
  }),
  student: one(users, {
    fields: [challengeAttempts.studentId],
    references: [users.id],
  }),
  submission: one(submissions, {
    fields: [challengeAttempts.submissionId],
    references: [submissions.id],
  }),
}));
