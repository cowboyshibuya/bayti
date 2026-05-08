import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { requireCurrentUser, requireHouseholdMember } from "./lib/permissions";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function getMonthBounds(year: number, month: number) {
  const start = new Date(year, month, 1).getTime();
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
  return { start, end };
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function percentChange(current: number, previous: number) {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }

  return ((current - previous) / previous) * 100;
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleString(undefined, {
    month: "short",
  });
}

function isSubscriptionBill(bill: Doc<"bills">) {
  return bill.status !== "cancelled" && (bill.autopay || bill.recurrenceRuleId !== undefined);
}

function buildSubscriptionItems(bills: Doc<"bills">[]) {
  return bills
    .filter(isSubscriptionBill)
    .sort((left, right) => {
      const leftDue = left.dueAt ?? Number.MAX_SAFE_INTEGER;
      const rightDue = right.dueAt ?? Number.MAX_SAFE_INTEGER;

      if (leftDue !== rightDue) {
        return leftDue - rightDue;
      }

      return right.updatedAt - left.updatedAt;
    })
    .map((bill) => ({
      billId: bill._id,
      title: bill.title,
      provider: bill.provider,
      amount: bill.amountExpected ?? 0,
      currency: bill.currency,
      dueAt: bill.dueAt ?? null,
      status: bill.status,
      autopay: bill.autopay,
      recurring: bill.recurrenceRuleId !== undefined,
    }));
}

function buildSubscriptionSummary(bills: Doc<"bills">[], nowTime: number) {
  const items = buildSubscriptionItems(bills);
  const dueSoonLimit = nowTime + 7 * MS_PER_DAY;

  return {
    total: items.reduce((total, subscription) => total + subscription.amount, 0),
    count: items.length,
    autopayCount: items.filter((subscription) => subscription.autopay).length,
    dueSoonCount: items.filter(
      (subscription) =>
        subscription.status !== "paid" &&
        subscription.dueAt !== null &&
        subscription.dueAt >= nowTime &&
        subscription.dueAt <= dueSoonLimit,
    ).length,
    overdueCount: items.filter(
      (subscription) =>
        subscription.status !== "paid" &&
        subscription.dueAt !== null &&
        subscription.dueAt < nowTime,
    ).length,
    items,
  };
}

