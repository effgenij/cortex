'use client';

import { useState } from 'react';
import { Button, Modal, Text, Stack, Loader, ScrollArea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconSearch, IconExternalLink } from '@tabler/icons-react';

interface Props {
  moduleId: number;
  moduleTitle: string;
}

export function DeepResearchButton({ moduleId, moduleTitle }: Props) {
  const [opened, { open, close }] = useDisclosure(false);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');

  const research = async () => {
    setLoading(true);
    setContent('');
    open();

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId }),
      });
      const data = await res.json();

      if (data.ok) {
        setContent(data.content);
      } else {
        setContent(`❌ ${data.error || 'Ошибка'}`);
      }
    } catch (err) {
      setContent(`❌ Ошибка: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="light"
        color="grape"
        leftSection={<IconSearch size={18} />}
        onClick={research}
        loading={loading}
      >
        Deep Research
      </Button>

      <Modal
        opened={opened}
        onClose={close}
        title={`🔬 Deep Research: ${moduleTitle}`}
        size="xl"
      >
        {loading ? (
          <Stack align="center" py="xl">
            <Loader size="lg" />
            <Text size="sm" c="dimmed">
              Hermes ищет статьи, туториалы и дополнительные материалы...
            </Text>
            <Text size="xs" c="dimmed">
              Это может занять до минуты
            </Text>
          </Stack>
        ) : (
          <ScrollArea h={550}>
            <Text
              size="sm"
              style={{ whiteSpace: 'pre-wrap' }}
              dangerouslySetInnerHTML={{
                __html: content
                  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                  .replace(/### (.+)/g, '<h4>$1</h4>')
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
