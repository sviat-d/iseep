/**
 * HTTP client for iseep API.
 * Reads ISEEP_BASE_URL and ISEEP_API_TOKEN from environment.
 */

export class IseepClient {
  private baseUrl: string;
  private apiToken: string;

  constructor() {
    const baseUrl = process.env.ISEEP_BASE_URL;
    const apiToken = process.env.ISEEP_API_TOKEN;

    if (!baseUrl) throw new Error("ISEEP_BASE_URL environment variable is required");
    if (!apiToken) throw new Error("ISEEP_API_TOKEN environment variable is required");

    this.baseUrl = baseUrl.replace(/\/$/, ""); // strip trailing slash
    this.apiToken = apiToken;
  }

  private async request(method: string, path: string, body?: unknown): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiToken}`,
      "Content-Type": "application/json",
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = (data as { error?: string }).error ?? `HTTP ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  }

  async getContext(modules?: string[]): Promise<unknown> {
    const params = modules?.length ? `?modules=${modules.join(",")}` : "";
    return this.request("GET", `/api/context${params}`);
  }

  async listIcps(): Promise<unknown> {
    return this.request("GET", "/api/icps");
  }

  async getScoringResults(opts?: { uploadId?: string; limit?: number }): Promise<unknown> {
    const params = new URLSearchParams();
    if (opts?.uploadId) params.set("uploadId", opts.uploadId);
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return this.request("GET", `/api/scoring/latest${qs ? `?${qs}` : ""}`);
  }

  async submitSuggestions(drafts: unknown[]): Promise<unknown> {
    return this.request("POST", "/api/drafts", { drafts });
  }
}
