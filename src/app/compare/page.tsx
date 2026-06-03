'use client';

import { useState } from 'react';
import {
  Container,
  Title,
  TextInput,
  Textarea,
  Button,
  Paper,
  Text,
  Stack,
  Group,
  Badge,
  Grid,
  Loader,
  Radio,
  Divider,
} from '@mantine/core';
import { IconArrowsExchange, IconEye, IconSend } from '@tabler/icons-react';

interface CompareResult {
  label: string;
  answer: string;
  error?: string;
}

export default function ComparePage() {
  const [question, setQuestion] = useState('');
  const [context, setContext] = useState('');
  const [results, setResults] = useState<CompareResult[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [voted, setVoted] = useState<string | null>(null);

  const compare = async () => {
    if (!question.trim()) return;

    setLoading(true);
    setResults([]);
    setRevealed(false);
    setVoted(null);

    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          context: context.trim() || null,
        }),
      });
      const data = await res.json();
      setResults(data.results || []);
      setMapping(data.mapping || {});
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="xl" py="lg">
      <Title order={2} mb="md">
        <IconArrowsExchange size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />
        Blind A/B Compare
      </Title>

      <Text size="sm" c="dimmed" mb="lg">
        Задай вопрос — два AI-тьютора ответят анонимно. Выбери лучший ответ, затем узнай кто есть кто.
      </Text>

      <Stack gap="md" mb="xl">
        <TextInput
          label="Вопрос"
          placeholder="Например: объясни разницу между useState и useReducer"
          value={question}
          onChange={(e) => setQuestion(e.currentTarget.value)}
          size="md"
        />
        <Textarea
          label="Контекст (необязательно)"
          placeholder="Дополнительный контекст для ответа..."
          value={context}
          onChange={(e) => setContext(e.currentTarget.value)}
          minRows={2}
        />
        <Button
          leftSection={<IconSend size={18} />}
          onClick={compare}
          loading={loading}
          size="md"
        >
          Сравнить
        </Button>
      </Stack>

      {loading && (
        <Group justify="center" py="xl">
          <Loader size="lg" />
          <Text c="dimmed">AI-тьюторы думают...</Text>
        </Group>
      )}

      {results.length === 2 && (
        <>
          <Grid>
            {results.map((r) => (
              <Grid.Col span={6} key={r.label}>
                <Paper
                  p="lg"
                  withBorder
                  bg={voted === r.label ? 'blue.0' : undefined}
                  style={{
                    cursor: 'pointer',
                    borderColor:
                      revealed && voted === r.label ? '#228be6' : undefined,
                    borderWidth: revealed && voted === r.label ? 2 : 1,
                  }}
                  onClick={() => !revealed && setVoted(r.label)}
                >
                  <Group justify="space-between" mb="sm">
                    <Badge size="xl" color={voted === r.label ? 'blue' : 'gray'}>
                      Ответ {r.label}
                    </Badge>
                    {revealed && (
                      <Badge size="sm" variant="light">
                        {mapping[r.label]}
                      </Badge>
                    )}
                  </Group>

                  {r.error ? (
                    <Text c="red" size="sm">
                      ❌ Ошибка: {r.error}
                    </Text>
                  ) : (
                    <Text
                      size="sm"
                      style={{ whiteSpace: 'pre-wrap' }}
                      dangerouslySetInnerHTML={{
                        __html: r.answer
                          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\n\n/g, '<br/><br/>')
                          .replace(/\n- /g, '<br/>• '),
                      }}
                    />
                  )}
                </Paper>
              </Grid.Col>
            ))}
          </Grid>

          <Divider my="lg" />

          <Group justify="center" gap="md">
            {!voted && !revealed && (
              <Text size="sm" c="dimmed">
                ↑ Кликни на лучший ответ, затем раскрой авторов
              </Text>
            )}

            {voted && !revealed && (
              <Button
                leftSection={<IconEye size={18} />}
                onClick={() => setRevealed(true)}
                color="blue"
              >
                Раскрыть авторов
              </Button>
            )}

            {revealed && (
              <Stack align="center" gap="xs">
                <Text fw={500}>
                  Твой выбор: Ответ {voted} —{' '}
                  <Badge size="sm" color="blue">
                    {mapping[voted || '']}
                  </Badge>
                </Text>
                <Button
                  variant="subtle"
                  onClick={() => {
                    setRevealed(false);
                    setVoted(null);
                  }}
                >
                  Скрыть и переголосовать
                </Button>
              </Stack>
            )}
          </Group>
        </>
      )}
    </Container>
  );
}
