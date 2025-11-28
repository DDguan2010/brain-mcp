/**
 * Short-Term Memory Manager
 * Implements a FIFO-based temporary memory cache
 */

import { ShortTermMemoryEntry, MCPResponse } from './types.js';

export class ShortTermMemory {
    private memories: ShortTermMemoryEntry[] = [];
    private capacity: number;

    constructor(capacity: number = 100) {
        this.capacity = capacity;
    }

    /**
     * Add a new entry to short-term memory
     * Automatically evicts oldest entry if capacity is exceeded
     */
    add(text: string): MCPResponse<void> {
        try {
            if (!text || text.trim().length === 0) {
                return {
                    success: false,
                    error: 'Memory text cannot be empty',
                };
            }

            const entry: ShortTermMemoryEntry = {
                text: text.trim(),
                timestamp: Date.now(),
            };

            this.memories.push(entry);

            // FIFO eviction: remove oldest if capacity exceeded
            if (this.memories.length > this.capacity) {
                this.memories.shift(); // Remove first (oldest) element
            }

            return {
                success: true,
                data: undefined,
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to add short-term memory: ${(error as Error).message}`,
            };
        }
    }

    /**
     * Get all short-term memories (newest first)
     */
    getAll(): MCPResponse<ShortTermMemoryEntry[]> {
        try {
            // Return reversed copy (newest first) without modifying original
            return {
                success: true,
                data: [...this.memories].reverse(),
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to retrieve short-term memories: ${(error as Error).message}`,
            };
        }
    }

    /**
     * Clear all short-term memories
     */
    clear(): MCPResponse<void> {
        try {
            this.memories = [];
            return {
                success: true,
                data: undefined,
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to clear short-term memory: ${(error as Error).message}`,
            };
        }
    }

    /**
     * Get current count of memories
     */
    getCount(): number {
        return this.memories.length;
    }

    /**
     * Update capacity (does not affect existing memories)
     */
    setCapacity(newCapacity: number): MCPResponse<void> {
        try {
            if (newCapacity < 1) {
                return {
                    success: false,
                    error: 'Capacity must be at least 1',
                };
            }

            this.capacity = newCapacity;

            // Trim if current size exceeds new capacity
            while (this.memories.length > this.capacity) {
                this.memories.shift();
            }

            return {
                success: true,
                data: undefined,
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to set capacity: ${(error as Error).message}`,
            };
        }
    }
}
