/**
 * Storage Manager
 * Handles file persistence for long-term memory with backup and recovery
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { LongTermMemoryNode, MemoryGraph, MCPResponse } from './types.js';
import { STORAGE_FILES } from './config.js';

export class StorageManager {
    private storagePath: string;
    private memoryFilePath: string;
    private backupFilePath: string;
    private lockFilePath: string;
    private enableBackup: boolean;
    private autoSaveTimer?: NodeJS.Timeout;
    private pendingSave: boolean = false;

    constructor(storagePath: string, enableBackup: boolean = true) {
        this.storagePath = storagePath;
        this.memoryFilePath = path.join(storagePath, STORAGE_FILES.memory);
        this.backupFilePath = path.join(storagePath, STORAGE_FILES.backup);
        this.lockFilePath = path.join(storagePath, STORAGE_FILES.lock);
        this.enableBackup = enableBackup;
    }

    /**
     * Initialize storage (create directory if needed)
     */
    async init(): Promise<MCPResponse<void>> {
        try {
            // Create storage directory if it doesn't exist
            await fs.mkdir(this.storagePath, { recursive: true });

            return {
                success: true,
                data: undefined,
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to initialize storage: ${(error as Error).message}`,
            };
        }
    }

    /**
     * Load memory data from file
     */
    async load(): Promise<MCPResponse<MemoryGraph>> {
        try {
            // Check if memory file exists
            try {
                await fs.access(this.memoryFilePath);
            } catch {
                // File doesn't exist, return empty memory
                return {
                    success: true,
                    data: { memories: {} },
                };
            }

            // Read and parse file
            const data = await fs.readFile(this.memoryFilePath, 'utf-8');
            const parsed = JSON.parse(data) as MemoryGraph;

            // Validate structure
            if (!parsed.memories || typeof parsed.memories !== 'object') {
                throw new Error('Invalid memory file structure');
            }

            return {
                success: true,
                data: parsed,
            };
        } catch (error) {
            // Try to recover from backup
            const backupResult = await this.loadBackup();

            if (backupResult.success) {
                return backupResult;
            }

            return {
                success: false,
                error: `Failed to load memory: ${(error as Error).message}`,
                details: 'Backup recovery also failed',
            };
        }
    }

    /**
     * Load memory from backup file
     */
    private async loadBackup(): Promise<MCPResponse<MemoryGraph>> {
        try {
            if (!this.enableBackup) {
                return {
                    success: false,
                    error: 'Backup is disabled',
                };
            }

            const data = await fs.readFile(this.backupFilePath, 'utf-8');
            const parsed = JSON.parse(data) as MemoryGraph;

            if (!parsed.memories || typeof parsed.memories !== 'object') {
                throw new Error('Invalid backup file structure');
            }

            return {
                success: true,
                data: parsed,
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to load backup: ${(error as Error).message}`,
            };
        }
    }

    /**
     * Save memory data to file with backup
     */
    async save(nodes: Map<string, LongTermMemoryNode>): Promise<MCPResponse<void>> {
        try {
            // Check for file lock
            if (await this.isLocked()) {
                return {
                    success: false,
                    error: 'Storage is locked by another process',
                };
            }

            // Create lock
            await this.createLock();

            try {
                // Create backup of existing file
                if (this.enableBackup) {
                    try {
                        await fs.access(this.memoryFilePath);
                        await fs.copyFile(this.memoryFilePath, this.backupFilePath);
                    } catch {
                        // No existing file to backup
                    }
                }

                // Convert Map to object for JSON serialization
                const memoryGraph: MemoryGraph = {
                    memories: Object.fromEntries(nodes),
                };

                // Write to file
                const data = JSON.stringify(memoryGraph, null, 2);
                await fs.writeFile(this.memoryFilePath, data, 'utf-8');

                return {
                    success: true,
                    data: undefined,
                };
            } finally {
                // Always remove lock
                await this.removeLock();
            }
        } catch (error) {
            await this.removeLock(); // Ensure lock is removed on error
            return {
                success: false,
                error: `Failed to save memory: ${(error as Error).message}`,
            };
        }
    }

    /**
     * Start auto-save timer
     */
    startAutoSave(
        interval: number,
        saveCallback: () => Promise<MCPResponse<void>>
    ): void {
        // Clear existing timer
        this.stopAutoSave();

        this.autoSaveTimer = setInterval(async () => {
            if (!this.pendingSave) {
                this.pendingSave = true;
                await saveCallback();
                this.pendingSave = false;
            }
        }, interval);
    }

    /**
     * Stop auto-save timer
     */
    stopAutoSave(): void {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = undefined;
        }
    }

    /**
     * Check if storage is locked
     */
    private async isLocked(): Promise<boolean> {
        try {
            await fs.access(this.lockFilePath);

            // Check if lock file is stale (older than 5 minutes)
            const stats = await fs.stat(this.lockFilePath);
            const age = Date.now() - stats.mtimeMs;

            if (age > 5 * 60 * 1000) {
                // Remove stale lock
                await this.removeLock();
                return false;
            }

            return true;
        } catch {
            return false;
        }
    }

    /**
     * Create lock file
     */
    private async createLock(): Promise<void> {
        await fs.writeFile(this.lockFilePath, Date.now().toString(), 'utf-8');
    }

    /**
     * Remove lock file
     */
    private async removeLock(): Promise<void> {
        try {
            await fs.unlink(this.lockFilePath);
        } catch {
            // Ignore errors if lock file doesn't exist
        }
    }

    /**
     * Get storage file stats
     */
    async getStats(): Promise<MCPResponse<{ size: number; modified: Date }>> {
        try {
            const stats = await fs.stat(this.memoryFilePath);
            return {
                success: true,
                data: {
                    size: stats.size,
                    modified: stats.mtime,
                },
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to get storage stats: ${(error as Error).message}`,
            };
        }
    }

    /**
     * Clean up resources
     */
    async cleanup(): Promise<void> {
        this.stopAutoSave();
        await this.removeLock();
    }
}
