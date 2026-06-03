/** Plugin manifest format — cortex.plugin.json */
export interface PluginManifest {
  name: string;
  version: string;
  type: 'ai' | 'source';
  description?: string;
  main: string;              // entry module path (relative to manifest)
  config?: Record<string, unknown>;
}

/** Validated and ready-to-load plugin */
export interface DiscoveredPlugin {
  manifest: PluginManifest;
  /** Absolute path to the directory containing cortex.plugin.json */
  dirPath: string;
}

export type PluginType = PluginManifest['type'];
