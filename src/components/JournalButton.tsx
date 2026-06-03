'use client';

import { useState } from 'react';
import { Button, Group, Menu, Modal, Text, Stack, Loader, ScrollArea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconNotebook, IconBulb, IconQuestionMark, IconFileText } from '@tabler/icons-react';

interface Props {
  moduleId: number;
}

export function JournalButton({ moduleId }: Props) {
  const [opened, { open, close }] = useDisclosure(false);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');

  const generate = async (type: string) => {
    setLoading(true);
    setContent('');
    open();

    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, type }),
      });
      const data = await res.json();

      if (data.ok) {
        setTitle(data.title);
        setContent(data.content);
        notifications.show({
          title: 'Заметка создана 📝',
          message: data.title,
          color: 'green',
        });
      } else {
        setContent(`❌ ${data.error || 'Ошибка генерации'}`);
      }
    } catch (err) {
      setContent(`❌ Ошибка: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Menu shadow="md" width={200}>
        <Menu.Target>
          <Button
            variant="light"
            leftSection={<IconNotebook size={18} />}
            loading={loading}
          >
            AI Journal
          </Button>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>Сгенерировать</Menu.Label>
          <Menu.Item
            leftSection={<IconFileText size={14} />}
            onClick={() => generate('full')}
          >
            Полный конспект
          </Menu.Item>
          <Menu.Item
            leftSection={<IconBulb size={14} />}
            onClick={() => generate('summary')}
          >
            Выжимка
          </Menu.Item>
          <Menu.Item
            leftSection={<IconBulb size={14} />}
            onClick={() => generate('concepts')}
          >
            Ключевые концепции
          </Menu.Item>
          <Menu.Item
            leftSection={<IconQuestionMark size={14} />}
            onClick={() => generate('questions')}
          >
            Вопросы для проверки
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <Modal
        opened={opened}
        onClose={close}
        title={title || 'AI Journal'}
        size="lg"
      >
        {loading ? (
          <Stack align="center" py="xl">
            <Loader size="lg" />
            <Text size="sm" c="dimmed">
              Hermes генерирует заметки...
            </Text>
          </Stack>
        ) : (
          <ScrollArea h={500}>
            <Text
              size="sm"
              style={{ whiteSpace: 'pre-wrap' }}
              dangerouslySetInnerHTML={{
                __html: content
                  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\n\n/g, '<br/><br/>')
                  .replace(/\n- /g, '<br/>• ')
                  .replace(/\n\d\. /g, '<br/>$&'),
              }}
            />
          </ScrollArea>
        )}
      </Modal>
    </>
  );
}
