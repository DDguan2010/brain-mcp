/**
 * Thinking Process Manager
 * Implements thought chains, cognitive modes, and problem-solving frameworks
 */

import { v4 as uuidv4 } from 'uuid';
import {
    ThoughtChain,
    ThoughtNode,
    ThoughtType,
    ThoughtStatus,
    CognitiveMode,
    MCPResponse,
    LongTermMemoryMetadata,
} from './types.js';
import { LongTermMemory } from './long-term-memory.js';

export class ThinkingProcess {
    private chains: Map<string, ThoughtChain> = new Map();
    private thoughts: Map<string, ThoughtNode> = new Map();
    private longTermMemory: LongTermMemory;
    private currentMode: CognitiveMode = 'analytical';

    constructor(longTermMemory: LongTermMemory) {
        this.longTermMemory = longTermMemory;
    }

    // =========================================================================
    // Thought Chain Management
    // =========================================================================

    /**
     * Start a new thought process chain
     */
    startThoughtProcess(goal: string, context?: string): MCPResponse<string> {
        try {
            if (!goal || goal.trim().length === 0) {
                return {
                    success: false,
                    error: 'Goal cannot be empty',
                };
            }

            const chainId = uuidv4();
            const chain: ThoughtChain = {
                id: chainId,
                goal: goal.trim(),
                context: context?.trim(),
                created_at: new Date().toISOString(),
                status: 'active',
                thoughts: [],
                branches: [],
                cognitive_mode: this.currentMode,
            };

            this.chains.set(chainId, chain);

            return {
                success: true,
                data: chainId,
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to start thought process: ${(error as Error).message}`,
            };
        }
    }

    /**
     * Add a thought to an existing chain
     */
    addThought(
        chainId: string,
        thought: string,
        type: ThoughtType,
        parentThoughtId?: string,
        confidence: number = 0.7
    ): MCPResponse<string> {
        try {
            const chain = this.chains.get(chainId);
            if (!chain) {
                return {
                    success: false,
                    error: `Thought chain not found: ${chainId}`,
                };
            }

            if (chain.status !== 'active') {
                return {
                    success: false,
                    error: 'Cannot add thoughts to a non-active chain',
                };
            }

            if (!thought || thought.trim().length === 0) {
                return {
                    success: false,
                    error: 'Thought text cannot be empty',
                };
            }

            if (confidence < 0 || confidence > 1) {
                return {
                    success: false,
                    error: 'Confidence must be between 0 and 1',
                };
            }

            // Validate parent thought exists if specified
            if (parentThoughtId && !this.thoughts.has(parentThoughtId)) {
                return {
                    success: false,
                    error: `Parent thought not found: ${parentThoughtId}`,
                };
            }

            const thoughtId = uuidv4();
            const now = new Date().toISOString();

            const metadata: LongTermMemoryMetadata = {
                createdAt: now,
                lastAccessed: now,
                accessCount: 0,
            };

            const thoughtNode: ThoughtNode = {
                id: thoughtId,
                text: thought.trim(),
                associations: [],
                metadata,
                type,
                confidence,
                status: 'active',
                parent_chain: chainId,
                previous_thought: parentThoughtId,
                next_thoughts: [],
                reasoning_depth: parentThoughtId
                    ? (this.thoughts.get(parentThoughtId)?.reasoning_depth || 0) + 1
                    : 0,
                thought_metadata: {
                    thinking_time: 0,
                    complexity: 'medium',
                },
            };

            // Update parent's next_thoughts
            if (parentThoughtId) {
                const parent = this.thoughts.get(parentThoughtId);
                if (parent) {
                    parent.next_thoughts.push(thoughtId);
                }
            }

            this.thoughts.set(thoughtId, thoughtNode);
            chain.thoughts.push(thoughtId);

            return {
                success: true,
                data: thoughtId,
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to add thought: ${(error as Error).message}`,
            };
        }
    }

