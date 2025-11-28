/**
 * Brain-MCP Type Definitions
 * Defines all data structures for memory and thinking processes
 */

// ============================================================================
// Short-Term Memory Types
// ============================================================================

export interface ShortTermMemoryEntry {
    text: string;
    timestamp: number; // Unix timestamp in milliseconds
}

// ============================================================================
// Long-Term Memory Types
// ============================================================================

export interface LongTermMemoryMetadata {
    createdAt: string; // ISO 8601 timestamp
    lastAccessed: string; // ISO 8601 timestamp
    accessCount: number; // Number of times accessed
}

export interface LongTermMemoryNode {
    id: string; // UUID v4
    text: string;
    associations: string[]; // Array of associated node IDs
    metadata: LongTermMemoryMetadata;
}

export interface MemoryGraph {
    memories: Record<string, LongTermMemoryNode>;
}

// ============================================================================
// Thinking Process Types
// ============================================================================

export type ThoughtType =
    | 'observation'
    | 'analysis'
    | 'decision'
    | 'action'
    | 'reflection'
    | 'hypothesis';

export type ThoughtStatus =
    | 'active'
    | 'completed'
    | 'discarded'
    | 'pending';

export type CognitiveMode =
    | 'analytical'
    | 'intuitive'
    | 'creative'
    | 'critical'
    | 'meta-cognitive';

export interface ThoughtMetadata {
    thinking_time?: number; // milliseconds
    complexity?: 'low' | 'medium' | 'high';
    emotional_tone?: string;
}

export interface ThoughtNode extends LongTermMemoryNode {
    type: ThoughtType;
    confidence: number; // 0-1
    status: ThoughtStatus;
    parent_chain: string; // Chain ID
    previous_thought?: string; // Previous thought ID
    next_thoughts: string[]; // Next thought IDs (supports branching)
    reasoning_depth: number;
    thought_metadata: ThoughtMetadata;
}

export interface ThoughtChain {
    id: string;
    goal: string;
    context?: string;
    created_at: string;
    completed_at?: string;
    status: 'active' | 'completed' | 'paused';
    thoughts: string[]; // Array of thought IDs
    branches: string[]; // Array of branch chain IDs
    cognitive_mode: CognitiveMode;
}

// ============================================================================
// MCP Response Types
// ============================================================================

export interface MCPSuccess<T = any> {
    success: true;
    data: T;
    [key: string]: unknown;
}

export interface MCPError {
    success: false;
    error: string;
    details?: any;
    [key: string]: unknown;
}

export type MCPResponse<T = any> = MCPSuccess<T> | MCPError;

// ============================================================================
// Configuration Types
// ============================================================================

export interface MemoryConfig {
    shortTermCapacity: number;
    storagePath: string;
    autoSaveInterval: number; // milliseconds
    searchLimit: number;
    maxAssociationDepth: number;
    enableBackup: boolean;
}

// ============================================================================
// Search and Query Types
// ============================================================================

export interface SearchOptions {
    limit?: number;
    caseSensitive?: boolean;
}

export interface SearchResult {
    id: string;
    text: string;
    relevance?: number; // Future: add relevance scoring
}

export interface GetMemoryOptions {
    depth?: number; // Association depth
}

export interface MemoryWithAssociations {
    node: LongTermMemoryNode;
    associations: LongTermMemoryNode[];
}

// ============================================================================
// Statistics Types
// ============================================================================

export interface MemoryStats {
    shortTermCount: number;
    longTermCount: number;
    totalAssociations: number;
    oldestMemory?: string; // ISO timestamp
    newestMemory?: string; // ISO timestamp
    cacheSize: number; // bytes
}
