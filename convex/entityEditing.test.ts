/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");
async function setup(role: "admin" | "adult" | "viewer" = "adult") {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      name: "Alex",
      email: "alex@example.test",
    });
    const householdId = await ctx.db.insert("households", {
      name: "Home",
      createdByUserId: userId,
      inviteCode: "TEST123",
      createdAt: 1,
      updatedAt: 1,
    });
    await ctx.db.insert("householdMembers", {
      householdId,
      userId,
      role,
      createdAt: 1,
      updatedAt: 1,
    });
    return { userId, householdId };
  });
  return {
    t,
    actor: t.withIdentity({ subject: `${ids.userId}|session` }),
    ...ids,
  };
}

test("bill editor atomically updates status and payment date, preserves it on unrelated edits, and clears it on reopening", async () => {
  const { actor, householdId } = await setup();
  const billId = await actor.mutation(api.bills.create, {
    householdId,
    title: "Electricity",
    status: "paid",
    paidAt: 1000,
    dueAt: 9000,
  });
  expect(
    (await actor.query(api.bills.get, { householdId, billId })).paidAt,
  ).toBe(1000);
  await actor.mutation(api.bills.update, {
    householdId,
    billId,
    title: "Power",
    status: "paid",
    paidAt: 2000,
  });
  await actor.mutation(api.bills.update, {
    householdId,
    billId,
    provider: "Provider",
  });
  expect(
    (await actor.query(api.bills.get, { householdId, billId })).paidAt,
  ).toBe(2000);
  await actor.mutation(api.bills.update, {
    householdId,
    billId,
    status: "upcoming",
  });
  expect(
    (await actor.query(api.bills.get, { householdId, billId })).paidAt,
  ).toBeUndefined();
  await actor.mutation(api.bills.markPaid, { householdId, billId });
  expect(
    (await actor.query(api.bills.get, { householdId, billId })).paidAt,
  ).toBeTypeOf("number");
});

test("paid history orders by payment date despite conflicting due dates and leaves unknown dates last", async () => {
  const { actor, t, householdId } = await setup();
  const older = await actor.mutation(api.bills.create, {
    householdId,
    title: "Older payment",
    status: "paid",
    paidAt: 100,
    dueAt: 1000,
  });
  const recent = await actor.mutation(api.bills.create, {
    householdId,
    title: "Recent payment",
    status: "paid",
    paidAt: 200,
    dueAt: 5000,
  });
  const unknown = await actor.mutation(api.bills.create, {
    householdId,
    title: "Legacy",
    status: "paid",
  });
  await t.run((ctx) => ctx.db.patch(unknown, { paidAt: undefined }));
  expect(
    (await actor.query(api.bills.list, { householdId, view: "paid" })).map(
      (bill) => bill._id,
    ),
  ).toEqual([recent, older, unknown]);
});

test("expense edits clear optional text and payer and update the spending date", async () => {
  const { actor, householdId, userId } = await setup();
  const expenseId = await actor.mutation(api.expenses.create, {
    householdId,
    title: "Groceries",
    amount: 20,
    spentAt: 100,
    category: "Groceries",
    merchant: "Shop",
    notes: "Note",
    paidByUserId: userId,
  });
  await actor.mutation(api.expenses.update, {
    householdId,
    expenseId,
    merchant: "",
    notes: "",
    paidByUserId: null,
    spentAt: 200,
  });
  const [expense] = await actor.query(api.expenses.list, {
    householdId,
    view: "all",
  });
  expect(expense).toMatchObject({ spentAt: 200 });
  expect(expense.merchant).toBeUndefined();
  expect(expense.notes).toBeUndefined();
  expect(expense.paidByUserId).toBeUndefined();
});

