/**
 * Brain-MCP Main Module
 * Integrates all memory components and provides unified interface
 */

import { ShortTermMemory } from './short-term-memory.js';
import { LongTermMemory } from './long-term-memory.js';
import { StorageManager } from './storage.js';
import { ThinkingProcess } from './thinking-process.js';
import { mergeConfig } from './config.js';
import {
    MemoryConfig,
    MCPResponse,
    MemoryStats,
    ShortTermMemoryEntry,
    SearchResult,
    SearchOptions,
    GetMemoryOptions,
    MemoryWithAssociations,
    ThoughtType,
    CognitiveMode,
} from './types.js';

export class BrainMCP {
    private shortTermMemory: ShortTermMemory;
    private longTermMemory: LongTermMemory;
    private storage: StorageManager;
    private thinkingProcess: ThinkingProcess;
    private config: MemoryConfig;
    private initialized: boolean = false;

    constructor(userConfig: Partial<MemoryConfig> = {}) {
        this.config = mergeConfig(userConfig);
        this.shortTermMemory = new ShortTermMemory(this.config.shortTermCapacity);
        this.longTermMemory = new LongTermMemory();
        this.thinkingProcess = new ThinkingProcess(this.longTermMemory);
        this.storage = new StorageManager(
            this.config.storagePath,
            this.config.enableBackup
        );
    }

    // =========================================================================
    // System Management
    // =========================================================================

    /**
     * Initialize the memory system
     */
    async init(): Promise<MCPResponse<void>> {
        try {
            if (this.initialized) {
                return {
                    success: false,
                    error: 'Memory system already initialized',
                };
            }

            // Initialize storage
            const storageInit = await this.storage.init();
            if (!storageInit.success) {
                return storageInit;
            }

            // Load existing memories
            const loadResult = await this.storage.load();
            if (!loadResult.success) {
                return {
                    success: false,
                    error: loadResult.error,
                };
            }

            // Load into long-term memory
            const nodes = loadResult.data.memories;
            await this.longTermMemory.loadNodes(nodes);

            // Start auto-save
            this.storage.startAutoSave(this.config.autoSaveInterval, async () => {
                return this.save();
            });

            this.initialized = true;

            return {
                success: true,
                data: undefined,
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to initialize memory system: ${(error as Error).message}`,
            };
        }
    }

    /**
     * Manually save memory to disk
     */
    async save(): Promise<MCPResponse<void>> {
        try {
            if (!this.initialized) {
                return {
                    success: false,
                    error: 'Memory system not initialized',
                };
            }

            // Only save if data has changed
            if (!this.longTermMemory.checkIsDirty()) {
                return {
                    success: true,
                    data: undefined,
                };
            }

            const nodes = this.longTermMemory.getAllNodes();
            const result = await this.storage.save(nodes);

            if (result.success) {
                this.longTermMemory.markClean();
            }

            return result;
        } catch (error) {
            return {
                success: false,
                error: `Failed to save memory: ${(error as Error).message}`,
            };
        }
    }

    /**
     * Get memory statistics
     */
    getStats(): MCPResponse<MemoryStats> {
        try {
            const nodes = this.longTermMemory.getAllNodes();
            const nodeArray = Array.from(nodes.values());

            let oldestMemory: string | undefined;
            let newestMemory: string | undefined;

            if (nodeArray.length > 0) {
                const sorted = nodeArray.sort(
                    (a, b) =>
                        new Date(a.metadata.createdAt).getTime() -
                        new Date(b.metadata.createdAt).getTime()
                );
                oldestMemory = sorted[0].metadata.createdAt;
                newestMemory = sorted[sorted.length - 1].metadata.createdAt;
            }

            const stats: MemoryStats = {
                shortTermCount: this.shortTermMemory.getCount(),
                longTermCount: this.longTermMemory.getCount(),
                totalAssociations: this.longTermMemory.getTotalAssociations(),
                oldestMemory,
                newestMemory,
                cacheSize: this.estimateCacheSize(),
            };

            return {
                success: true,
                data: stats,
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to get stats: ${(error as Error).message}`,
            };
        }
    }

