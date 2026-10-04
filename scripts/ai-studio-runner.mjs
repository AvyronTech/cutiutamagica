#!/usr/bin/env node
import { createHash, createHmac, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

const config = {
  apiBase: (process.env.AI_STUDIO_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, ""),
  secret: process.env.AI_STUDIO_RUNNER_SECRET || "",
  runnerId: process.env.AI_STUDIO_RUNNER_ID || "cutiuta-imac",
  ollamaUrl: (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/$/, ""),
  ollamaModel: process.env.OLLAMA_MODEL || "qwen3:8b",
  comfyUrl: (process.env.COMFYUI_URL || "http://127.0.0.1:8188").replace(/\/$/, ""),
  imageWorkflow: process.env.AI_STUDIO_IMAGE_WORKFLOW || "",
  videoWorkflow: process.env.AI_STUDIO_VIDEO_WORKFLOW || "",
  pollMs: Math.max(5_000, Number(process.env.AI_STUDIO_POLL_MS || 15_000)),
};

if (!config.secret) {
  console.error("Lipsește AI_STUDIO_RUNNER_SECRET. Runnerul nu pornește fără autentificare HMAC.");
  process.exit(1);
}

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function signedHeaders(method, path, bodyBytes, mime = "application/json") {
  const timestamp = String(Date.now());
  const nonce = randomUUID().replaceAll("-", "");
  const bodyHash = digest(bodyBytes);
  const signed = [method, path, timestamp, nonce, bodyHash].join("\n");
  const signature = createHmac("sha256", config.secret).update(signed).digest("hex");
  return {
    "content-type": mime,
    "x-ai-runner-id": config.runnerId,
    "x-ai-runner-timestamp": timestamp,
    "x-ai-runner-nonce": nonce,
    "x-ai-content-sha256": bodyHash,
    "x-ai-runner-signature": `sha256=${signature}`,
  };
}

async function signedRequest(path, payload, method = "POST") {
  const bytes = Buffer.from(JSON.stringify({ runnerId: config.runnerId, ...payload }));
  const response = await fetch(`${config.apiBase}${path}`, {
    method,
    headers: signedHeaders(method, path, bytes),
    body: bytes,
  });
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(body?.error?.message || body?.error?.code || `HTTP ${response.status}`);
  return body.data;
}

async function health() {
  let ollama = { healthy: false, models: [] };
  let comfyHealthy = false;
  try {
    const response = await fetch(`${config.ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(5_000),
    });
    const body = await response.json();
    ollama = {
      healthy: response.ok,
      models: (body.models || []).map((model) => model.name).filter(Boolean),
    };
  } catch {}
  try {
    const response = await fetch(`${config.comfyUrl}/system_stats`, {
      signal: AbortSignal.timeout(5_000),
    });
    comfyHealthy = response.ok;
  } catch {}
  const capabilities = [];
  if (comfyHealthy && config.imageWorkflow) capabilities.push("image");
  if (comfyHealthy && config.videoWorkflow) capabilities.push("video");
  return { ollama, comfyui: { healthy: comfyHealthy, capabilities } };
}

function systemPrompt(job) {
  return [
    "Ești motorul local al studioului Cutiuța Magică.",
    "Urmează strict contextul JSON furnizat și skillul cutiuta-magica-marketing-comenzi.",
    "Nu inventa specificații, stoc, prețuri, recenzii, beneficii sau politici.",
    "Nu include date personale, secrete, instrucțiuni interne ori afirmații neverificate.",
    "Livrează o ciornă; nu pretinde că materialul a fost publicat.",
    `Canal: ${job.channel}. Scop: ${job.purpose}. Format: ${job.aspect_ratio}.`,
  ].join("\n");
}

async function runText(job) {
  const response = await fetch(`${config.ollamaUrl}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: config.ollamaModel,
      stream: false,
      messages: [
        { role: "system", content: systemPrompt(job) },
        {
          role: "user",
          content: `${job.prompt_text}\n\nCONTEXT APROBAT:\n${JSON.stringify(job.context)}\n\nRESTRICȚII:\n${JSON.stringify(job.constraints)}`,
        },
      ],
      format: {
        type: "object",
        properties: {
          headline: { type: "string" },
          caption: { type: "string" },
          callToAction: { type: "string" },
          hashtags: { type: "array", items: { type: "string" }, maxItems: 10 },
          visualBrief: { type: "string" },
          verificationNotes: { type: "array", items: { type: "string" } },
        },
        required: [
          "headline",
          "caption",
          "callToAction",
          "hashtags",
          "visualBrief",
          "verificationNotes",
        ],
      },
      options: { temperature: 0.45 },
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) throw new Error(`Ollama a răspuns cu HTTP ${response.status}.`);
  const body = await response.json();
  if (!body?.message?.content) throw new Error("Ollama nu a întors conținut.");
  return body.message.content;
}

function replaceMarkers(value, markers) {
  if (typeof value === "string") {
    let output = value;
    for (const [marker, replacement] of Object.entries(markers))
      output = output.replaceAll(marker, replacement);
    return output;
  }
  if (Array.isArray(value)) return value.map((item) => replaceMarkers(item, markers));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, replaceMarkers(child, markers)]),
    );
  }
  return value;
}

