import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useGetCountries,
  useInitiatePayment,
  useGetTransaction,
  getGetTransactionQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, ArrowRight, ShieldCheck } from "lucide-react";

const paymentSchema = z.object({
  customer_name: z.string().min(2, "Nom complet requis"),
  amount: z.coerce.number().min(100, "Le montant doit être d'au moins 100"),
  country_code: z.string().min(2, "Pays requis"),
  operator: z.string().min(1, "Opérateur requis"),
  phone: z.string().min(8, "Numéro de téléphone invalide"),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

type FlowState =
  | "form"
  | "review"
  | "pending"
  | "wave"
  | "otp-sms"
  | "otp-ussd"
  | "success"
  | "failed";

export default function PaymentPage() {
  const { data: countriesData, isLoading: isLoadingCountries } = useGetCountries();
  const initiatePayment = useInitiatePayment();

  const [flowState, setFlowState] = useState<FlowState>("form");
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<PaymentFormValues | null>(null);

  const [otpCode, setOtpCode] = useState("");
  const [ussdCode, setUssdCode] = useState<string | null>(null);
  const [waveUrl, setWaveUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      customer_name: "",
      amount: 0,
      country_code: "",
      operator: "",
      phone: "",
    },
  });

  const selectedCountryCode = form.watch("country_code");
  const selectedCountry = countriesData?.countries.find((c) => c.code === selectedCountryCode);

  useEffect(() => {
    form.setValue("operator", "");
  }, [selectedCountryCode, form]);

  const { data: transactionData } = useGetTransaction(transactionId || "", {
    query: {
      enabled: !!transactionId && (flowState === "pending" || flowState === "wave"),
      refetchInterval: 5000,
      queryKey: getGetTransactionQueryKey(transactionId || ""),
    },
  });

  useEffect(() => {
    if (transactionData) {
      if (transactionData.status === "success") {
        setFlowState("success");
      } else if (transactionData.status === "failed") {
        setErrorMessage("Le paiement a échoué ou a expiré. Veuillez réessayer.");
        setFlowState("failed");
      }
    }
  }, [transactionData]);

  const onSubmitForm = (data: PaymentFormValues) => {
    setReviewData(data);
    setFlowState("review");
  };

  const handleInitiatePayment = (otp?: string) => {
    if (!reviewData) return;
    setErrorMessage(null);

    initiatePayment.mutate(
      {
        data: {
          amount: reviewData.amount,
          currency: selectedCountry?.currency || "XOF",
          phone: reviewData.phone,
          operator: reviewData.operator,
          country_code: reviewData.country_code,
          customer_name: reviewData.customer_name,
          ...(otp && { otp }),
        },
      },
      {
        onSuccess: (res) => {
          setTransactionId(res.transaction_id);

          if (res.flow === "wave" && res.wave_url) {
            setWaveUrl(res.wave_url);
            setFlowState("wave");
          } else if (res.status === "success") {
            setFlowState("success");
          } else {
            setFlowState("pending");
          }
        },
        onError: (err: unknown) => {
          const apiErr = err as { status?: number; data?: { error?: string; message?: string; ussd_code?: string } | null };
          const errorData = apiErr?.data;
          const status = apiErr?.status;

          if (status === 400 && errorData?.error === "otp_required") {
            if (errorData.ussd_code) {
              setUssdCode(errorData.ussd_code);
              setFlowState("otp-ussd");
            } else {
              setFlowState("otp-sms");
            }
          } else {
            const rawMsg = errorData?.message || (err instanceof Error ? err.message : null);
            const isHtml = typeof rawMsg === "string" && rawMsg.trimStart().includes("DOCTYPE");
            const msg = isHtml || !rawMsg
              ? "Le serveur de paiement est temporairement inaccessible. Veuillez réessayer."
              : rawMsg;
            setErrorMessage(msg);
            setFlowState("failed");
          }
        },
      }
    );
  };

  const resetFlow = () => {
    setFlowState("form");
    setTransactionId(null);
    setOtpCode("");
    setUssdCode(null);
    setWaveUrl(null);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">AshtechPay</h1>
          <p className="text-slate-500 mt-1">Paiement sécurisé et rapide</p>
        </div>

        <Card className="border-0 shadow-xl shadow-slate-200/50">

          {flowState === "form" && (
            <>
              <CardHeader>
                <CardTitle>Détails du paiement</CardTitle>
                <CardDescription>Entrez vos informations pour procéder</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingCountries ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmitForm)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="customer_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nom complet</FormLabel>
                            <FormControl>
                              <Input placeholder="Jean Dupont" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Montant</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="1000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="country_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pays</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionnez un pays" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {countriesData?.countries.map((country) => (
                                  <SelectItem key={country.code} value={country.code}>
                                    {country.name} ({country.currency})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {selectedCountry && (
                        <FormField
                          control={form.control}
                          name="operator"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Opérateur</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Sélectionnez un opérateur" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {selectedCountry.operators.map((op) => (
                                    <SelectItem key={op} value={op}>
                                      {op}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Numéro de téléphone</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: 670000000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button type="submit" className="w-full mt-6">
                        Continuer
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            </>
          )}

          {flowState === "review" && reviewData && (
            <>
              <CardHeader>
                <CardTitle>Vérification</CardTitle>
                <CardDescription>Vérifiez les détails de votre paiement</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nom</span>
                    <span className="font-medium">{reviewData.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Montant</span>
                    <span className="font-medium text-lg text-primary">
                      {reviewData.amount} {selectedCountry?.currency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Téléphone</span>
                    <span className="font-medium">{reviewData.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Opérateur</span>
                    <span className="font-medium">{reviewData.operator}</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setFlowState("form")}
                    disabled={initiatePayment.isPending}
                  >
                    Modifier
                  </Button>
                  <Button
                    className="w-full"
                    onClick={() => handleInitiatePayment()}
                    disabled={initiatePayment.isPending}
                  >
                    {initiatePayment.isPending && (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    )}
                    Payer maintenant
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {flowState === "pending" && (
            <CardContent className="py-12 text-center flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                <div className="relative bg-white rounded-full p-4 shadow-sm">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mt-4">En attente de validation</h3>
              <p className="text-slate-500 text-sm">
                Validez le paiement sur votre téléphone. Cette page s'actualisera automatiquement.
              </p>
            </CardContent>
          )}

          {flowState === "wave" && waveUrl && (
            <CardContent className="py-10 text-center flex flex-col items-center space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl w-full">
                <h3 className="text-lg font-semibold mb-2">Paiement via Wave</h3>
                <p className="text-slate-500 text-sm mb-6">
                  Cliquez sur le bouton ci-dessous pour ouvrir l'application Wave et valider votre paiement.
                </p>
                <a href={waveUrl} target="_blank" rel="noopener noreferrer" className="block w-full">
                  <Button className="w-full h-14 text-lg bg-[#1c55ff] hover:bg-[#1c55ff]/90 text-white rounded-xl">
                    Payer avec Wave
                  </Button>
                </a>
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>En attente de confirmation...</span>
              </div>
            </CardContent>
          )}

          {(flowState === "otp-sms" || flowState === "otp-ussd") && (
            <CardContent className="py-8 space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Vérification requise</h3>
                {flowState === "otp-ussd" ? (
                  <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg mt-4">
                    <p className="text-sm text-slate-600 mb-2">Composez ce code sur votre téléphone :</p>
                    <p className="text-xl font-mono font-bold text-primary tracking-wider">{ussdCode}</p>
                    <p className="text-sm text-slate-600 mt-2">puis entrez le code reçu par SMS.</p>
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">
                    Un code OTP a été envoyé par SMS à votre numéro.
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Code OTP</label>
                  <Input
                    type="text"
                    placeholder="Entrez le code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="text-center text-lg tracking-widest h-12"
                  />
                </div>
                <Button
                  className="w-full h-12"
                  onClick={() => handleInitiatePayment(otpCode)}
                  disabled={!otpCode || initiatePayment.isPending}
                >
                  {initiatePayment.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  )}
                  Valider
                </Button>
              </div>
            </CardContent>
          )}

          {flowState === "success" && (
            <CardContent className="py-12 text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Paiement réussi !</h3>
                <p className="text-slate-500 mt-1">Merci pour votre confiance.</p>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 text-sm text-left space-y-3">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-slate-500">ID Transaction</span>
                  <span className="font-mono font-medium text-xs">
                    {transactionData?.transaction_id || transactionId}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-slate-500">Montant</span>
                  <span className="font-medium text-emerald-600">
                    {transactionData?.amount || reviewData?.amount}{" "}
                    {transactionData?.currency || selectedCountry?.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Statut</span>
                  <span className="font-medium text-emerald-600">Succès</span>
                </div>
              </div>

              <Button onClick={resetFlow} className="w-full" variant="outline">
                Nouveau paiement
              </Button>
            </CardContent>
          )}

          {flowState === "failed" && (
            <CardContent className="py-12 text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-2">
                <XCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Paiement échoué</h3>
                <p className="text-red-500 mt-2 text-sm leading-relaxed">{errorMessage || "Une erreur est survenue"}</p>
              </div>
              <Button onClick={resetFlow} className="w-full">
                Réessayer
              </Button>
            </CardContent>
          )}
        </Card>

        <div className="mt-8 text-center text-xs text-slate-400">
          <p>Paiement sécurisé par AshtechPay &copy; 2025</p>
        </div>
      </div>
    </div>
  );
}
