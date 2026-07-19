import type {
  charging_packages,
  payments,
  qr_payment_transactions,
} from '@prisma/client';

export function mapPackage(row: charging_packages) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    durationSeconds: row.duration_seconds,
    priceMinor: row.price_minor.toString(),
    currency: row.currency,
    allowCoin: row.allow_coin,
    allowQr: row.allow_qr,
    displayOrder: row.display_order,
  };
}

export function mapPayment(
  payment: payments,
  qr?: qr_payment_transactions | null,
) {
  return {
    id: payment.id,
    paymentReference: payment.payment_reference,
    stationId: payment.station_id,
    deviceId: payment.device_id,
    chargingPackageId: payment.charging_package_id,
    paymentMethod: payment.payment_method,
    status: payment.status,
    expectedAmountMinor: payment.expected_amount_minor.toString(),
    receivedAmountMinor: payment.received_amount_minor.toString(),
    currency: payment.currency,
    packageName: payment.package_name_snapshot,
    packageDurationSeconds: payment.package_duration_seconds_snapshot,
    initiatedAt: payment.initiated_at,
    confirmedAt: payment.confirmed_at,
    failedAt: payment.failed_at,
    expiredAt: payment.expired_at,
    cancelledAt: payment.cancelled_at,
    refundedAt: payment.refunded_at,
    failureCode: payment.failure_code,
    failureReason: payment.failure_reason,
    ...(qr ? { qr: mapQrTransaction(qr) } : {}),
  };
}

export function mapQrTransaction(qr: qr_payment_transactions) {
  return {
    provider: qr.provider,
    merchantReference: qr.merchant_reference,
    providerTransactionId: qr.provider_transaction_id,
    qrReference: qr.qr_reference,
    providerStatus: qr.provider_status,
    amountMinor: qr.amount_minor.toString(),
    currency: qr.currency,
    expiresAt: qr.qr_expires_at,
  };
}
