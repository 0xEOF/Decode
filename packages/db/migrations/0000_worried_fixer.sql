CREATE TYPE "public"."fixed_event_type" AS ENUM('class', 'work', 'exam', 'appointment', 'locked');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'paid');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE');--> statement-breakpoint
CREATE TYPE "public"."task_type" AS ENUM('assignment', 'exam', 'quiz', 'project', 'reading');--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"professor" text,
	"color" text NOT NULL,
	"location" text,
	"meeting_days" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"office_hours" text,
	"ai_policy" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fixed_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid,
	"title" text NOT NULL,
	"type" "fixed_event_type" NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"student_name" text NOT NULL,
	"school" text,
	"semester_label" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"onboarded" boolean DEFAULT false NOT NULL,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"ai_calls_this_month" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"type" "task_type" NOT NULL,
	"status" "task_status" DEFAULT 'BACKLOG' NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"estimated_minutes" integer NOT NULL,
	"priority" smallint NOT NULL,
	"grade_weight" smallint,
	"depends_on" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"earliest_time" text NOT NULL,
	"latest_time" text NOT NULL,
	"min_session_minutes" integer NOT NULL,
	"preferred_session_minutes" integer NOT NULL,
	"break_minutes" integer NOT NULL,
	"max_daily_minutes" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_events" ADD CONSTRAINT "fixed_events_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_events" ADD CONSTRAINT "fixed_events_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;