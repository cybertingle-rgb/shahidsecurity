import { NextRequest, NextResponse } from 'next/server';
import mysql, { RowDataPacket } from 'mysql2/promise';

/**
 * Temporary, read-only, secret-gated production inspection endpoint — the
 * same reach-the-DB-over-HTTP pattern as /api/internal/migrate, because
 * this host gives no shell/interactive DB access. Every query here is a
 * SELECT; nothing is ever written. Delete this route in the very next
 * commit after it's been used once, same lifecycle discipline the
 * migrate route documents for itself — a standing read endpoint over
 * production data is a permanent surface even when secret-gated.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.MIGRATE_SECRET;
  const provided = request.headers.get('x-migrate-secret');
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const connectionString = process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    return NextResponse.json({ error: 'DATABASE_ADMIN_URL or DATABASE_URL is not set' }, { status: 500 });
  }

  const connection = await mysql.createConnection({ uri: connectionString });
  try {
    const [[counts]] = await connection.query<RowDataPacket[]>(`
      SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM courses) AS courses,
        (SELECT COUNT(*) FROM products) AS products,
        (SELECT COUNT(*) FROM orders) AS orders,
        (SELECT COUNT(*) FROM payments) AS payments,
        (SELECT COUNT(*) FROM enrollments) AS enrollments
    `);

    const [courseProducts] = await connection.query<RowDataPacket[]>(`SELECT id, name, status FROM products WHERE type = 'course'`);

    const [courseTypeEnrollmentsMissingCourseId] = await connection.query<RowDataPacket[]>(`
      SELECT e.id AS enrollment_id, e.user_id, e.product_id, e.enrolled_at
      FROM enrollments e
      JOIN products p ON p.id = e.product_id
      WHERE p.type = 'course' AND e.course_id IS NULL
    `);

    const [orphanOrders] = await connection.query<RowDataPacket[]>(`
      SELECT o.id, o.order_number, o.product_id FROM orders o
      LEFT JOIN products p ON p.id = o.product_id
      WHERE p.id IS NULL
    `);

    return NextResponse.json({
      counts,
      courseTypeProducts: courseProducts,
      // Confirmed real-world instances of the "paid but no access" bug,
      // if any exist — this is the number that determines how urgent
      // Phase 1's fix is and whether any student needs a manual grant
      // in the meantime.
      coursePurchasesMissingAccess: courseTypeEnrollmentsMissingCourseId,
      orphanOrders,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  } finally {
    await connection.end();
  }
}
