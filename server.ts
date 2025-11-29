#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod/v4';
import { BrainMCP } from './src/brain-mcp.js';

// ============================================================================
// Initialize Brain-MCP
// ============================================================================

const brainMCP = new BrainMCP({
    storagePath: process.env.BRAIN_MCP_STORAGE_PATH || './memory_data',
    shortTermCapacity: 100,
    autoSaveInterval: process.env.BRAIN_MCP_AUTO_SAVE_INTERVAL ? parseInt(process.env.BRAIN_MCP_AUTO_SAVE_INTERVAL) : 5 * 60 * 1000, // 5 minutes
    searchLimit: 10,
    enableBackup: true,
});

// Initialize the memory system
await brainMCP.init();
console.log('Brain-MCP initialized successfully');

// ============================================================================
// Create MCP Server
// ============================================================================

const server = new McpServer({
    name: 'brain-mcp',
    version: '1.0.0'
});

// ============================================================================
// Short-Term Memory Tools
// ============================================================================

server.registerTool(
    'addShortTermMemory',
    {
        title: 'Add Short-Term Memory',
        description: 'Add a temporary memory to the short-term cache (FIFO, limited capacity)',
        inputSchema: {
            text: z.string().describe('The memory text to store')
        },
        outputSchema: {
            success: z.boolean(),
            error: z.string().optional()
        }
    },
    async ({ text }) => {
        const result = brainMCP.addShortTermMemory(text);
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result
        };
    }
);

server.registerTool(
    'getShortTermMemory',
    {
        title: 'Get Short-Term Memory',
        description: 'Retrieve all short-term memories (newest first)',
        inputSchema: {},
        outputSchema: {
            success: z.boolean(),
            data: z.array(z.object({
                text: z.string(),
                timestamp: z.number()
            })).optional(),
            error: z.string().optional()
        }
    },
    async () => {
        const result = brainMCP.getShortTermMemory();
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result
        };
    }
);

server.registerTool(
    'clearShortTermMemory',
    {
        title: 'Clear Short-Term Memory',
        description: 'Clear all short-term memories',
        inputSchema: {},
        outputSchema: {
            success: z.boolean(),
            error: z.string().optional()
        }
    },
    async () => {
        const result = brainMCP.clearShortTermMemory();
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result
        };
    }
);

// ============================================================================
// Long-Term Memory Tools
// ============================================================================

server.registerTool(
    'addLongTermMemory',
    {
        title: 'Add Long-Term Memory',
        description: 'Create a new persistent memory node with optional associations to other nodes',
        inputSchema: {
            text: z.string().describe('The memory text to store'),
            associations: z.array(z.string()).optional().describe('Array of associated memory node IDs')
        },
        outputSchema: {
            success: z.boolean(),
            data: z.string().optional().describe('The new memory node ID'),
            error: z.string().optional()
        }
    },
    async ({ text, associations }) => {
        const result = brainMCP.addLongTermMemory(text, associations || []);
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result
        };
    }
);

server.registerTool(
    'getLongTermMemory',
    {
        title: 'Get Long-Term Memory',
        description: 'Retrieve a memory node by ID with its associations up to specified depth',
        inputSchema: {
            id: z.string().describe('The memory node ID'),
            depth: z.number().optional().describe('Association depth (1-3, default: 1)')
        },
        outputSchema: {
            success: z.boolean(),
            data: z.object({
                node: z.any(),
                associations: z.array(z.any())
            }).optional(),
            error: z.string().optional()
        }
    },
    async ({ id, depth }) => {
        const result = brainMCP.getLongTermMemory(id, { depth });
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result
        };
    }
);

server.registerTool(
    'searchLongTermMemory',
    {
        title: 'Search Long-Term Memory',
        description: 'Search memory nodes by keyword (text matching)',
        inputSchema: {
            keyword: z.string().describe('Search keyword'),
            limit: z.number().optional().describe('Max results (default: 10)'),
            caseSensitive: z.boolean().optional().describe('Case-sensitive search (default: false)')
        },
        outputSchema: {
            success: z.boolean(),
            data: z.array(z.object({
                id: z.string(),
                text: z.string()
            })).optional(),
            error: z.string().optional()
        }
    },
    async ({ keyword, limit, caseSensitive }) => {
        const result = brainMCP.searchLongTermMemory(keyword, { limit, caseSensitive });
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result
        };
    }
);