export const getDashboardFinancials = query({
  args: {
    householdId: v.id("households"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdMember(ctx, args.householdId, user._id);

    const now = new Date();
    const nowTime = now.getTime();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentBounds = getMonthBounds(currentYear, currentMonth);
    const previousBounds = getMonthBounds(currentYear, currentMonth - 1);
    const seriesStart = getMonthBounds(currentYear, currentMonth - 5).start;

    const [expenses, bills] = await Promise.all([
      ctx.db
        .query("expenses")
        .withIndex("by_household_spent_at", (q) =>
          q.eq("householdId", args.householdId).gte("spentAt", seriesStart),
        )
        .take(300),
      ctx.db
        .query("bills")
        .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
        .take(300),
    ]);

    const activeBills = bills.filter((bill) => bill.status !== "cancelled");
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(currentYear, currentMonth - 5 + index, 1);
      const year = date.getFullYear();
      const month = date.getMonth();
      const bounds = getMonthBounds(year, month);
      const monthExpenses = expenses.filter(
        (expense) =>
          expense.spentAt >= bounds.start && expense.spentAt <= bounds.end,
      );
      const monthBills = activeBills.filter(
        (bill) =>
          bill.dueAt !== undefined &&
          bill.dueAt >= bounds.start &&
          bill.dueAt <= bounds.end,
      );
      const expensesTotal = monthExpenses.reduce(
        (total, expense) => total + expense.amount,
        0,
      );
      const billsPaid = monthBills
        .filter((bill) => bill.status === "paid")
        .reduce((total, bill) => total + (bill.amountExpected ?? 0), 0);
      const billsExpected = monthBills
        .filter((bill) => bill.status !== "paid")
        .reduce((total, bill) => total + (bill.amountExpected ?? 0), 0);

      return {
        key: monthKey(year, month),
        label: monthLabel(year, month),
        month,
        year,
        expenses: expensesTotal,
        billsPaid,
        billsExpected,
        total: expensesTotal + billsPaid + billsExpected,
      };
    });

    const currentMonthExpenses = expenses.filter(
      (expense) =>
        expense.spentAt >= currentBounds.start &&
        expense.spentAt <= currentBounds.end,
    );
    const previousMonthExpenses = expenses.filter(
      (expense) =>
        expense.spentAt >= previousBounds.start &&
        expense.spentAt <= previousBounds.end,
    );
    const currentMonthBills = activeBills.filter(
      (bill) =>
        bill.dueAt !== undefined &&
        bill.dueAt >= currentBounds.start &&
        bill.dueAt <= currentBounds.end,
    );
    const currentPaidBills = currentMonthBills.filter(
      (bill) => bill.status === "paid",
    );
    const currentPendingBills = currentMonthBills.filter(
      (bill) => bill.status !== "paid",
    );
    const overdueBills = currentPendingBills.filter(
      (bill) => bill.dueAt !== undefined && bill.dueAt < nowTime,
    );
    const dueSoonBills = currentPendingBills.filter(
      (bill) =>
        bill.dueAt !== undefined &&
        bill.dueAt >= nowTime &&
        bill.dueAt <= nowTime + 7 * MS_PER_DAY,
    );

    const categoryTotals = new Map<string, number>();
    for (const expense of currentMonthExpenses) {
      categoryTotals.set(
        expense.category,
        (categoryTotals.get(expense.category) ?? 0) + expense.amount,
      );
    }
    const currentExpensesTotal = currentMonthExpenses.reduce(
      (total, expense) => total + expense.amount,
      0,
    );
    const previousExpensesTotal = previousMonthExpenses.reduce(
      (total, expense) => total + expense.amount,
      0,
    );
    const categoryBreakdown = Array.from(categoryTotals.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6)
      .map(([category, amount]) => ({
        category,
        amount,
        percent:
          currentExpensesTotal > 0
            ? Math.round((amount / currentExpensesTotal) * 100)
            : 0,
      }));

    const currentBillsTotal = currentMonthBills.reduce(
      (total, bill) => total + (bill.amountExpected ?? 0),
      0,
    );
    const paidBillsTotal = currentPaidBills.reduce(
      (total, bill) => total + (bill.amountExpected ?? 0),
      0,
    );
    const pendingBillsTotal = currentPendingBills.reduce(
      (total, bill) => total + (bill.amountExpected ?? 0),
      0,
    );
    const trailingExpenseMonths = months.slice(2, 5);
    const trailingAverageExpenses =
      trailingExpenseMonths.reduce((total, month) => total + month.expenses, 0) /
      Math.max(trailingExpenseMonths.length, 1);
    const plannedOutflow = currentBillsTotal + trailingAverageExpenses;
    const actualOutflow = paidBillsTotal + currentExpensesTotal;
    const budgetUsedPercent =
      plannedOutflow > 0 ? clampPercent((actualOutflow / plannedOutflow) * 100) : 0;
    const budgetRemaining = Math.max(plannedOutflow - actualOutflow, 0);

    const subscriptionSummary = buildSubscriptionSummary(activeBills, nowTime);

    const underPlanProgress =
      plannedOutflow > 0
        ? clampPercent(((plannedOutflow - actualOutflow) / plannedOutflow) * 100)
        : 100;
    const billsPaidProgress =
      currentMonthBills.length > 0
        ? clampPercent((currentPaidBills.length / currentMonthBills.length) * 100)
        : 100;
    const expenseLoggingTarget = Math.max(
      currentMonthExpenses.length,
      previousMonthExpenses.length,
      1,
    );
    const expenseLoggingProgress = clampPercent(
      (currentMonthExpenses.length / expenseLoggingTarget) * 100,
    );

    const goals = [
      {
        key: "under-plan",
        title: "Stay under plan",
        current: Math.max(plannedOutflow - actualOutflow, 0),
        target: Math.max(plannedOutflow, 1),
        progress: underPlanProgress,
        label:
          plannedOutflow > 0
            ? `${underPlanProgress}% buffer remaining`
            : "No planned outflow yet",
      },
      {
        key: "scheduled-bills",
        title: "Pay scheduled bills",
        current: currentPaidBills.length,
        target: Math.max(currentMonthBills.length, 1),
        progress: billsPaidProgress,
        label: `${currentPaidBills.length}/${currentMonthBills.length} paid`,
      },
      {
        key: "expense-coverage",
        title: "Track expenses",
        current: currentMonthExpenses.length,
        target: expenseLoggingTarget,
        progress: expenseLoggingProgress,
        label: `${currentMonthExpenses.length} logged this month`,
      },
    ];

    const topCategory = categoryBreakdown[0] ?? null;
    const expenseTrend = percentChange(currentExpensesTotal, previousExpensesTotal);
    const insights: {
      key: string;
      title: string;
      message: string;
      severity: "positive" | "warning" | "neutral";
      href: string;
    }[] = [];

    if (plannedOutflow > 0 && actualOutflow > plannedOutflow) {
      insights.push({
        key: "over-plan",
        title: "Budget pressure",
        message: "Actual outflow is above the derived monthly plan.",
        severity: "warning",
        href: "/accounting",
      });
    } else {
      insights.push({
        key: "on-plan",
        title: "Budget position",
        message:
          plannedOutflow > 0
            ? "Actual outflow is still within the derived monthly plan."
            : "Add bills or expenses to build a monthly plan.",
        severity: plannedOutflow > 0 ? "positive" : "neutral",
        href: "/accounting",
      });
    }

    if (overdueBills.length > 0) {
      insights.push({
        key: "overdue-bills",
        title: "Overdue bills",
        message: `${overdueBills.length} bill${overdueBills.length === 1 ? "" : "s"} need attention.`,
        severity: "warning",
        href: "/bills",
      });
    } else if (dueSoonBills.length > 0) {
      insights.push({
        key: "due-soon",
        title: "Bills due soon",
        message: `${dueSoonBills.length} bill${dueSoonBills.length === 1 ? "" : "s"} due in the next 7 days.`,
        severity: "neutral",
        href: "/bills",
      });
    }

    if (topCategory && topCategory.percent >= 45) {
      insights.push({
        key: "category-concentration",
        title: "Category concentration",
        message: `${topCategory.category} is ${topCategory.percent}% of expenses this month.`,
        severity: "neutral",
        href: "/accounting",
      });
    }

    if (Math.abs(expenseTrend) >= 15) {
      insights.push({
        key: "expense-trend",
        title: expenseTrend > 0 ? "Spending increased" : "Spending decreased",
        message: `Expenses are ${Math.abs(Math.round(expenseTrend))}% ${expenseTrend > 0 ? "higher" : "lower"} than last month.`,
        severity: expenseTrend > 0 ? "warning" : "positive",
        href: "/accounting",
      });
    }

    insights.push({
      key: "subscriptions",
      title:
        subscriptionSummary.count > 0
          ? "Subscriptions tracked"
          : "No subscriptions detected",
      message:
        subscriptionSummary.count > 0
          ? `${subscriptionSummary.count} recurring or autopay bill${subscriptionSummary.count === 1 ? "" : "s"} tracked this cycle.`
          : "Mark recurring or autopay bills to track subscription spend.",
      severity: subscriptionSummary.count > 0 ? "neutral" : "warning",
      href: "/bills",
    });

    return {
      monthLabel: new Date(currentYear, currentMonth, 1).toLocaleString(
        undefined,
        { month: "long", year: "numeric" },
      ),
      monthlySeries: months,
      categoryBreakdown,
      budget: {
        plannedOutflow,
        actualOutflow,
        paidBills: paidBillsTotal,
        pendingBills: pendingBillsTotal,
        expenses: currentExpensesTotal,
        remaining: budgetRemaining,
        usedPercent: budgetUsedPercent,
        trailingAverageExpenses,
        trendPercent: Math.round(expenseTrend),
      },
      goals,
      subscriptions: {
        total: subscriptionSummary.total,
        count: subscriptionSummary.count,
        items: subscriptionSummary.items.slice(0, 5),
      },
      insights: insights.slice(0, 5),
    };
  },
});

