import { eq, like, or, desc, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { users, userRoles, roles, enrollments, orders, courses, products } from '@/db/schema';

export type StudentListRow = {
  id: string;
  email: string;
  fullName: string;
  status: 'active' | 'suspended';
  createdAt: Date;
  roleNames: string[];
};

const PAGE_SIZE = 25;

export async function listStudents(search: string, page: number): Promise<{ rows: StudentListRow[]; total: number }> {
  const whereClause = search ? or(like(users.email, `%${search}%`), like(users.fullName, `%${search}%`)) : undefined;

  const rows = await db
    .select({ id: users.id, email: users.email, fullName: users.fullName, status: users.status, createdAt: users.createdAt })
    .from(users)
    .where(whereClause)
    .orderBy(desc(users.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const allMatching = await db.select({ id: users.id }).from(users).where(whereClause);

  const userIds = rows.map((r) => r.id);
  const roleRows =
    userIds.length > 0
      ? await db
          .select({ userId: userRoles.userId, name: roles.name })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(inArray(userRoles.userId, userIds))
      : [];

  const rolesByUser = new Map<string, string[]>();
  for (const r of roleRows) {
    const list = rolesByUser.get(r.userId) ?? [];
    list.push(r.name);
    rolesByUser.set(r.userId, list);
  }

  return {
    rows: rows.map((r) => ({ ...r, roleNames: rolesByUser.get(r.id) ?? [] })),
    total: allMatching.length,
  };
}

export async function getStudentDetail(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return null;

  const roleRows = await db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  const enrollmentRows = await db
    .select({
      id: enrollments.id,
      status: enrollments.status,
      source: enrollments.source,
      enrolledAt: enrollments.enrolledAt,
      courseTitle: courses.title,
      productName: products.name,
    })
    .from(enrollments)
    .leftJoin(courses, eq(enrollments.courseId, courses.id))
    .leftJoin(products, eq(enrollments.productId, products.id))
    .where(eq(enrollments.userId, userId))
    .orderBy(desc(enrollments.enrolledAt));

  const orderRows = await db
    .select({ id: orders.id, orderNumber: orders.orderNumber, amount: orders.amount, currencyCode: orders.currencyCode, status: orders.status, createdAt: orders.createdAt })
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));

  return {
    user,
    roleNames: roleRows.map((r) => r.name),
    enrollments: enrollmentRows,
    orders: orderRows,
  };
}

export async function listEnrollableProducts() {
  return db.select({ id: products.id, name: products.name, type: products.type }).from(products).where(eq(products.status, 'active'));
}

export async function listPublishedCourses() {
  return db.select({ id: courses.id, title: courses.title }).from(courses).where(eq(courses.status, 'published'));
}
