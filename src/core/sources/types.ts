export interface CourseInfo {
  id: string;              // directory name
  title: string;
  description?: string;
  sourceType: 'local' | 'youtube';
  sourcePath: string;
  totalModules: number;
}

export interface ModuleFile {
  id: string;              // filename without extension
  title: string;
  videoPath: string;
  transcriptPath?: string; // auto-discovered .txt/.vtt/.srt next to video
  orderIndex: number;
}

export interface ContentSource {
  readonly name: string;

  /** Discover all available courses */
  listCourses(): Promise<CourseInfo[]>;

  /** Get all modules for a course */
  getModules(courseId: string): Promise<ModuleFile[]>;
}