function nextDueAt(from: number, frequency: "daily" | "weekly" | "monthly" | "yearly", interval: number) {
  const date = new Date(from);

  if (frequency === "daily") return from + interval * MS_PER_DAY;
  if (frequency === "weekly") return from + interval * 7 * MS_PER_DAY;
  if (frequency === "monthly") {
    date.setMonth(date.getMonth() + interval);
    return date.getTime();
  }
  date.setFullYear(date.getFullYear() + interval);
  return date.getTime();
}

function generateProjectedInstances(
  rule: { frequency: "daily" | "weekly" | "monthly" | "yearly"; interval: number; startsAt: number; endsAt?: number },
  from: number,
  to: number,
) {
  const instances: number[] = [];
  let dueAt = rule.startsAt;
  const maxIterations = 60;
  let iterations = 0;

  while (iterations < maxIterations) {
    if (dueAt >= from && dueAt <= to) {
      instances.push(dueAt);
    }
    if (dueAt > to) break;
    dueAt = nextDueAt(dueAt, rule.frequency, rule.interval);
    if (rule.endsAt && dueAt > rule.endsAt) break;
    iterations++;
  }

  return instances;
}

export const getOverview = query({
  args: {
    householdId: v.id("households"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdMember(ctx, args.householdId, user._id);

    const now = new Date();
    const thisMonth = getMonthBounds(now.getFullYear(), now.getMonth());
    const lastMonth = getMonthBounds(now.getFullYear(), now.getMonth() - 1);

    const [bills, expenses] = await Promise.all([
      ctx.db
        .query("bills")
        .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
        .collect(),
      ctx.db
        .query("expenses")
        .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
        .collect(),
    ]);

    const activeBills = bills.filter((b) => b.status !== "cancelled");
    const subscriptionSummary = buildSubscriptionSummary(activeBills, now.getTime());

    // This month bills
    const thisMonthBills = activeBills.filter(
      (b) => b.dueAt !== undefined && b.dueAt >= thisMonth.start && b.dueAt <= thisMonth.end,
    );
    const thisMonthPaid = thisMonthBills.filter((b) => b.status === "paid");
    const thisMonthExpected = thisMonthBills.filter((b) => b.status !== "paid");
    const thisMonthPaidAmount = thisMonthPaid.reduce((s, b) => s + (b.amountExpected ?? 0), 0);
    const thisMonthExpectedAmount = thisMonthExpected.reduce((s, b) => s + (b.amountExpected ?? 0), 0);
    const thisMonthOverdueAmount = thisMonthExpected
      .filter((b) => b.dueAt && b.dueAt < now.getTime())
      .reduce((s, b) => s + (b.amountExpected ?? 0), 0);

    // Last month bills
    const lastMonthBills = activeBills.filter(
      (b) => b.dueAt !== undefined && b.dueAt >= lastMonth.start && b.dueAt <= lastMonth.end,
    );
    const lastMonthPaidAmount = lastMonthBills
      .filter((b) => b.status === "paid")
      .reduce((s, b) => s + (b.amountExpected ?? 0), 0);
    const lastMonthExpectedAmount = lastMonthBills
      .filter((b) => b.status !== "paid")
      .reduce((s, b) => s + (b.amountExpected ?? 0), 0);

    // This month expenses
    const thisMonthExpenseList = expenses.filter(
      (e) => e.spentAt >= thisMonth.start && e.spentAt <= thisMonth.end,
    );
    const thisMonthSpent = thisMonthExpenseList.reduce((s, e) => s + e.amount, 0);

    // Last month expenses
    const lastMonthExpenseList = expenses.filter(
      (e) => e.spentAt >= lastMonth.start && e.spentAt <= lastMonth.end,
    );
    const lastMonthSpent = lastMonthExpenseList.reduce((s, e) => s + e.amount, 0);

    // Category breakdown
    const categoryTotals = new Map<string, number>();
    for (const e of thisMonthExpenseList) {
      categoryTotals.set(e.category, (categoryTotals.get(e.category) ?? 0) + e.amount);
    }
    const categoryBreakdown = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({ category, amount }));

    return {
      billsPaid: { amount: thisMonthPaidAmount, count: thisMonthPaid.length },
      billsExpected: { amount: thisMonthExpectedAmount, count: thisMonthExpected.length },
      billsOverdue: { amount: thisMonthOverdueAmount, count: thisMonthExpected.filter((b) => b.dueAt && b.dueAt < now.getTime()).length },
      expenses: { amount: thisMonthSpent, count: thisMonthExpenseList.length },
      netOutflow: thisMonthPaidAmount + thisMonthSpent,
      remaining: thisMonthExpectedAmount - thisMonthOverdueAmount,
      lastMonth: {
        billsPaid: lastMonthPaidAmount,
        billsExpected: lastMonthExpectedAmount,
        expenses: lastMonthSpent,
        netOutflow: lastMonthPaidAmount + lastMonthSpent,
      },
      subscriptions: subscriptionSummary,
      categoryBreakdown,
    };
  },
});

