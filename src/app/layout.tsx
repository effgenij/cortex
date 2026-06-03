import type { Metadata } from 'next';
import { ColorSchemeScript, MantineProvider, AppShell, AppShellHeader, AppShellMain } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { NavigationProgress } from '@mantine/nprogress';
import { NavHeader } from '@/components/NavHeader';
import { ServiceWorker } from '@/components/ServiceWorker';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cortex — Personal Learning OS',
  description: 'AI-powered learning companion',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#228be6" />
      </head>
      <body>
        <MantineProvider defaultColorScheme="dark">
          <NavigationProgress />
          <Notifications position="top-right" />
          <ServiceWorker />
          <AppShell header={{ height: 56 }} padding="md">
            <AppShellHeader>
              <NavHeader />
            </AppShellHeader>
            <AppShellMain>
              {children}
            </AppShellMain>
          </AppShell>
        </MantineProvider>
      </body>
    </html>
  );
}
