#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { IseepClient } from "./client.js";
import { registerTools } from "./tools.js";

const server = new McpServer({
  name: "iseep",
  version: "1.0.0",
});

const client = new IseepClient();
registerTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