export const getMonthlyReport = query({
  args: {
    householdId: v.id("households"),
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdMember(ctx, args.householdId, user._id);

    const bounds = getMonthBounds(args.year, args.month);

    const [bills, expenses] = await Promise.all([
      ctx.db
        .query("bills")
        .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
        .collect(),
      ctx.db
        .query("expenses")
        .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
        .collect(),
    ]);

    const monthBills = bills.filter(
      (b) =>
        b.status !== "cancelled" &&
        b.dueAt !== undefined &&
        b.dueAt >= bounds.start &&
        b.dueAt <= bounds.end,
    );

    const monthExpenses = expenses.filter(
      (e) => e.spentAt >= bounds.start && e.spentAt <= bounds.end,
    );

    const totalBillsExpected = monthBills.reduce((s, b) => s + (b.amountExpected ?? 0), 0);
    const totalBillsPaid = monthBills
      .filter((b) => b.status === "paid")
      .reduce((s, b) => s + (b.amountExpected ?? 0), 0);
    const totalExpenses = monthExpenses.reduce((s, e) => s + e.amount, 0);

    const categoryTotals = new Map<string, number>();
    for (const e of monthExpenses) {
      categoryTotals.set(e.category, (categoryTotals.get(e.category) ?? 0) + e.amount);
    }

    return {
      bills: monthBills,
      expenses: monthExpenses,
      summary: {
        totalBillsExpected,
        totalBillsPaid,
        totalBillsPending: totalBillsExpected - totalBillsPaid,
        totalExpenses,
        grandTotal: totalBillsPaid + totalExpenses,
      },
      categoryBreakdown: Array.from(categoryTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([category, amount]) => ({ category, amount })),
    };
  },
});

