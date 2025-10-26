import fs from 'fs';

export type LitellmRole = 'system' | 'user' | 'assistant';

export type LitellmContentPart =
    | { type: 'input_text'; text: string }
    | { type: 'output_text'; text: string }
    | { type: 'input_file'; file_id: string }
    | { type: 'input_image'; image_base64: string; mime_type?: string }
    | { type: 'input_audio'; audio_base64: string; mime_type?: string };

export interface LitellmMessage {
    role: LitellmRole;
    content: LitellmContentPart[];
}

export interface LitellmClientConfig {
    baseUrl: string;
    apiKey?: string;
    defaultModel: string;
    requestTimeoutMs?: number;
}

export interface LitellmFileInfo {
    id: string;
    status?: string;
    state?: string;
    uri?: string;
    raw: Record<string, unknown>;
}

export interface CreateResponseOptions {
    model?: string;
    input?: LitellmMessage[];
    messages?: LitellmMessage[];
    responseFormat?: 'text';
    metadata?: Record<string, unknown>;
}

export class LitellmClient {
    private readonly baseUrl: string;
    private readonly apiKey?: string;
    private readonly defaultModel: string;
    private readonly requestTimeoutMs: number;

    constructor(config: LitellmClientConfig) {
        this.baseUrl = config.baseUrl.replace(/\/?$/, '');
        this.apiKey = config.apiKey;
        this.defaultModel = config.defaultModel;
        this.requestTimeoutMs = config.requestTimeoutMs ?? 300000;
    }

    resolveFileId(raw: Record<string, unknown>): string | null {
        const possibleKeys = ['id', 'file_id', 'name', 'uri', 'fileId'];
        for (const key of possibleKeys) {
            const value = raw[key];
            if (typeof value === 'string' && value.trim().length > 0) {
                return value;
            }
        }
        return null;
    }

    isFileReady(info: LitellmFileInfo): boolean {
        const status = (info.status || info.state || info.raw?.['status'] || info.raw?.['state']);
        if (typeof status !== 'string') {
            return false;
        }

        const normalized = status.toLowerCase();
        return ['processed', 'ready', 'active', 'completed', 'succeeded', 'available'].includes(normalized);
    }

    isFileFailed(info: LitellmFileInfo): boolean {
        const status = (info.status || info.state || info.raw?.['status'] || info.raw?.['state']);
        if (typeof status !== 'string') {
            return false;
        }
        const normalized = status.toLowerCase();
        return ['failed', 'error', 'cancelled', 'canceled'].includes(normalized);
    }

    async uploadFile(filePath: string, displayName: string, mimeType?: string): Promise<LitellmFileInfo> {
        const resolvedPath = fs.existsSync(filePath) ? filePath : fs.realpathSync(filePath);
        const formData = new FormData();

        // 读取文件为 Buffer，然后转换为 Blob
        const fileBuffer = fs.readFileSync(resolvedPath);
        const fileBlob = new Blob([fileBuffer], { type: mimeType || 'application/octet-stream' });

        formData.append('file', fileBlob, displayName);
        formData.append('purpose', 'responses');
        if (mimeType) {
            formData.append('mime_type', mimeType);
        }

        const response = await this.fetchJson('/files', {
            method: 'POST',
            body: formData,
        });

        const id = this.resolveFileId(response);
        if (!id) {
            throw new Error('Unable to determine uploaded file identifier from LiteLLM response.');
        }

        return {
            id,
            status: typeof response.status === 'string' ? response.status : typeof response.state === 'string' ? response.state : undefined,
            state: typeof response.state === 'string' ? response.state : undefined,
            uri: typeof response.uri === 'string' ? response.uri : undefined,
            raw: response,
        };
    }

    async getFile(fileId: string): Promise<LitellmFileInfo> {
        const response = await this.fetchJson(`/files/${encodeURIComponent(fileId)}`, {
            method: 'GET',
        });

        const id = this.resolveFileId({ id: fileId, ...response });
        return {
            id: id || fileId,
            status: typeof response.status === 'string' ? response.status : typeof response.state === 'string' ? response.state : undefined,
            state: typeof response.state === 'string' ? response.state : undefined,
            uri: typeof response.uri === 'string' ? response.uri : undefined,
            raw: response,
        };
    }

    async createResponse(options: CreateResponseOptions): Promise<Record<string, unknown>> {
        const payload: Record<string, unknown> = {
            model: options.model ?? this.defaultModel,
        };

        if (options.input) {
            payload.input = options.input;
        } else if (options.messages) {
            payload.messages = options.messages;
        }

        if (options.responseFormat) {
            payload.response_format = { type: options.responseFormat };
        }

        if (options.metadata) {
            payload.metadata = options.metadata;
        }

        return this.fetchJson('/responses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
    }

    extractTextFromResponse(response: Record<string, unknown>): string | null {
        if (!response) {
            return null;
        }

        const outputText = response['output_text'];
        if (typeof outputText === 'string') {
            return outputText;
        }

        const content = response['content'];
        if (Array.isArray(content)) {
            const collected = this.collectText(content);
            if (collected.length > 0) {
                return collected.join('\n');
            }
        }

        const output = response['output'];
        if (Array.isArray(output)) {
            const collected = this.collectText(output);
            if (collected.length > 0) {
                return collected.join('\n');
            }
        }

        const data = response['data'];
        if (Array.isArray(data)) {
            const collected = this.collectText(data);
            if (collected.length > 0) {
                return collected.join('\n');
            }
        }

        return null;
    }

    private collectText(items: unknown[]): string[] {
        const texts: string[] = [];

        for (const item of items) {
            if (!item || typeof item !== 'object') {
                continue;
            }

            const maybeText = (item as Record<string, unknown>).text;
            if (typeof maybeText === 'string' && maybeText.trim().length > 0) {
                texts.push(maybeText.trim());
            }

            const content = (item as Record<string, unknown>).content;
            if (Array.isArray(content)) {
                texts.push(...this.collectText(content));
            }
        }

        return texts;
    }

    private async fetchJson(path: string, init: RequestInit): Promise<Record<string, unknown>> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

        try {
            const headers: Record<string, string> = {
                ...(init.headers as Record<string, string> || {}),
            };

            if (this.apiKey) {
                headers['Authorization'] = `Bearer ${this.apiKey}`;
            }

            const response = await fetch(`${this.baseUrl}${path}`, {
                ...init,
                headers,
                signal: controller.signal,
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                throw new Error(`LiteLLM request failed with status ${response.status}: ${errorText}`);
            }

            return await response.json() as Record<string, unknown>;
        } finally {
            clearTimeout(timeout);
        }
    }
}

