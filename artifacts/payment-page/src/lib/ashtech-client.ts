const ASHTECH_BASE = "https://ashtechpay.top";
const ASHTECH_API_KEY = (import.meta.env.VITE_ASHTECH_PAY_API_KEY as string) || "";

function ashtechHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${ASHTECH_API_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export interface Country {
  name: string;
  code: string;
  currency: string;
  operators: string[];
}

export interface CountriesResponse {
  countries: Country[];
}

export interface CollectRequest {
  amount: number;
  currency: string;
  phone: string;
  operator: string;
  country_code: string;
  reference?: string;
  otp?: string;
  notify_url?: string;
}

export interface CollectResponse {
  transaction_id: string;
  reference?: string;
  status: string;
  amount: number;
  credited_amount?: number;
  fee_amount?: number;
  currency: string;
  flow?: string;
  wave_url?: string;
}

export interface OtpRequiredResponse {
  error: string;
  message: string;
  ussd_code?: string;
}

export interface TransactionResponse {
  transaction_id: string;
  reference?: string;
  status: string;
  amount: number;
  credited_amount?: number;
  fee_amount?: number;
  currency: string;
  phone?: string;
  created_at?: string;
  confirmed_at?: string;
}

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Réponse inattendue du serveur (${res.status})`);
  }
}

export async function fetchCountries(): Promise<CountriesResponse> {
  const res = await fetch(`${ASHTECH_BASE}/v1/countries`, {
    headers: ashtechHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Impossible de récupérer les pays (${res.status})`);
  }
  return parseResponse<CountriesResponse>(res);
}

export type CollectResult =
  | { type: "ussd_push"; data: CollectResponse }
  | { type: "wave"; data: CollectResponse; waveUrl: string }
  | { type: "otp_sms"; txId?: string }
  | { type: "otp_ussd"; ussdCode: string; txId?: string };

export async function initiateCollect(
  body: CollectRequest
): Promise<CollectResult> {
  const res = await fetch(`${ASHTECH_BASE}/v1/collect`, {
    method: "POST",
    headers: ashtechHeaders(),
    body: JSON.stringify(body),
  });

  if (res.status === 202) {
    const data = await parseResponse<CollectResponse>(res);
    if (data.flow === "wave" && data.wave_url) {
      return { type: "wave", data, waveUrl: data.wave_url };
    }
    return { type: "ussd_push", data };
  }

  if (res.status === 400) {
    const data = await parseResponse<OtpRequiredResponse>(res);
    if (data.error === "otp_required") {
      if (data.ussd_code) {
        return { type: "otp_ussd", ussdCode: data.ussd_code };
      }
      return { type: "otp_sms" };
    }
    throw new Error(data.message || "Requête invalide");
  }

  const errData = await parseResponse<{ message?: string; error?: string }>(
    res
  ).catch(() => null);
  throw new Error(
    errData?.message || errData?.error || `Erreur serveur (${res.status})`
  );
}

export async function fetchTransaction(
  id: string
): Promise<TransactionResponse> {
  const res = await fetch(
    `${ASHTECH_BASE}/v1/transaction/${encodeURIComponent(id)}`,
    { headers: ashtechHeaders() }
  );
  if (!res.ok) {
    throw new Error(`Impossible de récupérer la transaction (${res.status})`);
  }
  return parseResponse<TransactionResponse>(res);
}
