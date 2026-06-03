import { describe, it, expect } from 'vitest';
import { LocalFSSource } from '@/core/sources/local-fs';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const TEST_DIR = '/tmp/cortex-test-courses';

describe('LocalFSSource', () => {
  const source = new LocalFSSource(TEST_DIR);

  beforeAll(async () => {
    if (existsSync(TEST_DIR)) await rm(TEST_DIR, { recursive: true });
    await mkdir(join(TEST_DIR, 'React Course'), { recursive: true });
    await writeFile(join(TEST_DIR, 'React Course', 'cortex.json'), JSON.stringify({
      title: 'React Advanced',
      description: 'Deep dive into React patterns',
    }));
    await writeFile(join(TEST_DIR, 'React Course', '01 - Hooks.mp4'), 'fake-video');
    await writeFile(join(TEST_DIR, 'React Course', '01 - Hooks.txt'), 'Welcome to hooks');
    await writeFile(join(TEST_DIR, 'React Course', '02 - Context.mkv'), 'fake-video-2');
  });

  afterAll(async () => {
    if (existsSync(TEST_DIR)) await rm(TEST_DIR, { recursive: true });
  });

  it('lists courses from filesystem', async () => {
    const courses = await source.listCourses();
    expect(courses.length).toBe(1);
    expect(courses[0].title).toBe('React Advanced');
    expect(courses[0].totalModules).toBe(2);
    expect(courses[0].sourceType).toBe('local');
  });

  it('returns modules with correct order', async () => {
    const modules = await source.getModules('React Course');
    expect(modules.length).toBe(2);
    expect(modules[0].title).toBe('Hooks');
    expect(modules[0].orderIndex).toBe(0);
    expect(modules[1].title).toBe('Context');
    expect(modules[1].orderIndex).toBe(1);
  });

  it('detects transcripts', async () => {
    const modules = await source.getModules('React Course');
    expect(modules[0].transcriptPath).toContain('01 - Hooks.txt');
    expect(modules[1].transcriptPath).toBeUndefined();
  });

  it('returns empty for non-existent course', async () => {
    const courses = await source.listCourses();
    expect(courses.find(c => c.id === 'NoSuchCourse')).toBeUndefined();
  });

  it('skips directories without videos', async () => {
    await mkdir(join(TEST_DIR, 'EmptyDir'), { recursive: true });
    const courses = await source.listCourses();
    expect(courses.find(c => c.id === 'EmptyDir')).toBeUndefined();
  });
});
