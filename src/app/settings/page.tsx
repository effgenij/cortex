'use client';

import { useState } from 'react';
import {
  Container, Title, Text, Stack, TextInput, Button, Paper,
  Group, Select, Switch, Code, Divider,
} from '@mantine/core';
import Link from 'next/link';

export default function SettingsPage() {
  const [coursesDir, setCoursesDir] = useState('');
  const [cortexDir, setCortexDir] = useState('');
  const [theme, setTheme] = useState('dark');
  const [autoSync, setAutoSync] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coursesDir: coursesDir || undefined,
          cortexDir: cortexDir || undefined,
          theme,
          autoSync,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // settings save is best-effort for now
    }
  };

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Group>
          <Button component={Link} href="/" variant="subtle">
            ← Назад
          </Button>
        </Group>

        <Title order={1}>⚙️ Настройки</Title>

        <Paper p="lg" withBorder>
          <Stack gap="md">
            <Text fw={500}>Источники контента</Text>

            <TextInput
              label="Директория курсов"
              description="Откуда Cortex загружает видео-курсы"
              placeholder="/root/courses"
              value={coursesDir}
              onChange={e => setCoursesDir(e.currentTarget.value)}
            />

            <TextInput
              label="Директория Cortex"
              description="Где хранятся плагины и конфигурация"
              placeholder="~/.cortex"
              value={cortexDir}
              onChange={e => setCortexDir(e.currentTarget.value)}
            />

            <Divider />

            <Text fw={500}>Интерфейс</Text>

            <Select
              label="Тема"
              value={theme}
              onChange={v => setTheme(v ?? 'dark')}
              data={[
                { value: 'dark', label: 'Тёмная' },
                { value: 'light', label: 'Светлая' },
                { value: 'auto', label: 'Авто' },
              ]}
            />

            <Switch
              label="Авто-синхронизация курсов"
              description="Обновлять список курсов при открытии дашборда"
              checked={autoSync}
              onChange={e => setAutoSync(e.currentTarget.checked)}
            />

            <Divider />

            <Text fw={500}>AI-адаптер</Text>
            <Text size="sm" c="dimmed">
              По умолчанию используется Hermes CLI. Для смены AI-адаптера добавьте плагин в <Code>~/.cortex/plugins/</Code>.
            </Text>
          </Stack>
        </Paper>

        <Group>
          <Button onClick={handleSave} color={saved ? 'green' : 'blue'}>
            {saved ? '✓ Сохранено' : 'Сохранить'}
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}