test("task editor updates recurrence without losing its end date and records completion atomically", async () => {
  const { actor, householdId } = await setup();
  const taskId = await actor.mutation(api.tasks.create, {
    householdId,
    title: "Clean",
    dueAt: 100,
    recurrence: {
      frequency: "weekly",
      interval: 1,
      startsAt: 100,
      endsAt: 5000,
    },
  });
  await actor.mutation(api.tasks.update, {
    householdId,
    taskId,
    status: "done",
    recurrence: {
      frequency: "weekly",
      interval: 2,
      startsAt: 100,
      endsAt: 5000,
    },
  });
  const details = await actor.query(api.tasks.getDetails, {
    householdId,
    taskId,
  });
  expect(details.task.status).toBe("done");
  expect(details.task.completedAt).toBeTypeOf("number");
  expect(details.recurrence).toMatchObject({ interval: 2, endsAt: 5000 });
});

test("viewers cannot edit bills or expenses", async () => {
  const { actor, t, householdId, userId } = await setup("viewer");
  const billId = await t.run((ctx) =>
    ctx.db.insert("bills", {
      householdId,
      createdByUserId: userId,
      title: "Bill",
      status: "upcoming",
      priority: "medium",
      currency: "EUR",
      autopay: false,
      createdAt: 1,
      updatedAt: 1,
    }),
  );
  await expect(
    actor.mutation(api.bills.update, { householdId, billId, title: "Changed" }),
  ).rejects.toThrow();
});

test("document filters and issued-date sorting apply before the result limit", async () => {
  const { actor, householdId } = await setup();
  await actor.mutation(api.documents.create, {
    householdId,
    title: "Recent issued",
    documentType: "receipt",
    issuedAt: 200,
  });
  await actor.mutation(api.documents.create, {
    householdId,
    title: "Old issued",
    documentType: "receipt",
    issuedAt: 100,
  });
  await actor.mutation(api.documents.create, {
    householdId,
    title: "Unrelated",
    documentType: "policy",
  });
  expect(
    (
      await actor.query(api.documents.list, {
        householdId,
        sort: "issued",
        documentType: "receipt",
        query: "issued",
        limit: 1,
      })
    ).map((row) => row.document.title),
  ).toEqual(["Recent issued"]);
});

test("event, shopping item, and reminder editors persist changes and clear optional values", async () => {
  const { actor, householdId, userId } = await setup();
  const eventId = await actor.mutation(api.events.create, {
    householdId,
    title: "Dinner",
    startsAt: 1000,
    endsAt: 2000,
    location: "Home",
    note: "Bring dessert",
  });
  await actor.mutation(api.events.update, {
    householdId,
    eventId,
    title: "Lunch",
    startsAt: 500,
    endsAt: null,
    location: "",
    note: "",
    ownerUserId: null,
  });
  expect(
    await actor.query(api.events.get, { householdId, eventId }),
  ).toMatchObject({ title: "Lunch", startsAt: 500 });
  const event = await actor.query(api.events.get, { householdId, eventId });
  expect(event.endsAt).toBeUndefined();
  expect(event.location).toBeUndefined();
  const listId = await actor.mutation(api.shopping.createList, {
    householdId,
    name: "Weekly",
  });
  await actor.mutation(api.shopping.updateList, {
    householdId,
    listId,
    name: "Weekend",
  });
  const itemId = await actor.mutation(api.shopping.addItem, {
    householdId,
    listId,
    name: "Apples",
    quantity: "6",
    note: "Red",
  });
  await actor.mutation(api.shopping.updateItem, {
    householdId,
    listId,
    itemId,
    name: "Pears",
    quantity: "",
    note: "",
  });
  const list = await actor.query(api.shopping.getList, { householdId, listId });
  expect(list.list.name).toBe("Weekend");
  expect(list.items[0].name).toBe("Pears");
  expect(list.items[0].quantity).toBeUndefined();
  const reminderId = await actor.mutation(api.reminders.create, {
    householdId,
    title: "Call",
    remindAt: 1000,
    targetUserId: userId,
    note: "School",
  });
  await actor.mutation(api.reminders.update, {
    householdId,
    reminderId,
    title: "Email",
    remindAt: 2000,
    targetUserId: null,
    note: "",
  });
  const [reminder] = await actor.query(api.reminders.listManual, {
    householdId,
  });
  expect(reminder).toMatchObject({ title: "Email", remindAt: 2000 });
  expect(reminder.targetUserId).toBeUndefined();
  expect(reminder.note).toBeUndefined();
});

