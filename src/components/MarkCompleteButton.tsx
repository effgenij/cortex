'use client';

import { useState } from 'react';
import { Button } from '@mantine/core';

export function MarkCompleteButton({ moduleId }: { moduleId: number }) {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const markComplete = async () => {
    setLoading(true);
    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, status: 'completed' }),
      });
      setStatus('completed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={markComplete}
      loading={loading}
      color={status === 'completed' ? 'green' : 'blue'}
      fullWidth
      size="md"
      disabled={status === 'completed'}
    >
      {status === 'completed' ? '✓ Завершено' : 'Отметить как пройденный'}
    </Button>
  );
}
