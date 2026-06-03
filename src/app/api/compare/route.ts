import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';

// Available models for comparison
const MODELS = [
  { key: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', provider: 'deepseek' },
  { key: 'glm-4.5-air', name: 'GLM-4.5 Air', provider: 'zai' },
];

// POST /api/compare
// Blind A/B comparison of two AI tutors
export async function POST(request: NextRequest) {
  const { question, context } = await request.json();

  if (!question) {
    return NextResponse.json({ error: 'question is required' }, { status: 400 });
  }

  // Randomize order (blind test)
  const shuffled = [...MODELS].sort(() => Math.random() - 0.5);
  const labels = ['A', 'B'];

  const prompt = context
    ? `Контекст: ${context}\n\nВопрос: ${question}\n\nОтветь как AI-тьютор: развернуто, с примерами, на русском.`
    : `Ответь как AI-тьютор на вопрос. Развернуто, с примерами, на русском.\n\nВопрос: ${question}`;

  const results: Array<{
    label: string;
    answer: string;
    error?: string;
  }> = [];

  for (let i = 0; i < 2; i++) {
    try {
      const output = execSync(
        `hermes --raw --model "${shuffled[i].key}" "${prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`,
        { timeout: 60000, encoding: 'utf-8', maxBuffer: 1024 * 1024 }
      );
      results.push({ label: labels[i], answer: output.trim() });
    } catch (err) {
      results.push({
        label: labels[i],
        answer: '',
        error: String(err),
      });
    }
  }

  // Store mapping for reveal (in-memory, session-based)
  const mapping: Record<string, string> = {};
  for (let i = 0; i < 2; i++) {
    mapping[labels[i]] = shuffled[i].name;
  }

  return NextResponse.json({
    question,
    results,
    mapping, // included so client can reveal
  });
}
