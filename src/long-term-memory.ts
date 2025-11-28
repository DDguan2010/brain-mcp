/**
 * Long-Term Memory Manager
 * Implements a graph-based persistent memory system
 */

import { v4 as uuidv4 } from 'uuid';
import {
    LongTermMemoryNode,
    LongTermMemoryMetadata,
    MCPResponse,
    SearchResult,
    SearchOptions,
    GetMemoryOptions,
    MemoryWithAssociations,
} from './types.js';

export class LongTermMemory {
    private nodes: Map<string, LongTermMemoryNode> = new Map();
    private isDirty: boolean = false; // Track if data needs saving

    /**
     * Add a new node to long-term memory
     */
    add(text: string, associations: string[] = []): MCPResponse<string> {
        try {
            if (!text || text.trim().length === 0) {
                return {
                    success: false,
                    error: 'Memory text cannot be empty',
                };
            }

            // Validate associations exist
            for (const assocId of associations) {
                if (!this.nodes.has(assocId)) {
                    return {
                        success: false,
                        error: `Associated node not found: ${assocId}`,
                    };
                }
            }

            const id = uuidv4();
            const now = new Date().toISOString();

            const metadata: LongTermMemoryMetadata = {
                createdAt: now,
                lastAccessed: now,
                accessCount: 0,
            };

            const node: LongTermMemoryNode = {
                id,
                text: text.trim(),
                associations: [...associations], // Copy array
                metadata,
            };

            this.nodes.set(id, node);
            this.isDirty = true;

            return {
                success: true,
                data: id,
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to add long-term memory: ${(error as Error).message}`,
            };
        }
    }

    /**
     * Get a node by ID with optional association depth
     */
    get(id: string, options: GetMemoryOptions = {}): MCPResponse<MemoryWithAssociations> {
        try {
            const node = this.nodes.get(id);
            if (!node) {
                return {
                    success: false,
                    error: `Memory not found: ${id}`,
                };
            }

            // Update access metadata
            node.metadata.lastAccessed = new Date().toISOString();
            node.metadata.accessCount++;
            this.isDirty = true;

            const depth = Math.min(options.depth ?? 1, 3); // Max depth 3 for safety
            const associations = this.getAssociatedNodes(id, depth);

            return {
                success: true,
                data: {
                    node,
                    associations,
                },
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to get memory: ${(error as Error).message}`,
            };
        }
    }

    /**
     * Search memories by keyword
     */
    search(keyword: string, options: SearchOptions = {}): MCPResponse<SearchResult[]> {
        try {
            if (!keyword || keyword.trim().length === 0) {
                return {
                    success: false,
                    error: 'Search keyword cannot be empty',
                };
            }

            const limit = options.limit ?? 10;
            const caseSensitive = options.caseSensitive ?? false;
            const searchTerm = caseSensitive ? keyword : keyword.toLowerCase();

            const results: SearchResult[] = [];

            for (const node of this.nodes.values()) {
                const text = caseSensitive ? node.text : node.text.toLowerCase();

                if (text.includes(searchTerm)) {
                    results.push({
                        id: node.id,
                        text: node.text,
                    });

                    if (results.length >= limit) {
                        break;
                    }
                }
            }

            return {
                success: true,
                data: results,
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to search memories: ${(error as Error).message}`,
            };
        }
    }

    /**
     * Update an existing node
     */
    update(id: string, newText?: string, newAssociations?: string[]): MCPResponse<void> {
        try {
            const node = this.nodes.get(id);
            if (!node) {
                return {
                    success: false,
                    error: `Memory not found: ${id}`,
                };
            }

            // Update text if provided
            if (newText !== undefined) {
                if (newText.trim().length === 0) {
                    return {
                        success: false,
                        error: 'Memory text cannot be empty',
                    };
                }
                node.text = newText.trim();
            }

            // Update associations if provided
            if (newAssociations !== undefined) {
                // Validate all associations exist
                for (const assocId of newAssociations) {
                    if (!this.nodes.has(assocId)) {
                        return {
                            success: false,
                            error: `Associated node not found: ${assocId}`,
                        };
                    }
                }
                node.associations = [...newAssociations];
            }

            node.metadata.lastAccessed = new Date().toISOString();
            this.isDirty = true;

            return {
                success: true,
                data: undefined,
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to update memory: ${(error as Error).message}`,
            };
        }
    }

    /**
     * Delete a node and remove it from all associations
     */
    delete(id: string): MCPResponse<void> {
        try {
            if (!this.nodes.has(id)) {
                return {
                    success: false,
                    error: `Memory not found: ${id}`,
                };
            }

            // Remove this ID from all other nodes' associations
            for (const node of this.nodes.values()) {
                const index = node.associations.indexOf(id);
                if (index > -1) {
                    node.associations.splice(index, 1);
                }
            }

            this.nodes.delete(id);
            this.isDirty = true;

            return {
                success: true,
                data: undefined,
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to delete memory: ${(error as Error).message}`,
            };
        }
    }

    /**
     * Get all direct associations of a node
     */
    getAssociations(id: string): MCPResponse<string[]> {
        try {
            const node = this.nodes.get(id);
            if (!node) {
                return {
                    success: false,
                    error: `Memory not found: ${id}`,
                };
            }

            return {
                success: true,
                data: [...node.associations],
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to get associations: ${(error as Error).message}`,
            };
        }
    }

    /**
     * Get associated nodes recursively up to specified depth
     * @private
     */
    private getAssociatedNodes(id: string, depth: number): LongTermMemoryNode[] {
        const visited = new Set<string>();
        const result: LongTermMemoryNode[] = [];

        const traverse = (currentId: string, currentDepth: number) => {
            if (currentDepth > depth || visited.has(currentId)) {
                return;
            }

            visited.add(currentId);
            const node = this.nodes.get(currentId);

            if (!node) {
                return;
            }

            // Don't include the root node itself
            if (currentId !== id) {
                result.push(node);
            }

            // Traverse associations
            for (const assocId of node.associations) {
                traverse(assocId, currentDepth + 1);
            }
        };

        traverse(id, 0);
        return result;
    }

    /**
     * Get all nodes (for export/persistence)
     */
    getAllNodes(): Map<string, LongTermMemoryNode> {
        return new Map(this.nodes);
    }

    /**
     * Load nodes from external source (for import/persistence)
     */
    loadNodes(nodes: Record<string, LongTermMemoryNode>): MCPResponse<void> {
        try {
            this.nodes.clear();

            for (const [id, node] of Object.entries(nodes)) {
                this.nodes.set(id, node);
            }

            this.isDirty = false;

            return {
                success: true,
                data: undefined,
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to load nodes: ${(error as Error).message}`,
            };
        }
    }

    /**
     * Get total count of nodes
     */
    getCount(): number {
        return this.nodes.size;
    }

    /**
     * Check if data has been modified since last save
     */
    checkIsDirty(): boolean {
        return this.isDirty;
    }

    /**
     * Mark data as clean (after save)
     */
    markClean(): void {
        this.isDirty = false;
    }

    /**
     * Get total number of associations across all nodes
     */
    getTotalAssociations(): number {
        let total = 0;
        for (const node of this.nodes.values()) {
            total += node.associations.length;
        }
        return total;
    }
}
