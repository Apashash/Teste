import { Router, type IRouter } from "express";
import {
  GetCountriesResponse,
  InitiatePaymentBody,
  GetTransactionParams,
  HandleWebhookBody,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { logAshtechError } from "../lib/ashtech-logger";

const router: IRouter = Router();

const ASHTECH_BASE = "https://ashtechpay.top";
const ASHTECH_API_KEY = process.env.ASHTECH_PAY_API_KEY;

const COUNTRIES_FALLBACK = {
  countries: [
    { name: "Bénin", code: "BJ", currency: "XOF", operators: ["Moov Money", "MTN Mobile Money"] },
    { name: "Burkina Faso", code: "BF", currency: "XOF", operators: ["Moov Money", "Orange Money"] },
    { name: "Cameroun", code: "CM", currency: "XAF", operators: ["MTN Mobile Money", "Orange Money"] },
    { name: "Centrafrique", code: "CF", currency: "XAF", operators: ["Orange Money"] },
    { name: "Congo", code: "CG", currency: "XAF", operators: ["Airtel Money", "MTN Mobile Money"] },
    { name: "Côte d'Ivoire", code: "CI", currency: "XOF", operators: ["Moov Money", "MTN", "Orange Money", "Wave"] },
    { name: "Gabon", code: "GA", currency: "XAF", operators: ["Airtel Money", "Moov Money"] },
    { name: "Guinée Conakry", code: "GN", currency: "GNF", operators: ["MTN Mobile Money", "Orange Money"] },
    { name: "Guinée Équatoriale", code: "GQ", currency: "XAF", operators: ["Orange Money"] },
    { name: "Guinée-Bissau", code: "GW", currency: "XOF", operators: ["Orange Money"] },
    { name: "Mali", code: "ML", currency: "XOF", operators: ["Moov Money", "Orange Money"] },
    { name: "Niger", code: "NE", currency: "XOF", operators: ["Airtel Money"] },
    { name: "RD Congo", code: "CD", currency: "CDF", operators: ["Afrimoney", "Airtel Money", "Orange Money", "Vodacom M-Pesa"] },
    { name: "Sénégal", code: "SN", currency: "XOF", operators: ["Free Money", "Orange Money", "Wave"] },
    { name: "Tchad", code: "TD", currency: "XAF", operators: ["Airtel Money", "Moov Money"] },
    { name: "Togo", code: "TG", currency: "XOF", operators: ["Flooz (Moov)", "T-Money"] },
  ],
};

function ashtechHeaders() {
  return {
    Authorization: `Bearer ${ASHTECH_API_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
    "Cache-Control": "no-cache",
    Origin: "https://ashtechpay.top",
    Referer: "https://ashtechpay.top/",
  };
}

async function safeParseJson(
  response: Response
): Promise<{ data: unknown | null; rawText: string }> {
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed || trimmed.startsWith("<")) {
    return { data: null, rawText: text };
  }
  try {
    return { data: JSON.parse(trimmed), rawText: text };
  } catch {
    return { data: null, rawText: text };
  }
}

router.get("/countries", async (req, res): Promise<void> => {
  try {
    const response = await fetch(`${ASHTECH_BASE}/v1/countries`, {
      headers: ashtechHeaders(),
    });

    if (response.ok) {
      const { data } = await safeParseJson(response);
      if (data) {
        const parsed = GetCountriesResponse.safeParse(data);
        if (parsed.success) {
          res.json(parsed.data);
          return;
        }
      }
    }

    logAshtechError({
      timestamp: new Date().toISOString(),
      endpoint: "GET /v1/countries",
      httpStatus: response.status,
      contentType: response.headers.get("content-type"),
      isJson: false,
      responseBody: "(non-JSON ou invalide)",
      note: "Fallback utilisé pour les pays",
    });

    req.log.warn({ status: response.status }, "Ashtech Pay countries unavailable, using fallback");
    res.json(COUNTRIES_FALLBACK);
  } catch (err) {
    req.log.warn({ err }, "Ashtech Pay unreachable, using fallback countries");
    res.json(COUNTRIES_FALLBACK);
  }
});

router.post("/collect", async (req, res): Promise<void> => {
  if (!ASHTECH_API_KEY) {
    req.log.error("ASHTECH_PAY_API_KEY is not configured");
    res.status(500).json({
      error: "configuration_error",
      message: "Clé API non configurée. Contactez l'administrateur.",
    });
    return;
  }

  const parsed = InitiatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "bad_request",
      message: parsed.error.message,
    });
    return;
  }

  const { customer_name: _customerName, ...ashtechBody } = parsed.data;

  let response: Response;
  try {
    response = await fetch(`${ASHTECH_BASE}/v1/collect`, {
      method: "POST",
      headers: ashtechHeaders(),
      body: JSON.stringify(ashtechBody),
    });
  } catch (err) {
    req.log.error({ err }, "Network error reaching Ashtech Pay");
    logAshtechError({
      timestamp: new Date().toISOString(),
      endpoint: "POST /v1/collect",
      httpStatus: 0,
      contentType: null,
      isJson: false,
      responseBody: String(err),
      requestBody: ashtechBody,
      note: "Erreur réseau — serveur AshtechPay injoignable",
    });
    res.status(502).json({
      error: "gateway_error",
      message: "Impossible de joindre le serveur de paiement. Veuillez réessayer.",
    });
    return;
  }

  const { data, rawText } = await safeParseJson(response);
  const contentType = response.headers.get("content-type");
  const isJson = !!data;

  if (data === null) {
    req.log.error(
      { status: response.status },
      "Ashtech Pay returned non-JSON response (possible Cloudflare block)"
    );
    logAshtechError({
      timestamp: new Date().toISOString(),
      endpoint: "POST /v1/collect",
      httpStatus: response.status,
      contentType,
      isJson: false,
      responseBody: rawText.slice(0, 1000),
      requestBody: ashtechBody,
      note: response.status === 403
        ? "Cloudflare bloque la requête (403) — IP serveur non whitelistée"
        : "Réponse non-JSON reçue d'AshtechPay",
    });
    res.status(502).json({
      error: "gateway_error",
      message:
        "Le serveur de paiement est temporairement inaccessible. Veuillez réessayer dans quelques instants.",
    });
    return;
  }

  if (response.status === 202) {
    res.status(202).json(data);
    return;
  }

  if (response.status === 400) {
    logAshtechError({
      timestamp: new Date().toISOString(),
      endpoint: "POST /v1/collect",
      httpStatus: 400,
      contentType,
      isJson,
      responseBody: rawText.slice(0, 1000),
      requestBody: ashtechBody,
      note: "Requête rejetée par AshtechPay (400) — voir responseBody pour le détail",
    });
    res.status(400).json(data);
    return;
  }

  if (response.status === 401) {
    req.log.error({ status: 401 }, "Ashtech Pay API key rejected");
    logAshtechError({
      timestamp: new Date().toISOString(),
      endpoint: "POST /v1/collect",
      httpStatus: 401,
      contentType,
      isJson,
      responseBody: rawText.slice(0, 1000),
      requestBody: ashtechBody,
      note: "Clé API rejetée (401) — vérifier ASHTECH_PAY_API_KEY",
    });
    res.status(502).json({
      error: "auth_error",
      message: "Clé API invalide ou révoquée. Contactez l'administrateur.",
    });
    return;
  }

  req.log.error({ status: response.status, data }, "Unexpected status from Ashtech Pay collect");
  logAshtechError({
    timestamp: new Date().toISOString(),
    endpoint: "POST /v1/collect",
    httpStatus: response.status,
    contentType,
    isJson,
    responseBody: rawText.slice(0, 1000),
    requestBody: ashtechBody,
    note: `Statut inattendu d'AshtechPay : ${response.status}`,
  });
  res.status(response.status >= 100 && response.status < 600 ? response.status : 502).json(data);
});

