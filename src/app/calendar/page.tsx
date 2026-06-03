'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Title,
  Paper,
  Text,
  Group,
  Badge,
  ActionIcon,
  Modal,
  TextInput,
  Textarea,
  Button,
  Stack,
  Divider,
  Tooltip,
  Checkbox,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconTrash } from '@tabler/icons-react';

interface CalendarEvent {
  id: number;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  allDay: boolean;
  task: { id: number; title: string } | null;
}

interface DayGroup {
  date: string;
  label: string;
  events: CalendarEvent[];
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const months = [
    'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
    'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
  ];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}

export default function CalendarPage() {
  const [groups, setGroups] = useState<DayGroup[]>([]);
  const [opened, { open, close }] = useDisclosure(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Mantine v9 DateTimePicker onChange returns string | null
  const handleStartDate = (val: string | null) => {
    setStartDate(val ? new Date(val) : null);
  };
  const handleEndDate = (val: string | null) => {
    setEndDate(val ? new Date(val) : null);
  };
  const [allDay, setAllDay] = useState(false);

  const fetchEvents = useCallback(async () => {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 14);

    const res = await fetch(
      `/api/calendar?from=${from.toISOString().split('T')[0]}&to=${to.toISOString().split('T')[0]}`
    );
    const data: CalendarEvent[] = await res.json();

    // Group by date
    const grouped: Record<string, CalendarEvent[]> = {};
    for (const e of data) {
      const day = e.startDate.split('T')[0];
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(e);
    }

    const sorted = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, events]) => ({
        date,
        label: getDayLabel(date),
        events,
      }));

    setGroups(sorted);
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const deleteEvent = async (id: number) => {
    await fetch(`/api/calendar/${id}`, { method: 'DELETE' });
    fetchEvents();
  };

  const createEvent = async () => {
    if (!title.trim() || !startDate) return;
    await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description: description || null,
        startDate: startDate.toISOString(),
        endDate: endDate?.toISOString() || null,
        allDay,
      }),
    });
    setTitle('');
    setDescription('');
    setAllDay(false);
    close();
    fetchEvents();
  };

  const isToday = (dateStr: string) => {
    return dateStr === new Date().toISOString().split('T')[0];
  };

  return (
    <Container size="md" py="lg">
      <Group justify="space-between" mb="md">
        <Title order={2}>Календарь</Title>
        <Button leftSection={<IconPlus size={18} />} onClick={open}>
          Событие
        </Button>
      </Group>

      <Stack gap="md">
        {groups.map((group) => (
          <Paper
            key={group.date}
            p="md"
            withBorder
            bg={isToday(group.date) ? 'blue.0' : undefined}
          >
            <Group mb="xs">
              <Text fw={700}>{group.label}</Text>
              {isToday(group.date) && (
                <Badge size="xs" color="blue">
                  Сегодня
                </Badge>
              )}
              <Text size="xs" c="dimmed">
                {group.events.length}
              </Text>
            </Group>

            {group.events.length === 0 ? (
              <Text size="sm" c="dimmed">
                Нет событий
              </Text>
            ) : (
              <Stack gap="xs">
                {group.events.map((event) => (
                  <Group key={event.id} justify="space-between" wrap="nowrap">
                    <div>
                      <Group gap="xs">
                        {event.allDay && (
                          <Badge size="xs" variant="light">
                            весь день
                          </Badge>
                        )}
                        <Text size="sm">{event.title}</Text>
                        {event.task && (
                          <Badge size="xs" variant="dot" color="blue">
                            {event.task.title}
                          </Badge>
                        )}
                      </Group>
                      {!event.allDay && (
                        <Text size="xs" c="dimmed">
                          {new Date(event.startDate).toLocaleTimeString('ru', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {event.endDate &&
                            ` – ${new Date(event.endDate).toLocaleTimeString('ru', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}`}
                        </Text>
                      )}
                    </div>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="red"
                      onClick={() => deleteEvent(event.id)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                ))}
              </Stack>
            )}
          </Paper>
        ))}

        {groups.length === 0 && (
          <Text c="dimmed" ta="center" py="xl">
            Нет событий на ближайшие 14 дней
          </Text>
        )}
      </Stack>

      <Modal opened={opened} onClose={close} title="Новое событие" size="md">
        <Stack>
          <TextInput
            label="Название"
            placeholder="Встреча, дедлайн..."
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            data-autofocus
          />
          <Textarea
            label="Описание"
            placeholder="Детали (необязательно)"
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            minRows={2}
          />
          <DateTimePicker
            label="Начало"
            value={startDate}
            onChange={handleStartDate}
            valueFormat="DD.MM.YYYY HH:mm"
          />
          <DateTimePicker
            label="Конец (необязательно)"
            value={endDate}
            onChange={handleEndDate}
            valueFormat="DD.MM.YYYY HH:mm"
            clearable
          />
          <Checkbox
            label="На весь день"
            checked={allDay}
            onChange={(e) => setAllDay(e.currentTarget.checked)}
          />
          <Button onClick={createEvent} fullWidth>
            Создать
          </Button>
        </Stack>
      </Modal>
    </Container>
  );
}
