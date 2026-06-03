import { db } from '@/db';
import { courses, modules } from '@/db/schema';
import { LocalFSSource } from '@/core/sources/local-fs';
import { eq } from 'drizzle-orm';

const defaultSource = new LocalFSSource(process.env.COURSES_DIR ?? '/root/courses');

/** Sync filesystem courses into DB. Safe to call repeatedly. */
export async function syncCourses() {
  const discovered = await defaultSource.listCourses();

  for (const course of discovered) {
    const existing = await db
      .select({ id: courses.id })
      .from(courses)
      .where(eq(courses.sourcePath, course.sourcePath))
      .get();

    let courseId: number;

    if (existing) {
      await db
        .update(courses)
        .set({
          title: course.title,
          description: course.description,
          totalModules: course.totalModules,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(courses.id, existing.id));
      courseId = existing.id;
    } else {
      const result = await db
        .insert(courses)
        .values({
          title: course.title,
          description: course.description,
          sourceType: course.sourceType,
          sourcePath: course.sourcePath,
          totalModules: course.totalModules,
        })
        .returning({ id: courses.id })
        .get();
      courseId = result!.id;
    }

    // Sync modules
    const moduleFiles = await defaultSource.getModules(course.id);
    const existingModules = await db
      .select({ id: modules.id })
      .from(modules)
      .where(eq(modules.courseId, courseId))
      .all();
    const existingPaths = new Set(
      existingModules.map(m => m.id)
    );

    for (const mf of moduleFiles) {
      // Use videoPath as unique key since module IDs are filename-based
      const existingMod = await db
        .select({ id: modules.id })
        .from(modules)
        .where(eq(modules.videoPath, mf.videoPath))
        .get();

      if (!existingMod) {
        await db.insert(modules).values({
          courseId,
          title: mf.title,
          orderIndex: mf.orderIndex,
          videoPath: mf.videoPath,
          transcriptPath: mf.transcriptPath,
        });
      }
    }
  }
}

export async function getCourses() {
  await syncCourses();
  return db.select().from(courses).all();
}

export async function getCourse(courseId: number) {
  return db.select().from(courses).where(eq(courses.id, courseId)).get();
}

export async function getModules(courseId: number) {
  return db
    .select()
    .from(modules)
    .where(eq(modules.courseId, courseId))
    .orderBy(modules.orderIndex)
    .all();
}

export async function getModule(moduleId: number) {
  return db.select().from(modules).where(eq(modules.id, moduleId)).get();
}
