import { Router, type IRouter } from "express";
import {
  GetCountriesResponse,
  InitiatePaymentBody,
  GetTransactionParams,
  HandleWebhookBody,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

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
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0 (compatible; AshtechPayClient/1.0)",
    "Cache-Control": "no-cache",
  };
}

router.get("/countries", async (req, res): Promise<void> => {
  try {
    const response = await fetch(`${ASHTECH_BASE}/v1/countries`, {
      headers: ashtechHeaders(),
    });

    if (response.ok) {
      const data = await response.json();
      const parsed = GetCountriesResponse.safeParse(data);
      if (parsed.success) {
        res.json(parsed.data);
        return;
      }
    }

    req.log.warn({ status: response.status }, "Ashtech Pay countries unavailable, using fallback");
    res.json(COUNTRIES_FALLBACK);
  } catch (err) {
    req.log.warn({ err }, "Ashtech Pay unreachable, using fallback countries");
    res.json(COUNTRIES_FALLBACK);
  }
});

router.post("/collect", async (req, res): Promise<void> => {
  const parsed = InitiatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "bad_request",
      message: parsed.error.message,
    });
    return;
  }

  const { customer_name: _customerName, ...ashtechBody } = parsed.data;

  try {
    const response = await fetch(`${ASHTECH_BASE}/v1/collect`, {
      method: "POST",
      headers: ashtechHeaders(),
      body: JSON.stringify(ashtechBody),
    });

    const data = await response.json();

    if (response.status === 202) {
      res.status(202).json(data);
      return;
    }

    if (response.status === 400) {
      res.status(400).json(data);
      return;
    }

    req.log.error({ status: response.status, data }, "Unexpected status from Ashtech Pay collect");
    res.status(response.status).json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to initiate payment");
    res.status(500).json({ error: "server_error", message: "Internal server error" });
  }
});

router.get("/transaction/:id", async (req, res): Promise<void> => {
  const parsed = GetTransactionParams.safeParse({ id: req.params.id });
  if (!parsed.success) {
    res.status(400).json({ error: "bad_request", message: "Invalid transaction ID" });
    return;
  }

  try {
    const response = await fetch(
      `${ASHTECH_BASE}/v1/transaction/${encodeURIComponent(parsed.data.id)}`,
      { headers: ashtechHeaders() }
    );

    const data = await response.json();
    res.status(response.ok ? 200 : response.status).json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to get transaction");
    res.status(500).json({ error: "server_error", message: "Internal server error" });
  }
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
