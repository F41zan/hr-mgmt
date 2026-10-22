/**
 * lib/recruitmentService.ts
 * Interview notifications and reminders.
 */

import "server-only";
import { connectDB } from "@/lib/db";
import Interview, { type IInterview } from "@/lib/models/Interview";
import Application from "@/lib/models/Application";
import JobOpening from "@/lib/models/JobOpening";
import { notifyUsers } from "@/lib/notify";
import { sendNotificationEmail } from "@/lib/email";

const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

export function formatInterviewTime(date: Date): string {
  return date.toLocaleString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

async function describe(interview: Pick<IInterview, "applicationId" | "jobId">) {
  const [app, job] = await Promise.all([
    Application.findById(interview.applicationId).select("candidate").lean(),
    JobOpening.findById(interview.jobId).select("title").lean(),
  ]);
  return {
    candidateName: app ? `${app.candidate.firstName} ${app.candidate.lastName}` : "Candidate",
    candidateEmail: app?.candidate.email,
    jobTitle: job?.title ?? "the position",
  };
}

/** Tell interviewers (in-app + email) and the candidate (email) about a new or changed interview. */
export async function notifyInterviewScheduled(
  interview: IInterview,
  kind: "scheduled" | "rescheduled" | "cancelled",
): Promise<void> {
  try {
    const { candidateName, candidateEmail, jobTitle } = await describe(interview);
    const when = formatInterviewTime(interview.scheduledAt);
    const where = interview.location ? `\nLocation / link: ${interview.location}` : "";

    await notifyUsers(interview.interviewers, {
      type: "interview",
      title: `Interview ${kind}: ${candidateName}`,
      message: `Round ${interview.round} (${interview.type}) for ${jobTitle} — ${when}.${where}`,
      link: "/recruitment/my-interviews",
      email: true,
    });

    if (candidateEmail) {
      const subject =
        kind === "cancelled" ? `Interview cancelled — ${jobTitle}` : `Interview ${kind} — ${jobTitle}`;
      const body =
        kind === "cancelled"
          ? `Dear ${candidateName},\n\nYour interview for ${jobTitle} scheduled on ${when} has been cancelled. We will be in touch.`
          : `Dear ${candidateName},\n\nYour round ${interview.round} interview for ${jobTitle} is ${kind} for ${when} (${interview.durationMinutes} minutes).${where}\n\nBest regards,\nRecruitment Team`;
      await sendNotificationEmail(candidateEmail, subject, body);
    }
  } catch (err) {
    console.error("[recruitment] notify failed:", (err as Error).message);
  }
}

/**
 * Send reminders for interviews starting within the next 24 hours.
 * Idempotent (reminderSent flag + notification dedupeKey), so it is safe to
 * call opportunistically — e.g. whenever notifications are fetched.
 */
export async function sendDueInterviewReminders(): Promise<number> {
  try {
    await connectDB();
    const now = new Date();
    const due = await Interview.find({
      status: "scheduled",
      reminderSent: false,
      scheduledAt: { $gt: now, $lte: new Date(now.getTime() + REMINDER_WINDOW_MS) },
    }).limit(50);

    for (const interview of due) {
      // Claim it first so concurrent requests don't double-send
      const claimed = await Interview.updateOne(
        { _id: interview._id, reminderSent: false },
        { $set: { reminderSent: true } },
      );
      if (!claimed.modifiedCount) continue;

      const { candidateName, candidateEmail, jobTitle } = await describe(interview);
      const when = formatInterviewTime(interview.scheduledAt);
      const where = interview.location ? ` · ${interview.location}` : "";

      await notifyUsers(interview.interviewers, {
        type: "interview",
        title: `Reminder: interview with ${candidateName}`,
        message: `Round ${interview.round} (${interview.type}) for ${jobTitle} — ${when}${where}`,
        link: "/recruitment/my-interviews",
        dedupeKey: `interview-reminder-${interview._id}`,
        email: true,
      });
      if (candidateEmail)
        await sendNotificationEmail(
          candidateEmail,
          `Reminder: interview for ${jobTitle}`,
          `Dear ${candidateName},\n\nThis is a reminder of your interview for ${jobTitle} on ${when}${where}.\n\nBest regards,\nRecruitment Team`,
        );
    }
    return due.length;
  } catch (err) {
    console.error("[recruitment] reminders failed:", (err as Error).message);
    return 0;
  }
}