test("document metadata clears optional dates and values", async () => {
  const { actor, householdId } = await setup();
  const documentId = await actor.mutation(api.documents.create, {
    householdId,
    title: "Policy",
    documentType: "policy",
    issuedAt: 100,
    expiresAt: 200,
    vendor: "Vendor",
    amount: 20,
  });
  await actor.mutation(api.documents.update, {
    householdId,
    documentId,
    issuedAt: null,
    expiresAt: null,
    vendor: null,
    amount: null,
  });
  const [row] = await actor.query(api.documents.list, { householdId });
  expect(row.document.issuedAt).toBeUndefined();
  expect(row.document.expiresAt).toBeUndefined();
  expect(row.document.amount).toBeUndefined();
});

test("reminder search and sorting work beyond the previous source limit", async () => {
  const { t, actor, householdId, userId } = await setup();
  const now = Date.now();
  await t.run(async (ctx) => {
    for (let i = 0; i < 105; i++)
      await ctx.db.insert("reminders", {
        householdId,
        createdByUserId: userId,
        entityType: "manual",
        title: i === 104 ? "Find this reminder" : `Reminder ${i}`,
        remindAt: now + i * 1000,
        status: "scheduled",
        channel: "in_app",
        createdAt: now,
        updatedAt: now,
      });
  });
  const results = await actor.query(api.inbox.list, {
    householdId,
    view: "reminders",
    limit: 1,
    controls: {
      search: "Find this",
      sort: "date-desc",
      filters: {},
      from: "",
      to: "",
    },
  });
  expect(results.map((item) => item.title)).toEqual(["Find this reminder"]);
});

test("workspace currency is admin-managed and defaults new operations without rewriting existing records", async () => {
  const { actor, t, householdId } = await setup("admin");
  const originalId = await actor.mutation(api.expenses.create, {
    householdId,
    title: "Old expense",
    amount: 10,
    spentAt: 1000,
    category: "Groceries",
  });
  expect(
    (
      await actor.query(api.expenses.get, {
        householdId,
        expenseId: originalId,
      })
    ).currency,
  ).toBe("EUR");
  await actor.mutation(api.households.updateCurrency, {
    householdId,
    currency: " usd ",
  });
  const expenseId = await actor.mutation(api.expenses.create, {
    householdId,
    title: "New expense",
    amount: 20,
    spentAt: 2000,
    category: "Groceries",
  });
  const billId = await actor.mutation(api.bills.create, {
    householdId,
    title: "New bill",
  });
  const documentId = await actor.mutation(api.documents.create, {
    householdId,
    title: "Receipt",
    documentType: "receipt",
  });
  await t.run(async (ctx) => {
    expect((await ctx.db.get(householdId))?.currency).toBe("USD");
    expect((await ctx.db.get(expenseId))?.currency).toBe("USD");
    expect((await ctx.db.get(billId))?.currency).toBe("USD");
    expect((await ctx.db.get(documentId))?.currency).toBe("USD");
  });
  await actor.mutation(api.expenses.update, {
    householdId,
    expenseId: originalId,
    title: "Edited old expense",
  });
  expect(
    (
      await actor.query(api.expenses.get, {
        householdId,
        expenseId: originalId,
      })
    ).currency,
  ).toBe("EUR");
  await expect(
    actor.mutation(api.households.updateCurrency, {
      householdId,
      currency: "INVALID",
    }),
  ).rejects.toThrow("supported currency");
  const adult = await setup();
  await expect(
    adult.actor.mutation(api.households.updateCurrency, {
      householdId: adult.householdId,
      currency: "USD",
    }),
  ).rejects.toThrow();
});
