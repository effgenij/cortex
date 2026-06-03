'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Title,
  Grid,
  Paper,
  Text,
  Group,
  Badge,
  ActionIcon,
  Modal,
  TextInput,
  Textarea,
  Select,
  Button,
  Stack,
  Box,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconTrash, IconChevronRight, IconChevronLeft } from '@tabler/icons-react';

interface Task {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  dueDate: string | null;
  project: { name: string; color: string } | null;
}

const STATUSES = ['todo', 'in_progress', 'done'] as const;
const STATUS_LABELS: Record<string, string> = {
  todo: 'К выполнению',
  in_progress: 'В работе',
  done: 'Готово',
};
const STATUS_COLORS: Record<string, string> = {
  todo: 'gray',
  in_progress: 'blue',
  done: 'green',
};
const PRIORITY_LABELS: Record<number, string> = { 1: '🔥', 2: '●', 3: '○' };

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [opened, { open, close }] = useDisclosure(false);
  const [newTitle, setNewTitle] = useState('');

  const fetchTasks = useCallback(async () => {
    const res = await fetch('/api/tasks');
    const data = await res.json();
    setTasks(data);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const moveTask = async (taskId: number, newStatus: string) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchTasks();
  };

  const deleteTask = async (taskId: number) => {
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    fetchTasks();
  };

  const createTask = async () => {
    if (!newTitle.trim()) return;
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    });
    setNewTitle('');
    close();
    fetchTasks();
  };

  return (
    <Container size="xl" py="lg">
      <Group justify="space-between" mb="md">
        <Title order={2}>Задачи</Title>
        <Button leftSection={<IconPlus size={18} />} onClick={open}>
          Новая задача
        </Button>
      </Group>

      <Grid>
        {STATUSES.map((status) => {
          const columnTasks = tasks.filter((t) => t.status === status);
          return (
            <Grid.Col span={4} key={status}>
              <Paper p="sm" withBorder bg="gray.0">
                <Group justify="space-between" mb="xs">
                  <Badge color={STATUS_COLORS[status]} size="lg">
                    {STATUS_LABELS[status]}
                  </Badge>
                  <Text size="xs" c="dimmed">
                    {columnTasks.length}
                  </Text>
                </Group>

                <Stack gap="xs">
                  {columnTasks.map((task) => (
                    <Paper
                      key={task.id}
                      p="sm"
                      withBorder
                      shadow="xs"
                      bg="white"
                      style={{ cursor: 'pointer' }}
                    >
                      <Group justify="space-between" mb={4}>
                        <Text size="sm" fw={500}>
                          {PRIORITY_LABELS[task.priority]} {task.title}
                        </Text>
                        <Group gap={2}>
                          {status !== 'todo' && (
                            <Tooltip label="← Назад">
                              <ActionIcon
                                size="sm"
                                variant="subtle"
                                color="gray"
                                onClick={() =>
                                  moveTask(
                                    task.id,
                                    STATUSES[STATUSES.indexOf(status) - 1]
                                  )
                                }
                              >
                                <IconChevronLeft size={14} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                          {status !== 'done' && (
                            <Tooltip label="Вперёд →">
                              <ActionIcon
                                size="sm"
                                variant="subtle"
                                color="blue"
                                onClick={() =>
                                  moveTask(
                                    task.id,
                                    STATUSES[STATUSES.indexOf(status) + 1]
                                  )
                                }
                              >
                                <IconChevronRight size={14} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                          <Tooltip label="Удалить">
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              color="red"
                              onClick={() => deleteTask(task.id)}
                            >
                              <IconTrash size={14} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Group>
                      {task.project && (
                        <Badge
                          size="xs"
                          variant="dot"
                          color={task.project.color}
                          mb={4}
                        >
                          {task.project.name}
                        </Badge>
                      )}
                      {task.dueDate && (
                        <Text size="xs" c="dimmed">
                          📅 {task.dueDate}
                        </Text>
                      )}
                    </Paper>
                  ))}
                  {columnTasks.length === 0 && (
                    <Text size="sm" c="dimmed" ta="center" py="md">
                      Пусто
                    </Text>
                  )}
                </Stack>
              </Paper>
            </Grid.Col>
          );
        })}
      </Grid>

      <Modal opened={opened} onClose={close} title="Новая задача">
        <Stack>
          <TextInput
            label="Название"
            placeholder="Что нужно сделать?"
            value={newTitle}
            onChange={(e) => setNewTitle(e.currentTarget.value)}
            data-autofocus
          />
          <Button onClick={createTask} fullWidth>
            Создать
          </Button>
        </Stack>
      </Modal>
    </Container>
  );
}
