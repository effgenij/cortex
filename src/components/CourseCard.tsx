'use client';

import { Card, Text, Group, Badge, Button } from '@mantine/core';
import Link from 'next/link';

interface CourseCardProps {
  id: number;
  title: string;
  description: string | null;
  totalModules: number;
  completedModules: number;
  language: string | null;
}

export function CourseCard({ id, title, description, totalModules, completedModules, language }: CourseCardProps) {
  const progress = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between" mb="xs">
        <Text fw={500}>{title}</Text>
        {language && <Badge variant="light">{language.toUpperCase()}</Badge>}
      </Group>

      {description && (
        <Text size="sm" c="dimmed" mb="md" lineClamp={2}>
          {description}
        </Text>
      )}

      <Group justify="space-between" mb="xs">
        <Text size="sm" c="dimmed">
          {completedModules}/{totalModules} модулей
        </Text>
        <Text size="sm" fw={500}>
          {progress}%
        </Text>
      </Group>

      <Button
        component={Link}
        href={`/courses/${id}`}
        variant="light"
        color="blue"
        fullWidth
        mt="md"
        radius="md"
      >
        {progress > 0 ? 'Продолжить' : 'Начать'}
      </Button>
    </Card>
  );
}
