import { readdir, readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { existsSync } from 'fs';
import { db } from '../../db';
import { pluginRegistry } from '../../db/schema';
import { eq } from 'drizzle-orm';
import type { PluginManifest, DiscoveredPlugin, PluginType } from './types';

const PLUGIN_DIRS = [
  resolve(process.env.HOME ?? '/root', '.cortex/plugins'),
  resolve(process.cwd(), 'plugins'),
];

const MANIFEST_FILE = 'cortex.plugin.json';

export class PluginLoader {
  /** Discover all plugins from standard directories */
  async discover(): Promise<DiscoveredPlugin[]> {
    const results: DiscoveredPlugin[] = [];

    for (const dir of PLUGIN_DIRS) {
      if (!existsSync(dir)) continue;

      try {
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const pluginDir = join(dir, entry.name);
          const manifestPath = join(pluginDir, MANIFEST_FILE);

          if (!existsSync(manifestPath)) continue;

          const raw = await readFile(manifestPath, 'utf-8');
          const manifest = JSON.parse(raw) as PluginManifest;

          // Basic validation
          if (!manifest.name || !manifest.type || !manifest.main) {
            console.warn(`[PluginLoader] Invalid manifest: ${manifestPath}`);
            continue;
          }
          if (manifest.type !== 'ai' && manifest.type !== 'source') {
            console.warn(`[PluginLoader] Unknown type "${manifest.type}" in: ${manifestPath}`);
            continue;
          }

          results.push({ manifest, dirPath: pluginDir });
        }
      } catch (err) {
        console.warn(`[PluginLoader] Error scanning ${dir}:`, err);
      }
    }

    return results;
  }

  /** Sync discovered plugins with the DB registry */
  async syncRegistry(discovered: DiscoveredPlugin[]): Promise<void> {
    const existing = await db.select().from(pluginRegistry).all();
    const existingNames = new Set(existing.map(p => p.name));

    for (const plugin of discovered) {
      if (existingNames.has(plugin.manifest.name)) {
        // Update existing
        await db
          .update(pluginRegistry)
          .set({
            manifestPath: join(plugin.dirPath, MANIFEST_FILE),
            config: JSON.stringify(plugin.manifest.config ?? {}),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(pluginRegistry.name, plugin.manifest.name));
      } else {
        // Insert new
        await db.insert(pluginRegistry).values({
          name: plugin.manifest.name,
          type: plugin.manifest.type,
          manifestPath: join(plugin.dirPath, MANIFEST_FILE),
          enabled: true,
          config: JSON.stringify(plugin.manifest.config ?? {}),
        });
      }
    }
  }

  /** Get enabled plugins of a specific type */
  async getEnabled(type: PluginType): Promise<DiscoveredPlugin[]> {
    const rows = await db
      .select()
      .from(pluginRegistry)
      .where(eq(pluginRegistry.type, type))
      .all();

    return rows
      .filter(r => r.enabled)
      .map(r => ({
        manifest: {
          name: r.name,
          version: '1.0.0', // stored elsewhere
          type: r.type as PluginType,
          main: r.manifestPath,
          config: typeof r.config === 'string' ? JSON.parse(r.config) : r.config,
        },
        dirPath: r.manifestPath.replace(`/${MANIFEST_FILE}`, ''),
      }));
  }
}