server.registerTool(
    'updateLongTermMemory',
    {
        title: 'Update Long-Term Memory',
        description: 'Update a memory node\'s text and/or associations',
        inputSchema: {
            id: z.string().describe('The memory node ID'),
            newText: z.string().optional().describe('New memory text'),
            newAssociations: z.array(z.string()).optional().describe('New associations array')
        },
        outputSchema: {
            success: z.boolean(),
            error: z.string().optional()
        }
    },
    async ({ id, newText, newAssociations }) => {
        const result = brainMCP.updateLongTermMemory(id, newText, newAssociations);
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result
        };
    }
);

server.registerTool(
    'deleteLongTermMemory',
    {
        title: 'Delete Long-Term Memory',
        description: 'Delete a memory node and remove it from all associations',
        inputSchema: {
            id: z.string().describe('The memory node ID to delete')
        },
        outputSchema: {
            success: z.boolean(),
            error: z.string().optional()
        }
    },
    async ({ id }) => {
        const result = brainMCP.deleteLongTermMemory(id);
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result
        };
    }
);

server.registerTool(
    'getAssociations',
    {
        title: 'Get Memory Associations',
        description: 'Get all direct association IDs of a memory node',
        inputSchema: {
            id: z.string().describe('The memory node ID')
        },
        outputSchema: {
            success: z.boolean(),
            data: z.array(z.string()).optional(),
            error: z.string().optional()
        }
    },
    async ({ id }) => {
        const result = brainMCP.getAssociations(id);
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result
        };
    }
);

// ============================================================================
// System Management Tools
// ============================================================================

server.registerTool(
    'saveMemory',
    {
        title: 'Save Memory to Disk',
        description: 'Manually trigger saving all long-term memories to disk',
        inputSchema: {},
        outputSchema: {
            success: z.boolean(),
            error: z.string().optional()
        }
    },
    async () => {
        const result = await brainMCP.save();
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result
        };
    }
);

server.registerTool(
    'getMemoryStats',
    {
        title: 'Get Memory Statistics',
        description: 'Get statistics about the memory system',
        inputSchema: {},
        outputSchema: {
            success: z.boolean(),
            data: z.object({
                shortTermCount: z.number(),
                longTermCount: z.number(),
                totalAssociations: z.number(),
                oldestMemory: z.string().optional(),
                newestMemory: z.string().optional(),
                cacheSize: z.number()
            }).optional(),
            error: z.string().optional()
        }
    },
    async () => {
        const result = brainMCP.getStats();
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result
        };
    }
);

// ============================================================================
// Thinking Process Tools
// ============================================================================

server.registerTool(
    'startThoughtProcess',
    {
        title: 'Start Thought Process',
        description: 'Start a new thought process chain with a goal',
        inputSchema: {
            goal: z.string().describe('The goal of the thought process'),
            context: z.string().optional().describe('Optional context information')
        },
        outputSchema: {
            success: z.boolean(),
            data: z.string().optional().describe('The thought chain ID'),
            error: z.string().optional()
        }
    },
    async (params: { goal: string; context?: string }) => {
        const result = brainMCP.startThoughtProcess(params.goal, params.context);
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result
        };
    }
);

server.registerTool(
    'addThought',
    {
        title: 'Add Thought',
        description: 'Add a thought to an existing thought chain',
        inputSchema: {
            chainId: z.string().describe('The thought chain ID'),
            thought: z.string().describe('The thought content'),
            type: z.enum(['observation', 'analysis', 'decision', 'action', 'reflection', 'hypothesis']).describe('Type of thought'),
            parentThoughtId: z.string().optional().describe('Parent thought ID for branching'),
            confidence: z.number().min(0).max(1).default(0.7).describe('Confidence level (0-1)')
        },
        outputSchema: {
            success: z.boolean(),
            data: z.string().optional().describe('The new thought ID'),
            error: z.string().optional()
        }
    },
    async (params: { chainId: string; thought: string; type: string; parentThoughtId?: string; confidence?: number }) => {
        const result = brainMCP.addThought(
            params.chainId,
            params.thought,
            params.type as any,
            params.parentThoughtId,
            params.confidence
        );
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result
        };
    }
);