async function uploadSourceImage(job) {
  const source =
    job.context?.product?.approvedMedia?.find((media) => media.is_primary) ||
    job.context?.product?.approvedMedia?.[0];
  if (!source?.sourceUrl) throw new Error("Lipsește imaginea publică aprobată a produsului.");
  const response = await fetch(source.sourceUrl, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error("Imaginea-sursă aprobată nu poate fi descărcată.");
  const blob = await response.blob();
  const form = new FormData();
  form.append(
    "image",
    new File([blob], `product-${job.product_id}.webp`, { type: blob.type || "image/webp" }),
  );
  form.append("type", "input");
  form.append("overwrite", "false");
  const uploaded = await fetch(`${config.comfyUrl}/upload/image`, { method: "POST", body: form });
  if (!uploaded.ok) throw new Error(`ComfyUI nu a acceptat imaginea-sursă (${uploaded.status}).`);
  const result = await uploaded.json();
  return [result.subfolder, result.name].filter(Boolean).join("/");
}

async function waitForComfy(promptId) {
  const deadline = Date.now() + 20 * 60_000;
  while (Date.now() < deadline) {
    const response = await fetch(`${config.comfyUrl}/history/${encodeURIComponent(promptId)}`);
    if (response.ok) {
      const history = await response.json();
      const entry = history[promptId];
      if (entry?.status?.status_str === "error") throw new Error("Workflow-ul ComfyUI a eșuat.");
      if (entry?.outputs) return entry.outputs;
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error("Workflow-ul ComfyUI a depășit limita de 20 minute.");
}

function collectOutputs(outputs) {
  const files = [];
  for (const output of Object.values(outputs || {})) {
    for (const field of ["images", "gifs", "videos"]) {
      for (const file of output?.[field] || []) {
        if (file?.filename) files.push(file);
      }
    }
  }
  return files.slice(0, 8);
}

async function uploadResult(jobId, file) {
  const params = new URLSearchParams({
    filename: file.filename,
    subfolder: file.subfolder || "",
    type: file.type || "output",
  });
  const response = await fetch(`${config.comfyUrl}/view?${params}`);
  if (!response.ok) throw new Error(`Nu pot citi rezultatul ComfyUI ${file.filename}.`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const mime =
    response.headers.get("content-type")?.split(";")[0] ||
    (file.filename.endsWith(".mp4") ? "video/mp4" : "image/png");
  const assetId = `aia_${randomUUID().replaceAll("-", "")}`;
  const path = `/api/v1/integrations/ai-studio/runner/jobs/${jobId}/assets/${assetId}`;
  const stored = await fetch(`${config.apiBase}${path}`, {
    method: "PUT",
    headers: signedHeaders("PUT", path, bytes, mime),
    body: bytes,
  });
  const result = await stored.json().catch(() => ({}));
  if (!stored.ok)
    throw new Error(
      result?.error?.message || result?.error?.code || `Încărcarea ${file.filename} a eșuat.`,
    );
  return assetId;
}

async function runMedia(job) {
  const workflowPath = job.modality === "image" ? config.imageWorkflow : config.videoWorkflow;
  const raw = await readFile(workflowPath, "utf8");
  if (!raw.includes("__PROMPT__") || !raw.includes("__SOURCE_IMAGE_NAME__")) {
    throw new Error(
      "Workflow-ul trebuie să conțină __PROMPT__ și __SOURCE_IMAGE_NAME__ și să compună produsul original ca strat protejat.",
    );
  }
  const sourceName = await uploadSourceImage(job);
  const workflow = replaceMarkers(JSON.parse(raw), {
    __PROMPT__: `${job.prompt_text}. Change only background, ambient light and props. Keep the product source layer pixel-faithful and unregenerated.`,
    __SOURCE_IMAGE_NAME__: sourceName,
    __ASPECT_RATIO__: job.aspect_ratio,
    __JOB_ID__: job.id,
  });
  const queued = await fetch(`${config.comfyUrl}/prompt`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: workflow, client_id: config.runnerId }),
  });
  if (!queued.ok) throw new Error(`ComfyUI nu a acceptat workflow-ul (${queued.status}).`);
  const { prompt_id: promptId } = await queued.json();
  const files = collectOutputs(await waitForComfy(promptId));
  if (files.length === 0) throw new Error("Workflow-ul ComfyUI nu a produs fișiere.");
  return Promise.all(files.map((file) => uploadResult(job.id, file)));
}

async function processJob(job) {
  try {
    if (job.modality === "text") {
      const outputText = await runText(job);
      await signedRequest(`/api/v1/integrations/ai-studio/runner/jobs/${job.id}/result`, {
        status: "completed",
        outputText,
        assetIds: [],
      });
    } else {
      const assetIds = await runMedia(job);
      await signedRequest(`/api/v1/integrations/ai-studio/runner/jobs/${job.id}/result`, {
        status: "completed",
        outputText: null,
        assetIds,
      });
    }
    console.log(`Lucrarea ${job.id} a fost trimisă la verificare.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eroare necunoscută";
    await signedRequest(`/api/v1/integrations/ai-studio/runner/jobs/${job.id}/result`, {
      status: "failed",
      errorMessage: message,
      assetIds: [],
    }).catch(() => undefined);
    console.error(`Lucrarea ${job.id} a eșuat: ${message}`);
  }
}

let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});

console.log(`Runner AI pornit ca ${config.runnerId}. Nicio publicare externă nu este permisă.`);
while (!stopping) {
  try {
    const providers = await health();
    await signedRequest("/api/v1/integrations/ai-studio/runner/heartbeat", {
      version: "1.0.0",
      providers,
    });
    const capabilities = [];
    if (providers.ollama.healthy) capabilities.push("text");
    capabilities.push(...providers.comfyui.capabilities);
    if (capabilities.length) {
      const job = await signedRequest("/api/v1/integrations/ai-studio/runner/jobs/claim", {
        capabilities,
      });
      if (job) await processJob(job);
    }
  } catch (error) {
    console.error(
      `Runner indisponibil: ${error instanceof Error ? error.message : "eroare necunoscută"}`,
    );
  }
  if (!stopping) await new Promise((resolve) => setTimeout(resolve, config.pollMs));
}
console.log("Runner AI oprit în siguranță.");
