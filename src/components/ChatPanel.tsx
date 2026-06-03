'use client';

import { useState, useRef, useEffect } from 'react';
import { Textarea, Button, Paper, Text, Stack, Group, Loader, ScrollArea } from '@mantine/core';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  references?: { title: string; url: string }[];
}

interface ChatPanelProps {
  courseTitle: string;
  moduleTitle: string;
  transcriptSnippet?: string;
}

export function ChatPanel({ courseTitle, moduleTitle, transcriptSnippet }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          courseTitle,
          moduleTitle,
          transcriptSnippet,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) throw new Error('Chat failed');
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.message, references: data.references }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Ошибка: AI-сервис недоступен. Попробуйте позже.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <Paper withBorder p="md" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Text fw={500} mb="sm">💬 AI-тьютор</Text>

      <ScrollArea style={{ flex: 1 }} viewportRef={scrollRef} mb="sm">
        <Stack gap="sm">
          {messages.length === 0 && (
            <Text c="dimmed" size="sm" ta="center" mt="xl">
              Задайте вопрос по материалу модуля
            </Text>
          )}
          {messages.map((msg, i) => (
            <Paper
              key={i}
              p="sm"
              withBorder
              bg={msg.role === 'assistant' ? 'dark.6' : 'blue.9'}
            >
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</Text>
              {msg.references && msg.references.length > 0 && (
                <Stack gap={2} mt="xs">
                  {msg.references.map((ref, j) => (
                    <Text key={j} size="xs" component="a" href={ref.url} target="_blank" c="blue.4">
                      📎 {ref.title}
                    </Text>
                  ))}
                </Stack>
              )}
            </Paper>
          ))}
          {loading && <Loader size="sm" mx="auto" />}
        </Stack>
      </ScrollArea>

      <Group align="flex-end">
        <Textarea
          placeholder="Спросите что-нибудь..."
          value={input}
          onChange={e => setInput(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          minRows={1}
          maxRows={4}
          style={{ flex: 1 }}
          disabled={loading}
          autosize
        />
        <Button onClick={send} loading={loading} disabled={!input.trim()}>
          →
        </Button>
      </Group>
    </Paper>
  );
}