server.registerTool(
    'branchThought',
    {
        title: 'Branch Thought',
        description: 'Create a branch from an existing thought to explore alternative paths',
        inputSchema: {
            thoughtId: z.string().describe('The thought ID to branch from'),
            newThought: z.string().describe('New thought content for the branch'),
            type: z.enum(['observation', 'analysis', 'decision', 'action', 'reflection', 'hypothesis']).default('hypothesis'),
            confidence: z.number().min(0).max(1).default(0.6)
        },
        outputSchema: {
            success: z.boolean(),
            data: z.string().optional().describe('The new branch thought ID'),
            error: z.string().optional()
        }
    },
    async (params: { thoughtId: string; newThought: string; type?: string; confidence?: number }) => {
        const result = brainMCP.branchThought(
            params.thoughtId,
            params.newThought,
            params.type as any,
            params.confidence
        );
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result
        };
    }
);

server.registerTool(
    'evaluateThought',
    {
        title: 'Evaluate Thought',
        description: 'Evaluate and update the confidence level of a thought',
        inputSchema: {
            thoughtId: z.string().describe('The thought ID to evaluate'),
            confidence: z.number().min(0).max(1).describe('New confidence level'),
            reasoning: z.string().describe('Reasoning for the evaluation')
        },
        outputSchema: {
            success: z.boolean(),
            error: z.string().optional()
        }
    },
    async (params: { thoughtId: string; confidence: number; reasoning: string }) => {
        const result = brainMCP.evaluateThought(params.thoughtId, params.confidence, params.reasoning);
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result
        };
    }
);

server.registerTool(
    'completeThoughtProcess',
    {
        title: 'Complete Thought Process',
        description: 'Mark a thought process as complete and store the conclusion',
        inputSchema: {
            chainId: z.string().describe('The thought chain ID'),
            conclusion: z.string().describe('Final conclusion of the thought process')
        },
        outputSchema: {
            success: z.boolean(),
            error: z.string().optional()
        }
    },
    async (params: { chainId: string; conclusion: string }) => {
        const result = brainMCP.completeThoughtProcess(params.chainId, params.conclusion);
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result
        };
    }
);

server.registerTool(
    'getCurrentThoughtChain',
    {
        title: 'Get Current Thought Chain',
        description: 'Retrieve the current state of a thought chain with all thoughts',
        inputSchema: {
            chainId: z.string().describe('The thought chain ID')
        },
        outputSchema: {
            success: z.boolean(),
            data: z.object({
                chain: z.any(),
                thoughts: z.array(z.any())
            }).optional(),
            error: z.string().optional()
        }
    },
    async (params: { chainId: string }) => {
        const result = brainMCP.getCurrentThoughtChain(params.chainId);
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result
        };
    }
);

server.registerTool(
    'pauseThinking',
    {
        title: 'Pause Thinking',
        description: 'Pause an active thought process',
        inputSchema: {
            chainId: z.string().describe('The thought chain ID'),
            reason: z.string().describe('Reason for pausing')
        },
        outputSchema: {
            success: z.boolean(),
            error: z.string().optional()
        }
    },
    async (params: { chainId: string; reason: string }) => {
        const result = brainMCP.pauseThinking(params.chainId, params.reason);
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result
        };
    }
);

server.registerTool(
    'resumeThinking',
    {
        title: 'Resume Thinking',
        description: 'Resume a paused thought process',
        inputSchema: {
            chainId: z.string().describe('The thought chain ID')
        },
        outputSchema: {
            success: z.boolean(),
            error: z.string().optional()
        }
    },
    async (params: { chainId: string }) => {
        const result = brainMCP.resumeThinking(params.chainId);
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result
        };
    }
);

