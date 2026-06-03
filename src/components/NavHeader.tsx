'use client';

import { Group, Button } from '@mantine/core';
import { useRouter } from 'next/navigation';

export function NavHeader() {
  const router = useRouter();

  return (
    <Group h="100%" px="md" justify="space-between">
      <Button
        onClick={() => router.push('/')}
        variant="transparent"
        fw={700}
        size="md"
      >
        🧠 Cortex
      </Button>
      <Button
        onClick={() => router.push('/settings')}
        variant="subtle"
        size="sm"
      >
        ⚙️ Настройки
      </Button>
    </Group>
  );
}
