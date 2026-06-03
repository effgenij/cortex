import { execFile } from 'child_process';
import { promisify } from 'util';
import type { AIService, VideoSummary, ChatContext, ChatResponse, PRReviewResult } from './types';

const execFileAsync = promisify(execFile);

/** Calls Hermes CLI. Assumes `hermes` is on PATH. */
export class HermesService implements AIService {
  readonly name = 'hermes';

  private async run(query: string, timeout = 120_000): Promise<string> {
    const { stdout } = await execFileAsync('hermes', ['chat', '-q', query, '-Q'], {
      timeout,
      env: { ...process.env, HOME: process.env.HOME },
    });
    // Hermes CLI outputs session_id line + response — extract the response
    const lines = stdout.trim().split('\n');
    return lines.length > 1 ? lines.slice(1).join('\n') : lines[0];
  }

  async summarize(transcriptPath: string): Promise<VideoSummary> {
    const raw = await this.run(
      `Прочитай файл ${transcriptPath} и создай структурированную выжимку в формате JSON:\n` +
      `{\n  "title": "строка",\n  "keyPoints": ["массив ключевых идей"],\n` +
      `  "timestamps": [{"time": "MM:SS", "label": "описание"}],\n` +
      `  "practicePrompt": "практическое задание или null если нет"\n}\n` +
      `Верни ТОЛЬКО JSON, без markdown-обёртки.`
    );
    return JSON.parse(raw);
  }

  async chat(context: ChatContext, message: string): Promise<ChatResponse> {
    const contextBlock = [
      `Курс: ${context.courseTitle}`,
      `Модуль: ${context.moduleTitle}`,
      context.transcriptSnippet ? `Фрагмент расшифровки: ${context.transcriptSnippet.slice(0, 2000)}` : null,
      context.previousMessages.length > 0
        ? `История:\n${context.previousMessages.map(m => `${m.role}: ${m.content}`).join('\n')}`
        : null,
    ].filter(Boolean).join('\n');

    const raw = await this.run(
      `Ты — AI-тьютор в образовательной платформе Cortex. Контекст:\n${contextBlock}\n\n` +
      `Студент спрашивает: ${message}\n\n` +
      `Ответь полезно. Если есть ссылки на документацию — укажи их в конце в формате:\n` +
      `---references\n[Название](url)\n` +
      `Ответь на русском.`
    );

    const refMatch = raw.match(/---references\n([\s\S]*)$/);
    const body = refMatch ? raw.slice(0, refMatch.index).trim() : raw.trim();
    const references = refMatch
      ? Array.from(refMatch[1].matchAll(/\[([^\]]+)\]\(([^)]+)\)/g), m => ({ title: m[1], url: m[2] }))
      : undefined;

    return { message: body, references };
  }

  async reviewPR(repoPath: string, branch: string): Promise<PRReviewResult> {
    const raw = await this.run(
      `Проверь репозиторий ${repoPath} на ветке ${branch}. ` +
      `Выполни gh pr view и gh pr diff, затем дай ревью в формате JSON:\n` +
      `{\n  "summary": "общее впечатление",\n` +
      `  "issues": [{"file": "...", "line": N, "severity": "error|warning|info", "message": "..."}],\n` +
      `  "suggestions": ["конкретный совет", ...]\n}\n` +
      `Верни ТОЛЬКО JSON, без markdown-обёртки.`,
      180_000
    );
    return JSON.parse(raw);
  }
}