server.registerTool(
    'switchCognitiveMode',
    {
        title: 'Switch Cognitive Mode',
        description: 'Switch the cognitive mode for thinking processes',
        inputSchema: {
            mode: z.enum(['analytical', 'intuitive', 'creative', 'critical', 'meta-cognitive']).describe('Cognitive mode to switch to'),
            chainId: z.string().optional().describe('Optional chain ID to apply mode to')
        },
        outputSchema: {
            success: z.boolean(),
            error: z.string().optional()
        }
    },
    async (params: { mode: string; chainId?: string }) => {
        const result = brainMCP.switchCognitiveMode(params.mode as any, params.chainId);
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result
        };
    }
);

server.registerTool(
    'getOptimalModeForTask',
    {
        title: 'Get Optimal Cognitive Mode',
        description: 'Get the recommended cognitive mode for a specific task type',
        inputSchema: {
            taskType: z.string().describe('Description of the task')
        },
        outputSchema: {
            success: z.boolean(),
            data: z.enum(['analytical', 'intuitive', 'creative', 'critical', 'meta-cognitive']).optional(),
            error: z.string().optional()
        }
    },
    async (params: { taskType: string }) => {
        const result = brainMCP.getOptimalModeForTask(params.taskType);
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result
        };
    }
);

server.registerTool(
    'getThinkingProgress',
    {
        title: 'Get Thinking Progress',
        description: 'Get progress statistics for a thought chain',
        inputSchema: {
            chainId: z.string().describe('The thought chain ID')
        },
        outputSchema: {
            success: z.boolean(),
            data: z.object({
                totalThoughts: z.number(),
                completedThoughts: z.number(),
                activeThoughts: z.number(),
                averageConfidence: z.number(),
                maxDepth: z.number()
            }).optional(),
            error: z.string().optional()
        }
    },
    async (params: { chainId: string }) => {
        const result = brainMCP.getThinkingProgress(params.chainId);
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result
        };
    }
);

server.registerTool(
    'getActiveChains',
    {
        title: 'Get Active Thought Chains',
        description: 'Get all currently active thought chains',
        inputSchema: {},
        outputSchema: {
            success: z.boolean(),
            data: z.array(z.any()).optional(),
            error: z.string().optional()
        }
    },
    async () => {
        const result = brainMCP.getActiveChains();
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result
        };
    }
);

server.registerTool(
    'getThinkingStats',
    {
        title: 'Get Thinking Statistics',
        description: 'Get overall thinking process statistics',
        inputSchema: {},
        outputSchema: {
            success: z.boolean(),
            data: z.object({
                totalChains: z.number(),
                activeChains: z.number(),
                completedChains: z.number(),
                totalThoughts: z.number(),
                modeDistribution: z.any()
            }).optional(),
            error: z.string().optional()
        }
    },
    async () => {
        const result = brainMCP.getThinkingStats();
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result
        };
    }
);

// ============================================================================
// Setup Stdio Server
// ============================================================================

async function main() {
    const transport = new StdioServerTransport();
    
    await server.connect(transport);
    
    console.error('Brain-MCP MCP Server running on stdio');
    console.error('Available tools:');
    console.error('  - Short-Term Memory: addShortTermMemory, getShortTermMemory, clearShortTermMemory');
    console.error('  - Long-Term Memory: addLongTermMemory, getLongTermMemory, searchLongTermMemory, updateLongTermMemory, deleteLongTermMemory, getAssociations');
    console.error('  - Thinking Process: startThoughtProcess, addThought, branchThought, evaluateThought, completeThoughtProcess, getCurrentThoughtChain, pauseThinking, resumeThinking, switchCognitiveMode, getOptimalModeForTask, getThinkingProgress, getActiveChains, getThinkingStats');
    console.error('  - System: saveMemory, getMemoryStats');
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.error('Shutting down gracefully...');
    await brainMCP.shutdown();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.error('Shutting down gracefully...');
    await brainMCP.shutdown();
    process.exit(0);
});

// Start the server
main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
});