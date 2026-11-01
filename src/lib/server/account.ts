import "server-only";
import type { User } from "./auth";
import { deleteClass } from "./classes";
import { deleteWhere, fs, keyId } from "./firestore";
import { deleteLesson } from "./lessons";

/**
 * Removes a person and everything that belongs to them. Firestore has no cascading deletes, so each collection is listed here:
 * their lessons (with their students' attempts), classes, their own attempts and review questions, progress, and the small
 * bookkeeping documents (verification code, usage counters, the email index).
 */
export async function deleteAccount(user: User): Promise<void> {
  const uid = user.id;
  const [lessons, classes] = await Promise.all([fs().collection("lessons").where("userId", "==", uid).select().get(), fs().collection("classes").where("userId", "==", uid).select().get()]);
  for (const l of lessons.docs) await deleteLesson(uid, l.id);
  for (const c of classes.docs) await deleteClass(c.id);

  await Promise.all([
    deleteWhere("attempts", "studentUserId", uid),
    deleteWhere("mistakes", "userId", uid),
    deleteWhere("usage", "userId", uid),
    deleteWhere("tokens", "userId", uid),
    deleteWhere("checkouts", "userId", uid),
    fs().collection("progress").doc(uid).delete(),
    fs().collection("verifications").doc(uid).delete(),
    fs().collection("subscriptions").doc(uid).delete(),
  ]);
  await fs().collection("emails").doc(keyId(user.email.toLowerCase())).delete();
  await fs().collection("users").doc(uid).delete();
}

/** everything we hold about a user, as one object they can keep */
export async function exportAccount(user: User) {
  const snap = await fs().collection("lessons").where("userId", "==", user.id).get();
  const lessons = snap.docs
    .map((d) => d.data() as { code: string; title: string; sourceName: string; status: string; folder: string | null; archived: boolean; createdAt: number; updatedAt: number; data: string })
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((r) => ({
      code: r.code,
      title: r.title,
      source: r.sourceName,
      status: r.status,
      folder: r.folder,
      archived: !!r.archived,
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
      content: JSON.parse(r.data) as unknown,
    }));
  return { exportedAt: new Date().toISOString(), account: { email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role }, lessons };
}
