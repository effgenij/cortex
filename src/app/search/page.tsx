'use client';

import { useState } from 'react';
import {
  Container,
  Title,
  TextInput,
  Text,
  Paper,
  Stack,
  Group,
  Badge,
  Button,
  Loader,
  Highlight,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  moduleId: number;
  courseId: number;
  title: string;
  snippet: string;
}

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results || []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="md" py="lg">
      <Title order={2} mb="md">
        🔍 Поиск по курсам
      </Title>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <TextInput
          placeholder="Поиск по расшифровкам и материалам..."
          leftSection={<IconSearch size={18} />}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          size="lg"
          mb="md"
          rightSection={
            <Button
              onClick={search}
              loading={loading}
              size="sm"
            >
              Найти
            </Button>
          }
          rightSectionWidth={100}
        />
      </form>

      {loading && (
        <Group justify="center" py="xl">
          <Loader size="md" />
          <Text c="dimmed">Ищем...</Text>
        </Group>
      )}

      {!loading && searched && results.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">
          Ничего не найдено по запросу «{query}»
        </Text>
      )}

      {!loading && results.length > 0 && (
        <Stack gap="sm">
          <Text size="sm" c="dimmed" mb="xs">
            Найдено: {results.length}
          </Text>

          {results.map((result, i) => (
            <Paper
              key={i}
              p="md"
              withBorder
              style={{ cursor: 'pointer' }}
              onClick={() =>
                router.push(
                  `/courses/${result.courseId}/modules/${result.moduleId}`
                )
              }
            >
              <Group justify="space-between" mb={4}>
                <Text fw={500}>{result.title}</Text>
                <Badge size="xs" variant="light">
                  Модуль
                </Badge>
              </Group>

              <Text
                size="sm"
                c="dimmed"
                dangerouslySetInnerHTML={{
                  __html: result.snippet.replace(
                    /<mark>/g,
                    '<mark style="background:#228be6;color:white;padding:1px 2px;border-radius:2px">'
                  ),
                }}
              />
            </Paper>
          ))}
        </Stack>
      )}
    </Container>
  );
}