    /**
     * Create a branch from an existing thought
     */
    branchThought(
        thoughtId: string,
        newThought: string,
        type: ThoughtType = 'hypothesis',
        confidence: number = 0.6
    ): MCPResponse<string> {
        try {
            const originalThought = this.thoughts.get(thoughtId);
            if (!originalThought) {
                return {
                    success: false,
                    error: `Thought not found: ${thoughtId}`,
                };
            }

            const chain = this.chains.get(originalThought.parent_chain);
            if (!chain) {
                return {
                    success: false,
                    error: 'Parent chain not found',
                };
            }

            // Create new branch chain
            const branchChainId = uuidv4();
            const branchChain: ThoughtChain = {
                id: branchChainId,
                goal: `Branch from: ${originalThought.text.substring(0, 50)}...`,
                context: chain.goal,
                created_at: new Date().toISOString(),
                status: 'active',
                thoughts: [],
                branches: [],
                cognitive_mode: this.currentMode,
            };

            this.chains.set(branchChainId, branchChain);
            chain.branches.push(branchChainId);

            // Add the new thought to the branch
            const result = this.addThought(
                branchChainId,
                newThought,
                type,
                undefined,
                confidence
            );

            if (!result.success) {
                return result;
            }

            return {
                success: true,
                data: result.data,
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to branch thought: ${(error as Error).message}`,
            };
        }
    }

    /**
     * Evaluate a thought's quality
     */
    evaluateThought(
        thoughtId: string,
        confidence: number,
        reasoning: string
    ): MCPResponse<void> {
        try {
            const thought = this.thoughts.get(thoughtId);
            if (!thought) {
                return {
                    success: false,
                    error: `Thought not found: ${thoughtId}`,
                };
            }

            if (confidence < 0 || confidence > 1) {
                return {
                    success: false,
                    error: 'Confidence must be between 0 and 1',
                };
            }

            thought.confidence = confidence;
            thought.metadata.lastAccessed = new Date().toISOString();
            thought.metadata.accessCount++;

            // Store reasoning as association comment (could be enhanced)
            if (reasoning) {
                thought.associations.push(`reasoning:${reasoning}`);
            }

            return {
                success: true,
                data: undefined,
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to evaluate thought: ${(error as Error).message}`,
            };
        }
    }

    /**
     * Complete a thought process and generate conclusion
     */
    completeThoughtProcess(
        chainId: string,
        conclusion: string
    ): MCPResponse<void> {
        try {
            const chain = this.chains.get(chainId);
            if (!chain) {
                return {
                    success: false,
                    error: `Thought chain not found: ${chainId}`,
                };
            }

            if (!conclusion || conclusion.trim().length === 0) {
                return {
                    success: false,
                    error: 'Conclusion cannot be empty',
                };
            }

            chain.status = 'completed';
            chain.completed_at = new Date().toISOString();

            // Mark all thoughts in chain as completed
            for (const thoughtId of chain.thoughts) {
                const thought = this.thoughts.get(thoughtId);
                if (thought && thought.status === 'active') {
                    thought.status = 'completed';
                }
            }

            // Convert to long-term memory
            const memoryText = `[Thought Chain] ${chain.goal}\nConclusion: ${conclusion}`;
            const thoughtIds = chain.thoughts.map((id) => `thought:${id}`);
            this.longTermMemory.add(memoryText, thoughtIds);

            return {
                success: true,
                data: undefined,
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to complete thought process: ${(error as Error).message}`,
            };
        }
    }

    /**
     * Get current state of a thought chain
     */
    getCurrentThoughtChain(chainId: string): MCPResponse<{
        chain: ThoughtChain;
        thoughts: ThoughtNode[];
    }> {
        try {
            const chain = this.chains.get(chainId);
            if (!chain) {
                return {
                    success: false,
                    error: `Thought chain not found: ${chainId}`,
                };
            }

            const thoughts = chain.thoughts
                .map((id) => this.thoughts.get(id))
                .filter((t): t is ThoughtNode => t !== undefined);

            return {
                success: true,
                data: {
                    chain,
                    thoughts,
                },
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to get thought chain: ${(error as Error).message}`,
            };
        }
    }

    /**
     * Pause a thought process
     */
    pauseThinking(chainId: string, reason: string): MCPResponse<void> {
        try {
            const chain = this.chains.get(chainId);
            if (!chain) {
                return {
                    success: false,
                    error: `Thought chain not found: ${chainId}`,
                };
            }

            chain.status = 'paused';

            // Store pause reason in chain context
            chain.context = (chain.context || '') + `\n[Paused: ${reason}]`;

            return {
                success: true,
                data: undefined,
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to pause thinking: ${(error as Error).message}`,
            };
        }
    }

    /**
     * Resume a paused thought process
     */
    resumeThinking(chainId: string): MCPResponse<void> {
        try {
            const chain = this.chains.get(chainId);
            if (!chain) {
                return {
                    success: false,
                    error: `Thought chain not found: ${chainId}`,
                };
            }

            if (chain.status !== 'paused') {
                return {
                    success: false,
                    error: 'Can only resume paused chains',
                };
            }

            chain.status = 'active';

            return {
                success: true,
                data: undefined,
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to resume thinking: ${(error as Error).message}`,
            };
        }
    }

