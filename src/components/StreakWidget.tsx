import { Card, Text, Group, RingProgress } from '@mantine/core';

interface StreakWidgetProps {
  currentStreak: number;
  todayModules: number;
  todayMinutes: number;
}

export function StreakWidget({ currentStreak, todayModules, todayMinutes }: StreakWidgetProps) {
  const color = currentStreak >= 7 ? 'green' : currentStreak >= 3 ? 'yellow' : 'red';

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="center">
        <RingProgress
          size={120}
          thickness={12}
          roundCaps
          sections={[{ value: Math.min(currentStreak * 10, 100), color }]}
          label={
            <Text ta="center" size="xl" fw={700}>
              {currentStreak}
            </Text>
          }
        />
      </Group>
      <Text ta="center" size="sm" mt="sm" c="dimmed">
        дней подряд
      </Text>
      <Group justify="center" mt="xs" gap="xl">
        <Text size="xs" c="dimmed">{todayModules} модулей сегодня</Text>
        <Text size="xs" c="dimmed">{todayMinutes} мин</Text>
      </Group>
    </Card>
  );
}