export const getYearlyReport = query({
  args: {
    householdId: v.id("households"),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdMember(ctx, args.householdId, user._id);

    const [bills, expenses] = await Promise.all([
      ctx.db
        .query("bills")
        .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
        .collect(),
      ctx.db
        .query("expenses")
        .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
        .collect(),
    ]);

    const months = Array.from({ length: 12 }, (_, i) => {
      const bounds = getMonthBounds(args.year, i);
      const monthBills = bills.filter(
        (b) =>
          b.status !== "cancelled" &&
          b.dueAt !== undefined &&
          b.dueAt >= bounds.start &&
          b.dueAt <= bounds.end,
      );
      const monthExpenses = expenses.filter(
        (e) => e.spentAt >= bounds.start && e.spentAt <= bounds.end,
      );
      const billsPaid = monthBills
        .filter((b) => b.status === "paid")
        .reduce((s, b) => s + (b.amountExpected ?? 0), 0);
      const billsExpected = monthBills
        .filter((b) => b.status !== "paid")
        .reduce((s, b) => s + (b.amountExpected ?? 0), 0);
      const spent = monthExpenses.reduce((s, e) => s + e.amount, 0);

      return {
        month: i,
        label: new Date(args.year, i, 1).toLocaleString(undefined, { month: "short" }),
        billsPaid,
        billsExpected,
        expenses: spent,
        total: billsPaid + billsExpected + spent,
      };
    });

    const yearTotalBillsPaid = months.reduce((s, m) => s + m.billsPaid, 0);
    const yearTotalBillsExpected = months.reduce((s, m) => s + m.billsExpected, 0);
    const yearTotalExpenses = months.reduce((s, m) => s + m.expenses, 0);

    return {
      months,
      yearTotal: {
        billsPaid: yearTotalBillsPaid,
        billsExpected: yearTotalBillsExpected,
        expenses: yearTotalExpenses,
        grandTotal: yearTotalBillsPaid + yearTotalExpenses,
      },
    };
  },
});

