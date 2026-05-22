import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { CollectRequest, CollectResponse, CountriesResponse, ErrorResponse, FeesResponse, HandleWebhook200, HealthStatus, OtpRequiredResponse, TransactionResponse, WebhookEvent } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getHealthCheckUrl: () => string;
/**
 * Returns server health status
 * @summary Health check
 */
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetCountriesUrl: () => string;
/**
 * Returns the list of active countries and their Mobile Money operators
 * @summary Get available countries and operators
 */
export declare const getCountries: (options?: RequestInit) => Promise<CountriesResponse>;
export declare const getGetCountriesQueryKey: () => readonly ["/api/countries"];
export declare const getGetCountriesQueryOptions: <TData = Awaited<ReturnType<typeof getCountries>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCountries>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCountries>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetCountriesQueryResult = NonNullable<Awaited<ReturnType<typeof getCountries>>>;
export type GetCountriesQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get available countries and operators
 */
export declare function useGetCountries<TData = Awaited<ReturnType<typeof getCountries>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCountries>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetFeesUrl: () => string;
/**
 * Returns the platform fee rates in real time. Use credited_amount from /collect for the exact net amount per transaction.
 * @summary Get current fee rates
 */
export declare const getFees: (options?: RequestInit) => Promise<FeesResponse>;
export declare const getGetFeesQueryKey: () => readonly ["/api/fees"];
export declare const getGetFeesQueryOptions: <TData = Awaited<ReturnType<typeof getFees>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFees>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getFees>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetFeesQueryResult = NonNullable<Awaited<ReturnType<typeof getFees>>>;
export type GetFeesQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get current fee rates
 */
export declare function useGetFees<TData = Awaited<ReturnType<typeof getFees>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFees>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getInitiatePaymentUrl: () => string;
/**
 * Initiates a payment and returns the transaction status.
The platform fees are deducted automatically — credited_amount is the net amount credited.

Flow detection:
- 202 + flow="wave": Wave payment — display wave_url as button/QR code
- 202 (no wave): USSD Push — wait for webhook, client validates on phone
- 400 + error="otp_required" + ussd_code: OTP USSD (Orange BF) — client dials USSD code then sends OTP
- 400 + error="otp_required" + ussd_code=null: OTP SMS — client receives SMS OTP, re-submit with otp field

 * @summary Initiate a Mobile Money payment
 */
export declare const initiatePayment: (collectRequest: CollectRequest, options?: RequestInit) => Promise<CollectResponse>;
export declare const getInitiatePaymentMutationOptions: <TError = ErrorType<OtpRequiredResponse | ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof initiatePayment>>, TError, {
        data: BodyType<CollectRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof initiatePayment>>, TError, {
    data: BodyType<CollectRequest>;
}, TContext>;
export type InitiatePaymentMutationResult = NonNullable<Awaited<ReturnType<typeof initiatePayment>>>;
export type InitiatePaymentMutationBody = BodyType<CollectRequest>;
export type InitiatePaymentMutationError = ErrorType<OtpRequiredResponse | ErrorResponse>;
/**
* @summary Initiate a Mobile Money payment
*/
export declare const useInitiatePayment: <TError = ErrorType<OtpRequiredResponse | ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof initiatePayment>>, TError, {
        data: BodyType<CollectRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof initiatePayment>>, TError, {
    data: BodyType<CollectRequest>;
}, TContext>;
export declare const getGetTransactionUrl: (id: string) => string;
/**
 * Returns the current status of a transaction by its transaction_id
 * @summary Get transaction status
 */
export declare const getTransaction: (id: string, options?: RequestInit) => Promise<TransactionResponse>;
export declare const getGetTransactionQueryKey: (id: string) => readonly [`/api/transaction/${string}`];
export declare const getGetTransactionQueryOptions: <TData = Awaited<ReturnType<typeof getTransaction>>, TError = ErrorType<ErrorResponse>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTransaction>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getTransaction>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetTransactionQueryResult = NonNullable<Awaited<ReturnType<typeof getTransaction>>>;
export type GetTransactionQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get transaction status
 */
export declare function useGetTransaction<TData = Awaited<ReturnType<typeof getTransaction>>, TError = ErrorType<ErrorResponse>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTransaction>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getHandleWebhookUrl: () => string;
/**
 * Called by Ashtech Pay when a transaction reaches a final state.
Always respond HTTP 200 immediately, then process business logic.
The amount field is the net amount (after fees). total_amount is the gross collected amount.

 * @summary Receive payment webhook events
 */
export declare const handleWebhook: (webhookEvent: WebhookEvent, options?: RequestInit) => Promise<HandleWebhook200>;
export declare const getHandleWebhookMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof handleWebhook>>, TError, {
        data: BodyType<WebhookEvent>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof handleWebhook>>, TError, {
    data: BodyType<WebhookEvent>;
}, TContext>;
export type HandleWebhookMutationResult = NonNullable<Awaited<ReturnType<typeof handleWebhook>>>;
export type HandleWebhookMutationBody = BodyType<WebhookEvent>;
export type HandleWebhookMutationError = ErrorType<unknown>;
/**
* @summary Receive payment webhook events
*/
export declare const useHandleWebhook: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof handleWebhook>>, TError, {
        data: BodyType<WebhookEvent>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof handleWebhook>>, TError, {
    data: BodyType<WebhookEvent>;
}, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map