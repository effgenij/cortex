'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Title,
  Paper,
  Text,
  Group,
  Badge,
  Button,
  ActionIcon,
  Modal,
  TextInput,
  Select,
  Stack,
  SegmentedControl,
  Loader,
  Tooltip,
  Code,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash, IconBrain, IconArchive, IconExternalLink } from '@tabler/icons-react';

interface InboxItem {
  id: number;
  title: string;
  url: string | null;
  sourceType: string;
  status: string;
  summary: string | null;
  extractedInsights: string | null;
  createdAt: string;
  processedAt: string | null;
}

const SOURCE_LABELS: Record<string, string> = {
  article: '📄 Статья',
  podcast: '🎙 Подкаст',
  email: '📧 Почта',
  youtube: '▶️ YouTube',
  other: '📌 Другое',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'blue',
  in_progress: 'yellow',
  processed: 'green',
  archived: 'gray',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'Новое',
  in_progress: 'В обработке',
  processed: 'Готово',
  archived: 'Архив',
};

export default function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [filter, setFilter] = useState('new');
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newSource, setNewSource] = useState<string | null>('article');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchItems = useCallback(async () => {
    const res = await fetch(`/api/inbox?status=${filter}`);
    const data = await res.json();
    setItems(data);
  }, [filter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = async () => {
    if (!newTitle.trim()) return;
    await fetch('/api/inbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle,
        url: newUrl || null,
        sourceType: newSource || 'article',
      }),
    });
    setNewTitle('');
    setNewUrl('');
    close();
    fetchItems();
  };

  const processItem = async (id: number) => {
    setProcessingId(id);
    setLoading(true);

    try {
      const res = await fetch('/api/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'process' }),
      });
      const data = await res.json();

      if (data.ok) {
        notifications.show({
          title: 'Обработано 🤖',
          message: `Извлечено ${data.insights?.length || 0} инсайтов`,
          color: 'green',
        });
        fetchItems();
      } else {
        notifications.show({
          title: 'Ошибка',
          message: data.error || 'Не удалось обработать',
          color: 'red',
        });
      }
    } finally {
      setProcessingId(null);
      setLoading(false);
    }
  };

  const archiveItem = async (id: number) => {
    await fetch('/api/inbox', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'archive' }),
    });
    fetchItems();
  };

  const deleteItem = async (id: number) => {
    await fetch(`/api/inbox?id=${id}`, { method: 'DELETE' });
    fetchItems();
  };

  const parseInsights = (json: string | null): string[] => {
    if (!json) return [];
    try {
      return JSON.parse(json);
    } catch {
      return [];
    }
  };

  return (
    <Container size="md" py="lg">
      <Group justify="space-between" mb="md">
        <Title order={2}>📥 Inbox</Title>
        <Button leftSection={<IconPlus size={18} />} onClick={open}>
          Добавить
        </Button>
      </Group>

      <SegmentedControl
        value={filter}
        onChange={(v) => setFilter(v)}
        data={[
          { label: 'Новые', value: 'new' },
          { label: 'В обработке', value: 'in_progress' },
          { label: 'Готово', value: 'processed' },
          { label: 'Архив', value: 'archived' },
        ]}
        mb="md"
        fullWidth
      />

      <Stack gap="sm">
        {items.map((item) => {
          const insights = parseInsights(item.extractedInsights);
          const isExpanded = expandedId === item.id;

          return (
            <Paper key={item.id} p="md" withBorder>
              <Group justify="space-between" mb={4}>
                <Group gap="xs">
                  <Badge size="sm" variant="light">
                    {SOURCE_LABELS[item.sourceType] || item.sourceType}
                  </Badge>
                  <Badge size="sm" color={STATUS_COLORS[item.status]}>
                    {STATUS_LABELS[item.status]}
                  </Badge>
                </Group>
                <Group gap={4}>
                  {item.url && (
                    <Tooltip label="Открыть">
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        component="a"
                        href={item.url}
                        target="_blank"
                      >
                        <IconExternalLink size={14} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                  {item.status === 'new' && (
                    <>
                      <Tooltip label="Обработать (AI)">
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="blue"
                          onClick={() => processItem(item.id)}
                          loading={processingId === item.id}
                        >
                          <IconBrain size={14} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="В архив">
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="gray"
                          onClick={() => archiveItem(item.id)}
                        >
                          <IconArchive size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </>
                  )}
                  <Tooltip label="Удалить">
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="red"
                      onClick={() => deleteItem(item.id)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>

              <Text
                fw={500}
                style={{ cursor: 'pointer' }}
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
              >
                {item.title}
              </Text>

              {item.url && (
                <Text size="xs" c="dimmed" truncate>
                  {item.url}
                </Text>
              )}

              {item.summary && (
                <Text size="sm" mt="xs" c="dimmed">
                  {isExpanded
                    ? item.summary
                    : item.summary.substring(0, 200) +
                      (item.summary.length > 200 ? '...' : '')}
                </Text>
              )}

              {isExpanded && insights.length > 0 && (
                <Stack gap={4} mt="sm">
                  <Text size="xs" fw={700} c="dimmed">
                    💡 Инсайты:
                  </Text>
                  {insights.map((insight, i) => (
                    <Group key={i} gap="xs" wrap="nowrap">
                      <Text size="xs" c="yellow">
                        ●
                      </Text>
                      <Text size="sm">{insight}</Text>
                    </Group>
                  ))}
                </Stack>
              )}

              <Text size="xs" c="dimmed" mt="xs">
                {new Date(item.createdAt).toLocaleDateString('ru')}
                {item.processedAt &&
                  ` → обработано ${new Date(item.processedAt).toLocaleDateString('ru')}`}
              </Text>
            </Paper>
          );
        })}

        {items.length === 0 && !loading && (
          <Text c="dimmed" ta="center" py="xl">
            {filter === 'new'
              ? 'Inbox пуст 🎉'
              : 'Нет элементов с этим статусом'}
          </Text>
        )}

        {loading && (
          <Group justify="center" py="md">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">
              Hermes думает...
            </Text>
          </Group>
        )}
      </Stack>

      <Modal opened={opened} onClose={close} title="Добавить в Inbox">
        <Stack>
          <TextInput
            label="Заголовок"
            placeholder="О чём материал?"
            value={newTitle}
            onChange={(e) => setNewTitle(e.currentTarget.value)}
            data-autofocus
          />
          <TextInput
            label="Ссылка"
            placeholder="https://..."
            value={newUrl}
            onChange={(e) => setNewUrl(e.currentTarget.value)}
          />
          <Select
            label="Тип"
            value={newSource}
            onChange={setNewSource}
            data={[
              { value: 'article', label: '📄 Статья' },
              { value: 'podcast', label: '🎙 Подкаст' },
              { value: 'email', label: '📧 Почта' },
              { value: 'youtube', label: '▶️ YouTube' },
              { value: 'other', label: '📌 Другое' },
            ]}
          />
          <Button onClick={addItem} fullWidth>
            Добавить
          </Button>
        </Stack>
      </Modal>
    </Container>
  );
}
