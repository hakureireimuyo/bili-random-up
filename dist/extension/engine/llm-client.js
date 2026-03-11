/**
 * OpenAI-compatible LLM client (for DeepSeek or similar providers).
 */
import { getValue } from "../storage/storage.js";
export function parseTagsFromContent(content) {
    const trimmed = content.trim();
    if (!trimmed)
        return [];
    try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
            return parsed.filter((tag) => typeof tag === "string");
        }
    }
    catch {
        // fall back to parsing lines
    }
    return trimmed
        .split(/[\n,]/g)
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
}
export function buildChatRequestBody(model, messages) {
    return {
        model,
        messages,
        temperature: 0.2
    };
}
async function loadSettings() {
    const saved = (await getValue("settings")) ?? {
        apiBaseUrl: "https://api.openai.com",
        apiModel: "gpt-4o-mini",
        apiKey: ""
    };
    return saved;
}
export async function chatComplete(messages, options = {}) {
    const settings = options.settings ?? (await loadSettings());
    const fetchFn = options.fetchFn ?? fetch;
    if (!settings.apiKey) {
        console.warn("[LLM] Missing apiKey");
        return null;
    }
    const url = `${settings.apiBaseUrl.replace(/\/$/, "")}/v1/chat/completions`;
    const body = buildChatRequestBody(settings.apiModel, messages);
    try {
        const response = await fetchFn(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            console.error("[LLM] Request failed", response.status);
            return null;
        }
        const data = (await response.json());
        const content = data.choices?.[0]?.message?.content;
        return typeof content === "string" ? content : null;
    }
    catch (error) {
        console.error("[LLM] Request error", error);
        return null;
    }
}
