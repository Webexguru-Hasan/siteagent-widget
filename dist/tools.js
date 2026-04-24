/**
 * Pure tool functions — business logic only, no MCP dependency.
 * Each function is registered as an MCP tool in index.ts.
 *
 * This separation makes tools easy to unit test without MCP infrastructure.
 */
export function hello(name) {
    return { message: `Hello, ${name}! Welcome to MCP.` };
}
export function echo(text) {
    return {
        echo: text,
        timestamp: new Date().toISOString(),
    };
}
//# sourceMappingURL=tools.js.map