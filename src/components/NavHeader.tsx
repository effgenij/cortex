'use client';

import { Group, Button } from '@mantine/core';
import { useRouter } from 'next/navigation';

export function NavHeader() {
  const router = useRouter();

  return (
    <Group h="100%" px="md" justify="space-between">
      <Group gap="xs">
        <Button onClick={() => router.push('/')} variant="transparent" fw={700} size="md">
          🧠 Cortex
        </Button>
        <Button onClick={() => router.push('/notes')} variant="subtle" size="sm">
          📝 Заметки
        </Button>
        <Button onClick={() => router.push('/tasks')} variant="subtle" size="sm">
          ✅ Задачи
        </Button>
        <Button onClick={() => router.push('/calendar')} variant="subtle" size="sm">
          📅 Календарь
        </Button>
        <Button onClick={() => router.push('/inbox')} variant="subtle" size="sm">
          📥 Inbox
        </Button>
        <Button onClick={() => router.push('/search')} variant="subtle" size="sm">
          🔍 Поиск
        </Button>
        <Button onClick={() => router.push('/compare')} variant="subtle" size="sm">
          ⚖️ Compare
        </Button>
      </Group>
      <Button onClick={() => router.push('/settings')} variant="subtle" size="sm">
        ⚙️ Настройки
      </Button>
    </Group>
  );
}