export const getProjections = query({
  args: {
    householdId: v.id("households"),
    monthsAhead: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdMember(ctx, args.householdId, user._id);

    const ahead = args.monthsAhead ?? 3;
    const now = new Date();

    const [bills, rules] = await Promise.all([
      ctx.db
        .query("bills")
        .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
        .collect(),
      ctx.db
        .query("recurrenceRules")
        .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
        .collect(),
    ]);

    const results: {
      monthLabel: string;
      year: number;
      month: number;
      upcomingBills: { title: string; amountExpected?: number; currency: string; dueAt: number; status: string; isProjected: boolean }[];
      projectedTotal: number;
      actualTotal: number;
    }[] = [];

    for (let i = 0; i < ahead; i++) {
      const year = now.getFullYear();
      const month = now.getMonth() + i;
      const adjustedYear = year + Math.floor(month / 12);
      const adjustedMonth = ((month % 12) + 12) % 12;
      const bounds = getMonthBounds(adjustedYear, adjustedMonth);

      const monthBills = bills.filter(
        (b) =>
          b.status !== "cancelled" &&
          b.status !== "paid" &&
          b.dueAt !== undefined &&
          b.dueAt >= bounds.start &&
          b.dueAt <= bounds.end,
      );

      const upcomingBills = monthBills.map((b) => ({
        title: b.title,
        amountExpected: b.amountExpected,
        currency: b.currency,
        dueAt: b.dueAt!,
        status: b.status,
        isProjected: false,
      }));

      // Project from recurrence rules
      for (const rule of rules.filter((r) => r.entityType === "bill")) {
        const instances = generateProjectedInstances(rule, bounds.start, bounds.end);
        for (const dueAt of instances) {
          // Avoid duplicates if a real bill already exists for this due date
          const exists = monthBills.some(
            (b) => b.recurrenceRuleId === rule._id && Math.abs(b.dueAt! - dueAt) < 24 * 60 * 60 * 1000,
          );
          if (!exists) {
            upcomingBills.push({
              title: `Recurring bill`,
              amountExpected: undefined,
              currency: "EUR",
              dueAt,
              status: "upcoming",
              isProjected: true,
            });
          }
        }
      }

      const actualTotal = monthBills.reduce((s, b) => s + (b.amountExpected ?? 0), 0);
      const projectedTotal = upcomingBills.reduce((s, b) => s + (b.amountExpected ?? 0), 0);

      results.push({
        monthLabel: new Date(adjustedYear, adjustedMonth, 1).toLocaleString(undefined, { month: "long" }),
        year: adjustedYear,
        month: adjustedMonth,
        upcomingBills: upcomingBills.sort((a, b) => a.dueAt - b.dueAt),
        projectedTotal,
        actualTotal,
      });
    }

    return results;
  },
});
