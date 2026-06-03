'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Container, Title, Grid, Stack, Paper, Text, TextInput, Textarea,
  Button, Group, Badge, ActionIcon, ScrollArea, Loader, TagsInput,
  Select, Modal,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import Link from 'next/link';

interface Note {
  id: number;
  title: string;
  path: string;
  tags: string | null;
  courseId: number | null;
  aiSummary: string | null;
  updatedAt: string;
  content?: string;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selected, setSelected] = useState<Note | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [opened, { open, close }] = useDisclosure(false);

  const loadNotes = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    const res = await fetch(`/api/notes?${params}`);
    const data = await res.json();
    setNotes(data);
  }, [search]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const selectNote = async (note: Note) => {
    setLoading(true);
    const res = await fetch(`/api/notes?id=${note.id}`);
    const full = await res.json();
    setSelected(full);
    setContent(full.content ?? '');
    setTitle(full.title);
    setTags(full.tags ? full.tags.split(',').filter(Boolean) : []);
    setLoading(false);
  };

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selected?.id,
        title: title.trim(),
        content,
        tags: tags.join(','),
        courseId: selected?.courseId,
      }),
    });
    setSaving(false);
    loadNotes();
  };

  const createNew = () => {
    setSelected(null);
    setContent('');
    setTitle('');
    setTags([]);
    close();
  };

  const deleteNote = async () => {
    if (!selected?.id) return;
    await fetch(`/api/notes?id=${selected.id}`, { method: 'DELETE' });
    setSelected(null);
    setContent('');
    loadNotes();
  };

  const summarize = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Сделай краткую выжимку (2-3 предложения) этой заметки:\n\n${content.slice(0, 3000)}`,
          courseTitle: 'Notes',
          moduleTitle: title || 'Untitled',
          history: [],
        }),
      });
      const data = await res.json();
      // Update summary in DB
      if (selected?.id) {
        await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selected.id, title, content, tags: tags.join(','), courseId: selected.courseId }),
        });
      }
      setContent(prev => prev + `\n\n---\n**AI Summary:** ${data.message}\n`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={2}>📝 Заметки</Title>
          <Group>
            <Button onClick={open} variant="light">Новая</Button>
            <Button component={Link} href="/" variant="subtle">← Назад</Button>
          </Group>
        </Group>

        <TextInput
          placeholder="Поиск по заметкам..."
          value={search}
          onChange={e => setSearch(e.currentTarget.value)}
          rightSection={
            search ? (
              <ActionIcon onClick={() => { setSearch(''); }} variant="transparent" size="sm">✕</ActionIcon>
            ) : null
          }
        />

        <Grid>
          {/* Note list */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper withBorder p="sm" style={{ height: '60vh' }}>
              <ScrollArea h="100%">
                <Stack gap="xs">
                  {notes.length === 0 && (
                    <Text c="dimmed" size="sm" ta="center" mt="xl">
                      Нет заметок. Создайте первую!
                    </Text>
                  )}
                  {notes.map(note => (
                    <Paper
                      key={note.id}
                      p="sm"
                      withBorder
                      style={{
                        cursor: 'pointer',
                        opacity: selected?.id === note.id ? 1 : 0.7,
                        borderColor: selected?.id === note.id ? 'var(--mantine-color-blue-5)' : undefined,
                      }}
                      onClick={() => selectNote(note)}
                    >
                      <Text fw={500} size="sm" lineClamp={1}>{note.title}</Text>
                      {note.tags && (
                        <Group gap={4} mt={4}>
                          {note.tags.split(',').filter(Boolean).map(t => (
                            <Badge key={t} size="xs" variant="light">{t}</Badge>
                          ))}
                        </Group>
                      )}
                      {note.aiSummary && (
                        <Text size="xs" c="dimmed" mt={4} lineClamp={2}>{note.aiSummary}</Text>
                      )}
                    </Paper>
                  ))}
                </Stack>
              </ScrollArea>
            </Paper>
          </Grid.Col>

          {/* Editor */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Paper withBorder p="md" style={{ height: '60vh' }}>
              {loading ? (
                <Loader mx="auto" mt="xl" />
              ) : selected || !notes.length ? (
                <Stack gap="sm" style={{ height: '100%' }}>
                  <Group justify="space-between">
                    <TextInput
                      placeholder="Название заметки"
                      value={title}
                      onChange={e => setTitle(e.currentTarget.value)}
                      style={{ flex: 1 }}
                      size="md"
                      variant="unstyled"
                    />
                    <Group gap="xs">
                      <Button onClick={summarize} loading={saving} variant="subtle" size="xs" disabled={!content}>
                        🤖 AI
                      </Button>
                      <Button onClick={save} loading={saving} size="sm" disabled={!title.trim()}>
                        {saving ? '...' : '💾'}
                      </Button>
                      {selected && (
                        <Button onClick={deleteNote} color="red" variant="subtle" size="xs">🗑</Button>
                      )}
                    </Group>
                  </Group>

                  {tags.length > 0 && (
                    <Group gap={4}>
                      {tags.map((t, i) => (
                        <Badge key={i} size="sm" variant="light">{t}</Badge>
                      ))}
                    </Group>
                  )}

                  <Textarea
                    placeholder="Пишите в Markdown..."
                    value={content}
                    onChange={e => setContent(e.currentTarget.value)}
                    minRows={12}
                    maxRows={25}
                    style={{ flex: 1 }}
                    autosize
                  />
                </Stack>
              ) : (
                <Text c="dimmed" ta="center" mt="xl">
                  Выберите заметку или создайте новую
                </Text>
              )}
            </Paper>
          </Grid.Col>
        </Grid>
      </Stack>

      {/* New Note Modal */}
      <Modal opened={opened} onClose={close} title="Новая заметка">
        <Stack gap="sm">
          <TextInput
            label="Название"
            value={title}
            onChange={e => setTitle(e.currentTarget.value)}
            data-autofocus
          />
          <Button onClick={createNew} disabled={!title.trim()} fullWidth>
            Создать
          </Button>
        </Stack>
      </Modal>
    </Container>
  );
}
