import { eq, desc } from 'drizzle-orm';
import { learnDb as db, learnSchema } from '@/db/learnDb';
const { payments, manualPaymentSubmissions, orders, users, products, paymentMethods } = learnSchema;

export async function listPendingManualPayments() {
  return db
    .select({
      paymentId: payments.id,
      submissionId: manualPaymentSubmissions.id,
      orderId: orders.id,
      orderNumber: orders.orderNumber,
      amount: payments.amount,
      currencyCode: payments.currencyCode,
      paymentMethodName: paymentMethods.name,
      transactionReference: manualPaymentSubmissions.transactionReference,
      amountClaimed: manualPaymentSubmissions.amountClaimed,
      paymentDate: manualPaymentSubmissions.paymentDate,
      receiptFileUrl: manualPaymentSubmissions.receiptFileUrl,
      submissionStatus: manualPaymentSubmissions.status,
      studentName: users.fullName,
      studentEmail: users.email,
      productName: products.name,
    })
    .from(manualPaymentSubmissions)
    .innerJoin(payments, eq(manualPaymentSubmissions.paymentId, payments.id))
    .innerJoin(orders, eq(payments.orderId, orders.id))
    .innerJoin(users, eq(orders.userId, users.id))
    .innerJoin(products, eq(orders.productId, products.id))
    .leftJoin(paymentMethods, eq(payments.paymentMethodId, paymentMethods.id))
    .where(eq(manualPaymentSubmissions.status, 'pending'))
    .orderBy(desc(manualPaymentSubmissions.paymentDate));
}
