// ── AI Service ─────────────────────────────────────────

export interface VideoSummary {
  title: string;
  keyPoints: string[];
  timestamps: { time: string; label: string }[];
  practicePrompt?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatContext {
  moduleTitle: string;
  courseTitle: string;
  transcriptSnippet?: string;
  previousMessages: ChatMessage[];
}

export interface ChatResponse {
  message: string;
  references?: { title: string; url: string }[];
}

export interface PRReviewResult {
  summary: string;
  issues: { file: string; line?: number; severity: 'error' | 'warning' | 'info'; message: string }[];
  suggestions: string[];
}

export interface AIService {
  readonly name: string;

  /** Generate a structured summary from a video transcript */
  summarize(transcriptPath: string): Promise<VideoSummary>;

  /** Chat with context about a specific module */
  chat(context: ChatContext, message: string): Promise<ChatResponse>;

  /** Review a PR in the user's practice repo */
  reviewPR(repoPath: string, branch: string): Promise<PRReviewResult>;
}
