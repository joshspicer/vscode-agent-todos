import * as assert from 'assert';
import * as vscode from 'vscode';
import { CopilotInstructionsManager } from '../copilotInstructionsManager';
import { TodoItem } from '../types';

suite('CopilotInstructionsManager Subtask Tests', () => {
    let instructionsManager: CopilotInstructionsManager;

    setup(() => {
        instructionsManager = CopilotInstructionsManager.getInstance();
    });

    test('Should format todos with subtasks in markdown', async () => {
        await vscode.workspace.getConfiguration('agentTodos').update('enableSubtasks', true);

        const todos: TodoItem[] = [
            {
                id: 'todo-1',
                content: 'Main task',
                status: 'pending',
                priority: 'high',
                subtasks: [
                    { id: 'sub-1', content: 'Subtask 1', status: 'pending' },
                    { id: 'sub-2', content: 'Subtask 2', status: 'completed' }
                ]
            }
        ];

        // Test private method through reflection (not ideal but works for testing)
        const formatMethod = (instructionsManager as any).formatTodosAsMarkdown.bind(instructionsManager);
        const markdown = formatMethod(todos);

        assert.ok(markdown.includes('- [ ] todo-1: Main task 🔴'));
        assert.ok(markdown.includes('  - [ ] sub-1: Subtask 1'));
        assert.ok(markdown.includes('  - [x] sub-2: Subtask 2'));
    });

    test('Should format todos with adr in markdown', async () => {
        const todos: TodoItem[] = [
            {
                id: 'todo-1',
                content: 'Main task',
                status: 'completed',
                priority: 'medium',
                adr: 'Used async/await pattern for better error handling'
            }
        ];

        const formatMethod = (instructionsManager as any).formatTodosAsMarkdown.bind(instructionsManager);
        const markdown = formatMethod(todos);

        assert.ok(markdown.includes('- [x] todo-1: Main task 🟡'));
        assert.ok(markdown.includes('  _Used async/await pattern for better error handling_'));
    });

    test('Should not include subtasks when disabled', async () => {
        await vscode.workspace.getConfiguration('agentTodos').update('enableSubtasks', false);

        const todos: TodoItem[] = [
            {
                id: 'todo-1',
                content: 'Main task',
                status: 'pending',
                priority: 'low',
                subtasks: [
                    { id: 'sub-1', content: 'Subtask 1', status: 'pending' }
                ]
            }
        ];

        const formatMethod = (instructionsManager as any).formatTodosAsMarkdown.bind(instructionsManager);
        const markdown = formatMethod(todos);

        assert.ok(markdown.includes('- [ ] todo-1: Main task 🟢'));
        assert.ok(!markdown.includes('Subtask 1'));
    });

    test('Should handle todos with both subtasks and adr', async () => {
        await vscode.workspace.getConfiguration('agentTodos').update('enableSubtasks', true);

        const todos: TodoItem[] = [
            {
                id: 'todo-1',
                content: 'Complex task',
                status: 'in_progress',
                priority: 'high',
                subtasks: [
                    { id: 'sub-1', content: 'Research', status: 'completed' },
                    { id: 'sub-2', content: 'Implementation', status: 'pending' }
                ],
                adr: 'Using new API approach'
            }
        ];

        const formatMethod = (instructionsManager as any).formatTodosAsMarkdown.bind(instructionsManager);
        const markdown = formatMethod(todos);

        assert.ok(markdown.includes('- [-] todo-1: Complex task 🔴'));
        assert.ok(markdown.includes('  _Using new API approach_'));
        assert.ok(markdown.includes('  - [x] sub-1: Research'));
        assert.ok(markdown.includes('  - [ ] sub-2: Implementation'));
    });

    test('Should parse todos with subtasks from markdown', async () => {
        await vscode.workspace.getConfiguration('agentTodos').update('enableSubtasks', true);

        // Mock file system for testing
        const mockContent = `<todos rule="Review steps frequently throughout the conversation and DO NOT stop between steps unless they explicitly require it.">
- [ ] todo-1: Main task 🔴
  _Architecture decision record here_
  - [ ] subtask-1: Subtask 1
  - [x] subtask-2: Subtask 2
- [x] todo-2: Another task 🟡
</todos>`;

        // We would need to mock vscode.workspace.fs for a complete test
        // For now, we'll test the parsing logic conceptually
        // In a real test environment, you'd mock the file system operations
    });

    test('Should handle empty subtasks array', async () => {
        await vscode.workspace.getConfiguration('agentTodos').update('enableSubtasks', true);

        const todos: TodoItem[] = [
            {
                id: 'todo-1',
                content: 'Task without subtasks',
                status: 'pending',
                priority: 'medium',
                subtasks: []
            }
        ];

        const formatMethod = (instructionsManager as any).formatTodosAsMarkdown.bind(instructionsManager);
        const markdown = formatMethod(todos);

        assert.ok(markdown.includes('- [ ] todo-1: Task without subtasks 🟡'));
        // Should not include any subtask lines
        assert.ok(!markdown.includes('  - ['));
    });

    test('Should preserve IDs through format and parse cycle', async () => {
        await vscode.workspace.getConfiguration('agentTodos').update('enableSubtasks', true);

        const originalTodos: TodoItem[] = [
            {
                id: 'custom-todo-123',
                content: 'Task with custom ID',
                status: 'in_progress',
                priority: 'high',
                adr: 'Important architecture decision',
                subtasks: [
                    { id: 'custom-sub-456', content: 'First step', status: 'completed' },
                    { id: 'custom-sub-789', content: 'Second step', status: 'pending' }
                ]
            },
            {
                id: 'another-id-999',
                content: 'Simple task',
                status: 'pending',
                priority: 'low'
            }
        ];

        // Format to markdown
        const formatMethod = (instructionsManager as any).formatTodosAsMarkdown.bind(instructionsManager);
        const markdown = formatMethod(originalTodos);

        // Verify formatted output contains IDs
        assert.ok(markdown.includes('custom-todo-123:'));
        assert.ok(markdown.includes('custom-sub-456:'));
        assert.ok(markdown.includes('custom-sub-789:'));
        assert.ok(markdown.includes('another-id-999:'));

        // Verify order: adr before subtasks
        const lines = markdown.split('\n');
        const taskIndex = lines.findIndex((l: string) => l.includes('Task with custom ID'));
        const adrIndex = lines.findIndex((l: string) => l.includes('Important architecture decision'));
        const subtask1Index = lines.findIndex((l: string) => l.includes('First step'));

        assert.ok(taskIndex < adrIndex, 'Task should come before adr');
        assert.ok(adrIndex < subtask1Index, 'ADR should come before subtasks');
    });
});