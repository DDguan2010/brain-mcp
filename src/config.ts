/**
 * Brain-MCP Configuration
 * Default settings and configuration management
 */

import { MemoryConfig } from './types.js';
import * as path from 'path';

/**
 * Default configuration for the memory system
 */
export const DEFAULT_CONFIG: MemoryConfig = {
    // Short-term memory capacity (number of entries)
    shortTermCapacity: 100,

    // Storage path for persistent data
    storagePath: path.join(process.cwd(), 'memory_data'),

    // Auto-save interval in milliseconds (5 minutes)
    autoSaveInterval: 5 * 60 * 1000,

    // Maximum number of search results to return
    searchLimit: 10,

    // Maximum depth for association retrieval
    maxAssociationDepth: 3,

    // Enable automatic backup before saving
    enableBackup: true,
};

/**
 * File names for storage
 */
export const STORAGE_FILES = {
    memory: 'memory.brain',
    backup: 'memory.brain.backup',
    lock: 'memory.brain.lock',
};

/**
 * Memory safety thresholds
 */
export const MEMORY_SAFETY = {
    // Maximum cache size in bytes (100MB)
    maxCacheSize: 100 * 1024 * 1024,

    // Warning threshold (80MB)
    warnCacheSize: 80 * 1024 * 1024,

    // Maximum number of long-term memories before warning
    maxNodes: 100000,
};

/**
 * Merge user config with defaults
 */
export function mergeConfig(userConfig: Partial<MemoryConfig> = {}): MemoryConfig {
    return {
        ...DEFAULT_CONFIG,
        ...userConfig,
    };
}
