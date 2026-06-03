import { readdir, readFile, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import { db } from '@/db';
import { notes } from '@/db/schema';
import { eq } from 'drizzle-orm';

/** Sync markdown files from an Obsidian vault into Cortex notes DB.
 *  One-way: vault → Cortex. Does NOT write back to vault.
 */
export async function syncObsidianVault(vaultPath: string) {
  const files = await walkMdFiles(vaultPath);
  let imported = 0;

  for (const filePath of files) {
    const relativePath = filePath.slice(vaultPath.length + 1);
    const title = basename(filePath, '.md');

    // Check if already imported
    const existing = await db
      .select({ id: notes.id })
      .from(notes)
      .where(eq(notes.path, filePath))
      .get();

    if (existing) continue;

    try {
      const content = await readFile(filePath, 'utf-8');
      const tags = extractTags(content);

      await db.insert(notes).values({
        title,
        path: filePath,
        tags: tags.join(','),
        createdAt: (await stat(filePath)).mtime.toISOString(),
        updatedAt: new Date().toISOString(),
      });
      imported++;
    } catch {
      // skip unreadable files
    }
  }

  return imported;
}

async function walkMdFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        results.push(...await walkMdFiles(full));
      } else if (entry.isFile() && extname(entry.name) === '.md') {
        results.push(full);
      }
    }
  } catch { /* dir not found */ }
  return results;
}

function extractTags(content: string): string[] {
  // Extract #tag and frontmatter tags
  const tags = new Set<string>();

  // Inline #tags
  for (const match of content.matchAll(/#([a-zA-Zа-яё0-9_-]+)/g)) {
    tags.add(match[1].toLowerCase());
  }

  // Frontmatter tags: ["tag1", "tag2"]
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const fm = fmMatch[1];
    const tagLine = fm.match(/tags:\s*\[(.*?)\]/);
    if (tagLine) {
      for (const t of tagLine[1].matchAll(/"([^"]+)"/g)) {
        tags.add(t[1].toLowerCase());
      }
    }
  }

  return [...tags].slice(0, 10); // cap at 10 tags
}

/** Import a single markdown file as a Cortex note */
export async function importMarkdownFile(filePath: string) {
  const title = basename(filePath, '.md');
  const existing = await db
    .select({ id: notes.id })
    .from(notes)
    .where(eq(notes.path, filePath))
    .get();

  if (existing) return existing.id;

  const content = await readFile(filePath, 'utf-8');
  const tags = extractTags(content);

  const result = await db.insert(notes).values({
    title,
    path: filePath,
    tags: tags.join(','),
  }).returning({ id: notes.id }).get();

  return result!.id;
}