    /**
     * Shutdown the memory system gracefully
     */
    async shutdown(): Promise<MCPResponse<void>> {
        try {
            // Save any pending changes
            await this.save();

            // Stop auto-save and cleanup
            await this.storage.cleanup();

            this.initialized = false;

            return {
                success: true,
                data: undefined,
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to shutdown: ${(error as Error).message}`,
            };
        }
    }

    // =========================================================================
    // Short-Term Memory Operations
    // =========================================================================

    addShortTermMemory(text: string): MCPResponse<void> {
        return this.shortTermMemory.add(text);
    }

    getShortTermMemory(): MCPResponse<ShortTermMemoryEntry[]> {
        return this.shortTermMemory.getAll();
    }

    clearShortTermMemory(): MCPResponse<void> {
        return this.shortTermMemory.clear();
    }

    // =========================================================================
    // Long-Term Memory Operations
    // =========================================================================

    addLongTermMemory(
        text: string,
        associations: string[] = []
    ): MCPResponse<string> {
        const result = this.longTermMemory.add(text, associations);
        if (result.success) {
            // 自动保存到本地存储
            this.save();
        }
        return result;
    }

    getLongTermMemory(
        id: string,
        options: GetMemoryOptions = {}
    ): MCPResponse<MemoryWithAssociations> {
        return this.longTermMemory.get(id, options);
    }

    searchLongTermMemory(
        keyword: string,
        options: SearchOptions = {}
    ): MCPResponse<SearchResult[]> {
        const limit = options.limit ?? this.config.searchLimit;
        return this.longTermMemory.search(keyword, { ...options, limit });
    }

    updateLongTermMemory(
        id: string,
        newText?: string,
        newAssociations?: string[]
    ): MCPResponse<void> {
        const result = this.longTermMemory.update(id, newText, newAssociations);
        if (result.success) {
            // 自动保存到本地存储
            this.save();
        }
        return result;
    }

    deleteLongTermMemory(id: string): MCPResponse<void> {
        const result = this.longTermMemory.delete(id);
        if (result.success) {
            // 自动保存到本地存储
            this.save();
        }
        return result;
    }

    getAssociations(id: string): MCPResponse<string[]> {
        return this.longTermMemory.getAssociations(id);
    }

    // =========================================================================
    // Thinking Process Operations
    // =========================================================================

    startThoughtProcess(goal: string, context?: string): MCPResponse<string> {
        return this.thinkingProcess.startThoughtProcess(goal, context);
    }

    addThought(
        chainId: string,
        thought: string,
        type: ThoughtType,
        parentThoughtId?: string,
        confidence: number = 0.7
    ): MCPResponse<string> {
        const result = this.thinkingProcess.addThought(chainId, thought, type, parentThoughtId, confidence);
        if (result.success) {
            // 自动保存到本地存储
            this.save();
        }
        return result;
    }

    branchThought(
        thoughtId: string,
        newThought: string,
        type: ThoughtType = 'hypothesis',
        confidence: number = 0.6
    ): MCPResponse<string> {
        const result = this.thinkingProcess.branchThought(thoughtId, newThought, type, confidence);
        if (result.success) {
            // 自动保存到本地存储
            this.save();
        }
        return result;
    }

    evaluateThought(thoughtId: string, confidence: number, reasoning: string): MCPResponse<void> {
        const result = this.thinkingProcess.evaluateThought(thoughtId, confidence, reasoning);
        if (result.success) {
            // 自动保存到本地存储
            this.save();
        }
        return result;
    }

    completeThoughtProcess(chainId: string, conclusion: string): MCPResponse<void> {
        const result = this.thinkingProcess.completeThoughtProcess(chainId, conclusion);
        if (result.success) {
            // 自动保存到本地存储
            this.save();
        }
        return result;
    }

    getCurrentThoughtChain(chainId: string) {
        return this.thinkingProcess.getCurrentThoughtChain(chainId);
    }

    pauseThinking(chainId: string, reason: string): MCPResponse<void> {
        const result = this.thinkingProcess.pauseThinking(chainId, reason);
        if (result.success) {
            // 自动保存到本地存储
            this.save();
        }
        return result;
    }

    resumeThinking(chainId: string): MCPResponse<void> {
        const result = this.thinkingProcess.resumeThinking(chainId);
        if (result.success) {
            // 自动保存到本地存储
            this.save();
        }
        return result;
    }

    switchCognitiveMode(mode: CognitiveMode, chainId?: string): MCPResponse<void> {
        const result = this.thinkingProcess.switchCognitiveMode(mode, chainId);
        if (result.success) {
            // 自动保存到本地存储
            this.save();
        }
        return result;
    }

    getOptimalModeForTask(taskType: string): MCPResponse<CognitiveMode> {
        return this.thinkingProcess.getOptimalModeForTask(taskType);
    }

    getThinkingProgress(chainId: string) {
        return this.thinkingProcess.getThinkingProgress(chainId);
    }

    getActiveChains() {
        return this.thinkingProcess.getActiveChains();
    }

    getThinkingStats() {
        return this.thinkingProcess.getThinkingStats();
    }

    // =========================================================================
    // Utility Methods
    // =========================================================================

    /**
     * Estimate cache size in bytes (rough approximation)
     */
    private estimateCacheSize(): number {
        const nodes = this.longTermMemory.getAllNodes();
        let size = 0;

        for (const node of nodes.values()) {
            size += JSON.stringify(node).length * 2; // Rough estimate (UTF-16)
        }

        return size;
    }

    /**
     * Check if initialized
     */
    isInitialized(): boolean {
        return this.initialized;
    }
}