    // =========================================================================
    // Cognitive Mode Management
    // =========================================================================

    /**
     * Switch cognitive mode
     */
    switchCognitiveMode(mode: CognitiveMode, chainId?: string): MCPResponse<void> {
        try {
            this.currentMode = mode;

            // If chain specified, update its mode
            if (chainId) {
                const chain = this.chains.get(chainId);
                if (!chain) {
                    return {
                        success: false,
                        error: `Thought chain not found: ${chainId}`,
                    };
                }
                chain.cognitive_mode = mode;
            }

            return {
                success: true,
                data: undefined,
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to switch cognitive mode: ${(error as Error).message}`,
            };
        }
    }

    /**
     * Get optimal mode for task type
     */
    getOptimalModeForTask(taskType: string): MCPResponse<CognitiveMode> {
        try {
            const taskLower = taskType.toLowerCase();

            let mode: CognitiveMode = 'analytical';

            if (taskLower.includes('analyz') || taskLower.includes('logic')) {
                mode = 'analytical';
            } else if (taskLower.includes('creat') || taskLower.includes('innovat')) {
                mode = 'creative';
            } else if (taskLower.includes('critic') || taskLower.includes('evaluat')) {
                mode = 'critical';
            } else if (taskLower.includes('intuit') || taskLower.includes('pattern')) {
                mode = 'intuitive';
            } else if (taskLower.includes('reflect') || taskLower.includes('meta')) {
                mode = 'meta-cognitive';
            }

            return {
                success: true,
                data: mode,
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to determine optimal mode: ${(error as Error).message}`,
            };
        }
    }

    // =========================================================================
    // Statistics and Analysis
    // =========================================================================

    /**
     * Get thinking progress for a chain
     */
    getThinkingProgress(chainId: string): MCPResponse<{
        totalThoughts: number;
        completedThoughts: number;
        activeThoughts: number;
        averageConfidence: number;
        maxDepth: number;
    }> {
        try {
            const chain = this.chains.get(chainId);
            if (!chain) {
                return {
                    success: false,
                    error: `Thought chain not found: ${chainId}`,
                };
            }

            const thoughts = chain.thoughts
                .map((id) => this.thoughts.get(id))
                .filter((t): t is ThoughtNode => t !== undefined);

            const completed = thoughts.filter((t) => t.status === 'completed').length;
            const active = thoughts.filter((t) => t.status === 'active').length;
            const avgConfidence =
                thoughts.reduce((sum, t) => sum + t.confidence, 0) /
                (thoughts.length || 1);
            const maxDepth = Math.max(...thoughts.map((t) => t.reasoning_depth), 0);

            return {
                success: true,
                data: {
                    totalThoughts: thoughts.length,
                    completedThoughts: completed,
                    activeThoughts: active,
                    averageConfidence: avgConfidence,
                    maxDepth,
                },
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to get progress: ${(error as Error).message}`,
            };
        }
    }

    /**
     * Get all active chains
     */
    getActiveChains(): MCPResponse<ThoughtChain[]> {
        try {
            const active = Array.from(this.chains.values()).filter(
                (c) => c.status === 'active'
            );

            return {
                success: true,
                data: active,
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to get active chains: ${(error as Error).message}`,
            };
        }
    }

    /**
     * Get statistics about thinking processes
     */
    getThinkingStats(): MCPResponse<{
        totalChains: number;
        activeChains: number;
        completedChains: number;
        totalThoughts: number;
        modeDistribution: Record<CognitiveMode, number>;
    }> {
        try {
            const chains = Array.from(this.chains.values());
            const active = chains.filter((c) => c.status === 'active').length;
            const completed = chains.filter((c) => c.status === 'completed').length;

            const modeDistribution: Record<CognitiveMode, number> = {
                analytical: 0,
                intuitive: 0,
                creative: 0,
                critical: 0,
                'meta-cognitive': 0,
            };

            for (const chain of chains) {
                modeDistribution[chain.cognitive_mode]++;
            }

            return {
                success: true,
                data: {
                    totalChains: chains.length,
                    activeChains: active,
                    completedChains: completed,
                    totalThoughts: this.thoughts.size,
                    modeDistribution,
                },
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to get thinking stats: ${(error as Error).message}`,
            };
        }
    }
}
