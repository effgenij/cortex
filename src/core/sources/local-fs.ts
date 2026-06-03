import { readdir, readFile } from 'fs/promises';
import { join, extname } from 'path';
import type { ContentSource, CourseInfo, ModuleFile } from './types';

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.webm', '.mov', '.ts', '.avi']);
const TRANSCRIPT_EXTENSIONS = new Set(['.txt', '.vtt', '.srt']);

/** Scans a local filesystem directory for courses.
 *
 *  Expected structure:
 *  ```
 *  rootDir/
 *  └── Course Name/
 *      ├── cortex.json          # optional metadata
 *      ├── 01 - Introduction.mp4
 *      ├── 01 - Introduction.txt  # transcript
 *      ├── 02 - Setup.mkv
 *      └── ...
 *  ```
 */
export class LocalFSSource implements ContentSource {
  readonly name = 'local-fs';

  constructor(private rootDir: string) {}

  async listCourses(): Promise<CourseInfo[]> {
    const entries = await readdir(this.rootDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory());

    const courses = await Promise.all(
      dirs.map(async (dir): Promise<CourseInfo> => {
        const dirPath = join(this.rootDir, dir.name);
        const videoFiles = await this.findVideos(dirPath);
        const metadata = await this.readMetadata(dirPath);

        return {
          id: dir.name,
          title: metadata?.title ?? dir.name,
          description: metadata?.description,
          sourceType: 'local',
          sourcePath: dirPath,
          totalModules: videoFiles.length,
        };
      })
    );

    return courses.filter(c => c.totalModules > 0);
  }

  async getModules(courseId: string): Promise<ModuleFile[]> {
    const dirPath = join(this.rootDir, courseId);
    const allEntries = await this.readDirSafe(dirPath);
    const videoFiles = allEntries.filter(f => VIDEO_EXTENSIONS.has(extname(f).toLowerCase()));

    // Sort naturally: 01, 02, 03...
    videoFiles.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    return videoFiles.map((file, i) => {
      const base = file.slice(0, -extname(file).length);
      const fullBase = join(dirPath, base);
      const transcript = this.findTranscript(allEntries, fullBase);

      return {
        id: base,
        title: base.replace(/^\d+[\s.-]*/, ''), // strip leading number prefix
        videoPath: join(dirPath, file),
        transcriptPath: transcript,
        orderIndex: i,
      };
    });
  }

  // ── helpers ──────────────────────────────────────────

  private async readDirSafe(dirPath: string): Promise<string[]> {
    try {
      return await readdir(dirPath);
    } catch {
      return [];
    }
  }

  private async findVideos(dirPath: string): Promise<string[]> {
    const files = await this.readDirSafe(dirPath);
    return files.filter(f => VIDEO_EXTENSIONS.has(extname(f).toLowerCase()));
  }

  private findTranscript(allFilenames: string[], basePath: string): string | undefined {
    for (const ext of TRANSCRIPT_EXTENSIONS) {
      const candidate = `${basePath}${ext}`;
      const candidateName = candidate.split('/').pop()!;
      if (allFilenames.includes(candidateName)) return candidate;
    }
    return undefined;
  }

  private async readMetadata(dirPath: string): Promise<{ title?: string; description?: string } | null> {
    try {
      const raw = await readFile(join(dirPath, 'cortex.json'), 'utf-8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
