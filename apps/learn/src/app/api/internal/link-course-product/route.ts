import { NextRequest, NextResponse } from 'next/server';
import mysql, { RowDataPacket } from 'mysql2/promise';

/**
 * Temporary, secret-gated, one-purpose endpoint: links one pre-existing
 * course-type product (created the old disconnected way, before
 * products.courseId existed) to its real course row. Takes explicit
 * {productId, courseId} — never guesses by matching names, per the
 * migration-safety requirement that every pre-existing course/product
 * pairing is a reviewed, named decision, not an automatic heuristic.
 * Refuses to overwrite an existing link or to double-assign a course.
 * Delete this route once it's been used.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.MIGRATE_SECRET;
  const provided = request.headers.get('x-migrate-secret');
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { productId, courseId } = await request.json().catch(() => ({ productId: null, courseId: null }));
  if (!productId || !courseId) {
    return NextResponse.json({ error: 'Both productId and courseId are required.' }, { status: 400 });
  }

  const connectionString = process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    return NextResponse.json({ error: 'DATABASE_ADMIN_URL or DATABASE_URL is not set' }, { status: 500 });
  }

  const connection = await mysql.createConnection({ uri: connectionString });
  try {
    const [[product]] = await connection.query<RowDataPacket[]>(`SELECT id, type, course_id FROM products WHERE id = ?`, [productId]);
    if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    if (product.type !== 'course') return NextResponse.json({ error: 'Product is not a course-type product.' }, { status: 400 });
    if (product.course_id) return NextResponse.json({ error: 'Product already has a linked course.' }, { status: 400 });

    const [[course]] = await connection.query<RowDataPacket[]>(`SELECT id, title FROM courses WHERE id = ?`, [courseId]);
    if (!course) return NextResponse.json({ error: 'Course not found.' }, { status: 404 });

    const [[existingLink]] = await connection.query<RowDataPacket[]>(`SELECT id FROM products WHERE course_id = ?`, [courseId]);
    if (existingLink) return NextResponse.json({ error: 'That course is already linked to a different product.' }, { status: 400 });

    await connection.query(`UPDATE products SET course_id = ? WHERE id = ?`, [courseId, productId]);

    return NextResponse.json({ success: true, message: `Linked product "${productId}" to course "${course.title}".` });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  } finally {
    await connection.end();
  }
}
