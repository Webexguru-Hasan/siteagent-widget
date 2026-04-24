import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { z } from "zod";
import chalk from "chalk";
import { hello, echo } from "./tools.js";
// ============================================================================
// Dev Logging Utilities
// ============================================================================
const isDev = process.env.NODE_ENV !== "production";
function timestamp() {
    return new Date().toLocaleTimeString("en-US", { hour12: false });
}
function formatLatency(ms) {
    if (ms < 100)
        return chalk.green(`${ms}ms`);
    if (ms < 500)
        return chalk.yellow(`${ms}ms`);
    return chalk.red(`${ms}ms`);
}
function truncate(str, maxLen = 60) {
    if (str.length <= maxLen)
        return str;
    return str.slice(0, maxLen - 3) + "...";
}
function logRequest(method, params) {
    if (!isDev)
        return;
    const paramsStr = params ? chalk.gray(` ${truncate(JSON.stringify(params))}`) : "";
    console.log(`${chalk.gray(`[${timestamp()}]`)} ${chalk.cyan("→")} ${method}${paramsStr}`);
}
function logResponse(method, result, latencyMs) {
    if (!isDev)
        return;
    const latency = formatLatency(latencyMs);
    // For tool calls, show the result
    if (method === "tools/call" && result) {
        const resultStr = typeof result === "string" ? result : JSON.stringify(result);
        console.log(`${chalk.gray(`[${timestamp()}]`)} ${chalk.green("←")} ${truncate(resultStr)} ${chalk.gray(`(${latency})`)}`);
    }
    else {
        console.log(`${chalk.gray(`[${timestamp()}]`)} ${chalk.green("✓")} ${method} ${chalk.gray(`(${latency})`)}`);
    }
}
function logError(method, error, latencyMs) {
    const latency = formatLatency(latencyMs);
    let errorMsg;
    if (error instanceof Error) {
        errorMsg = error.message;
    }
    else if (typeof error === "object" && error !== null) {
        // JSON-RPC error object has { code, message, data? }
        const rpcError = error;
        errorMsg = rpcError.message || `Error ${rpcError.code || "unknown"}`;
    }
    else {
        errorMsg = String(error);
    }
    console.log(`${chalk.gray(`[${timestamp()}]`)} ${chalk.red("✖")} ${method} ${chalk.red(truncate(errorMsg))} ${chalk.gray(`(${latency})`)}`);
}
// ============================================================================
// MCP Server Setup
// ============================================================================
const server = new McpServer({
    name: "widget",
    version: "1.0.0",
});
// Register a simple "hello" tool
server.registerTool("hello", {
    title: "Hello Tool",
    description: "Returns a greeting message",
    inputSchema: {
        name: z.string().describe("Name to greet"),
    },
    outputSchema: {
        message: z.string(),
    },
}, async ({ name }) => {
    const output = hello(name);
    return {
        content: [{ type: "text", text: JSON.stringify(output) }],
        structuredContent: output,
    };
});
// Register an "echo" tool for testing
server.registerTool("echo", {
    title: "Echo Tool",
    description: "Echoes back the input text",
    inputSchema: {
        text: z.string().describe("Text to echo"),
    },
    outputSchema: {
        echo: z.string(),
        timestamp: z.string(),
    },
}, async ({ text }) => {
    const output = echo(text);
    return {
        content: [{ type: "text", text: JSON.stringify(output) }],
        structuredContent: output,
    };
});
// ============================================================================
// Express App Setup
// ============================================================================
const app = express();
app.use(express.json());
// Health check endpoint (required for Cloud Run)
app.get("/health", (_req, res) => {
    res.status(200).json({ status: "healthy" });
});
// MCP endpoint with dev logging
app.post("/mcp", async (req, res) => {
    const startTime = Date.now();
    const body = req.body;
    // Extract method and params from JSON-RPC request
    const method = body?.method || "unknown";
    const params = body?.params;
    // Log incoming request
    if (method === "tools/call") {
        const toolName = params?.name || "unknown";
        const toolArgs = params?.arguments;
        logRequest(`tools/call ${chalk.bold(toolName)}`, toolArgs);
    }
    else if (method !== "notifications/initialized") {
        logRequest(method, params);
    }
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
    });
    // Capture response body for logging
    let responseBody = "";
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);
    res.write = function (chunk, encodingOrCallback, callback) {
        if (chunk) {
            responseBody += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString();
        }
        return originalWrite(chunk, encodingOrCallback, callback);
    };
    res.end = function (chunk, encodingOrCallback, callback) {
        if (chunk) {
            responseBody += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString();
        }
        // Log response
        if (method !== "notifications/initialized") {
            const latency = Date.now() - startTime;
            try {
                const rpcResponse = JSON.parse(responseBody);
                if (rpcResponse?.error) {
                    logError(method, rpcResponse.error, latency);
                }
                else if (method === "tools/call") {
                    const content = rpcResponse?.result?.content;
                    const resultText = content?.[0]?.text;
                    logResponse(method, resultText, latency);
                }
                else {
                    logResponse(method, null, latency);
                }
            }
            catch {
                logResponse(method, null, latency);
            }
        }
        return originalEnd(chunk, encodingOrCallback, callback);
    };
    res.on("close", () => {
        transport.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
});
// JSON error handler (Express defaults to HTML errors)
app.use((_err, _req, res, _next) => {
    res.status(500).json({ error: "Internal server error" });
});
// ============================================================================
// Start Server
// ============================================================================
const port = parseInt(process.env.PORT || "8080");
const httpServer = app.listen(port, () => {
    console.log();
    console.log(chalk.bold("MCP Server running on"), chalk.cyan(`http://localhost:${port}`));
    console.log(`  ${chalk.gray("Health:")} http://localhost:${port}/health`);
    console.log(`  ${chalk.gray("MCP:")}    http://localhost:${port}/mcp`);
    if (isDev) {
        console.log();
        console.log(chalk.gray("─".repeat(50)));
        console.log();
    }
});
// Graceful shutdown for Cloud Run (SIGTERM before kill)
process.on("SIGTERM", () => {
    console.log("Received SIGTERM, shutting down...");
    httpServer.close(() => {
        process.exit(0);
    });
});
//# sourceMappingURL=index.js.map