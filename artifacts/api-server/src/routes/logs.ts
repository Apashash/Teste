import { Router, type IRouter } from "express";
import { readRecentLogs, getLogFilePath } from "../lib/ashtech-logger";

const router: IRouter = Router();

router.get("/logs", (_req, res): void => {
  const entries = readRecentLogs(100);
  const logFile = getLogFilePath();

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AshtechPay — Logs d'erreurs</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; padding: 24px; }
    h1 { font-size: 1.4rem; margin-bottom: 4px; color: #f8fafc; }
    .subtitle { font-size: 0.8rem; color: #64748b; margin-bottom: 20px; }
    .meta { font-size: 0.75rem; color: #475569; margin-bottom: 16px; }
    .empty { color: #22c55e; padding: 20px; text-align: center; font-size: 1rem; }
    .entry { background: #1e293b; border-radius: 8px; padding: 14px 16px; margin-bottom: 10px; border-left: 3px solid #ef4444; }
    .entry.ok { border-left-color: #22c55e; }
    .entry-header { display: flex; gap: 12px; align-items: center; margin-bottom: 8px; flex-wrap: wrap; }
    .ts { font-size: 0.72rem; color: #64748b; }
    .status { font-size: 0.78rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: #7f1d1d; color: #fca5a5; }
    .status.ok { background: #14532d; color: #86efac; }
    .endpoint { font-size: 0.78rem; color: #93c5fd; font-family: monospace; }
    .note { font-size: 0.8rem; color: #fbbf24; }
    .body { font-size: 0.72rem; font-family: monospace; color: #94a3b8; background: #0f172a; padding: 8px 10px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; max-height: 120px; overflow-y: auto; }
    .label { font-size: 0.68rem; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin: 6px 0 3px; }
    .refresh { margin-bottom: 16px; }
    button { background: #1d4ed8; color: white; border: none; padding: 7px 16px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; }
    button:hover { background: #1e40af; }
  </style>
</head>
<body>
  <h1>Logs d'erreurs AshtechPay</h1>
  <p class="subtitle">Fichier : ${logFile}</p>
  <p class="meta">${entries.length} entrée(s) — les plus récentes en premier</p>
  <div class="refresh"><button onclick="location.reload()">Actualiser</button></div>
  ${
    entries.length === 0
      ? '<div class="empty">✅ Aucune erreur enregistrée</div>'
      : entries
          .map((e) => {
            const isOk = e.httpStatus < 400;
            const bodyPreview = e.responseBody
              ? e.responseBody.slice(0, 800)
              : "(vide)";
            const reqPreview = e.requestBody
              ? JSON.stringify(e.requestBody, null, 2).slice(0, 400)
              : null;
            return `
  <div class="entry${isOk ? " ok" : ""}">
    <div class="entry-header">
      <span class="ts">${e.timestamp}</span>
      <span class="status${isOk ? " ok" : ""}">${e.httpStatus}</span>
      <span class="endpoint">${e.endpoint}</span>
    </div>
    <div class="note">${e.note}</div>
    ${reqPreview ? `<div class="label">Corps de la requête</div><div class="body">${reqPreview}</div>` : ""}
    <div class="label">Réponse AshtechPay (content-type: ${e.contentType ?? "?"}, JSON: ${e.isJson})</div>
    <div class="body">${bodyPreview}</div>
  </div>`;
          })
          .join("")
  }
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

router.get("/logs/json", (_req, res): void => {
  res.json(readRecentLogs(100));
});

export default router;