router.get("/transaction/:id", async (req, res): Promise<void> => {
  const parsed = GetTransactionParams.safeParse({ id: req.params.id });
  if (!parsed.success) {
    res.status(400).json({ error: "bad_request", message: "Invalid transaction ID" });
    return;
  }

  let response: Response;
  try {
    response = await fetch(
      `${ASHTECH_BASE}/v1/transaction/${encodeURIComponent(parsed.data.id)}`,
      { headers: ashtechHeaders() }
    );
  } catch (err) {
    req.log.error({ err }, "Network error reaching Ashtech Pay");
    logAshtechError({
      timestamp: new Date().toISOString(),
      endpoint: `GET /v1/transaction/${parsed.data.id}`,
      httpStatus: 0,
      contentType: null,
      isJson: false,
      responseBody: String(err),
      note: "Erreur réseau lors de la vérification de transaction",
    });
    res.status(502).json({
      error: "gateway_error",
      message: "Impossible de joindre le serveur de paiement.",
    });
    return;
  }

  const { data, rawText } = await safeParseJson(response);
  const contentType = response.headers.get("content-type");

  if (data === null) {
    req.log.error({ status: response.status }, "Ashtech Pay returned non-JSON for transaction");
    logAshtechError({
      timestamp: new Date().toISOString(),
      endpoint: `GET /v1/transaction/${parsed.data.id}`,
      httpStatus: response.status,
      contentType,
      isJson: false,
      responseBody: rawText.slice(0, 1000),
      note: "Réponse non-JSON pour la vérification de transaction",
    });
    res.status(502).json({
      error: "gateway_error",
      message: "Réponse invalide du serveur de paiement.",
    });
    return;
  }

  if (!response.ok) {
    logAshtechError({
      timestamp: new Date().toISOString(),
      endpoint: `GET /v1/transaction/${parsed.data.id}`,
      httpStatus: response.status,
      contentType,
      isJson: true,
      responseBody: rawText.slice(0, 1000),
      note: `Erreur AshtechPay sur transaction : ${response.status}`,
    });
  }

  res.status(response.ok ? 200 : response.status).json(data);
});

router.post("/webhook", async (req, res): Promise<void> => {
  res.status(200).json({ received: true });

  const parsed = HandleWebhookBody.safeParse(req.body);
  if (!parsed.success) {
    logger.warn({ body: req.body }, "Invalid webhook payload received");
    return;
  }

  const { event, transaction_id, reference, amount, currency } = parsed.data;

  logger.info({ event, transaction_id, reference, amount, currency }, "Webhook received");

  if (event === "payment.completed") {
    logger.info({ transaction_id, reference, amount, currency }, "Payment completed");
  } else if (event === "payment.failed") {
    logger.warn({ transaction_id, reference }, "Payment failed");
  } else if (event === "payout.completed") {
    logger.info({ transaction_id, reference }, "Payout completed");
  } else if (event === "payout.failed") {
    logger.warn({ transaction_id, reference }, "Payout failed");
  }
});

export default router;
