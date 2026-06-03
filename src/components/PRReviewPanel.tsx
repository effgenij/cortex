'use client';

import { useState } from 'react';
import { Stack, TextInput, Button, Paper, Text, Group, Badge, Loader, Code } from '@mantine/core';

interface Issue {
  file: string;
  line?: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

interface ReviewResult {
  summary: string;
  issues: Issue[];
  suggestions: string[];
}

export function PRReviewPanel() {
  const [repoPath, setRepoPath] = useState('');
  const [branch, setBranch] = useState('main');
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runReview = async () => {
    if (!repoPath.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/pr-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoPath: repoPath.trim(), branch: branch.trim() || 'main' }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Unknown error');
      }
      const data = await res.json();
      setReview(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const severityColor = { error: 'red', warning: 'yellow', info: 'blue' } as const;

  return (
    <Stack gap="md">
      <Text fw={500}>🔍 PR Review</Text>
      <Text size="sm" c="dimmed">
        Hermes проверит PR в указанном репозитории через gh CLI
      </Text>

      <Group align="flex-end">
        <TextInput
          label="Путь к репозиторию"
          placeholder="/root/my-project"
          value={repoPath}
          onChange={e => setRepoPath(e.currentTarget.value)}
          style={{ flex: 2 }}
        />
        <TextInput
          label="Ветка"
          placeholder="main"
          value={branch}
          onChange={e => setBranch(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Button onClick={runReview} loading={loading}>
          Ревью
        </Button>
      </Group>

      {error && (
        <Paper p="sm" withBorder bg="red.9">
          <Text size="sm">{error}</Text>
        </Paper>
      )}

      {loading && <Loader size="sm" mx="auto" />}

      {review && (
        <Stack gap="sm">
          <Paper p="md" withBorder>
            <Text fw={500} mb="xs">Резюме</Text>
            <Text size="sm">{review.summary}</Text>
          </Paper>

          {review.issues.length > 0 && (
            <Paper p="md" withBorder>
              <Text fw={500} mb="xs">Проблемы ({review.issues.length})</Text>
              <Stack gap="xs">
                {review.issues.map((issue, i) => (
                  <Group key={i} gap="xs" wrap="nowrap">
                    <Badge color={severityColor[issue.severity]} size="sm">
                      {issue.severity}
                    </Badge>
                    <Code style={{ flex: '0 0 auto' }}>{issue.file}{issue.line ? `:${issue.line}` : ''}</Code>
                    <Text size="sm">{issue.message}</Text>
                  </Group>
                ))}
              </Stack>
            </Paper>
          )}

          {review.suggestions.length > 0 && (
            <Paper p="md" withBorder>
              <Text fw={500} mb="xs">Советы</Text>
              <Stack gap="xs">
                {review.suggestions.map((s, i) => (
                  <Text key={i} size="sm">💡 {s}</Text>
                ))}
              </Stack>
            </Paper>
          )}
        </Stack>
      )}
    </Stack>
  );
}
