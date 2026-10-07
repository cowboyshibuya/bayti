"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

import { Doc, Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { LoadingState } from "@/components/shared/loading-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  BillForm,
  type BillFormSubmitValues,
} from "@/components/bills/bill-form";
import { BillList } from "@/components/bills/bill-list";
import {
  ExpenseForm,
  type ExpenseFormSubmitValues,
} from "@/components/accounting/expense-form";
import { ExpenseList } from "@/components/accounting/expense-list";
import { OverviewStats } from "@/components/accounting/overview-stats";
import { CategoryBreakdown } from "@/components/accounting/category-breakdown";
import { ProjectionsPanel } from "@/components/accounting/projections-panel";
import { YearlyOverview } from "@/components/accounting/yearly-overview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrencyFormatter } from "@/lib/use-currency-formatter";
import { useHousehold } from "@/lib/household-context";

const billViews = [
  { value: "upcoming", label: "Upcoming" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
  { value: "subscriptions", label: "Subscriptions" },
  { value: "all", label: "All" },
  { value: "mine", label: "Mine" },
] as const;

type BillView = (typeof billViews)[number]["value"];

const expenseViews = [
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "all", label: "All" },
  { value: "mine", label: "Mine" },
] as const;

type ExpenseView = (typeof expenseViews)[number]["value"];

export default function AccountingPage() {
  const formatCurrency = useCurrencyFormatter();
  const [activeTab, setActiveTab] = useState("overview");
  const [billView, setBillView] = useState<BillView>("upcoming");
  const [expenseView, setExpenseView] = useState<ExpenseView>("this_month");
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState(new Date().getMonth());
  const [expenseToDelete, setExpenseToDelete] =
    useState<Doc<"expenses"> | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { household } = useHousehold();
  const householdId = household?._id;
  const members = useQuery(
    api.members.listAssignable,
    householdId ? { householdId } : "skip",
  );

  const overview = useQuery(
    api.accounting.getOverview,
    householdId ? { householdId } : "skip",
  );
  const projections = useQuery(
    api.accounting.getProjections,
    householdId ? { householdId } : "skip",
  );
  const yearlyReport = useQuery(
    api.accounting.getYearlyReport,
    householdId ? { householdId, year: reportYear } : "skip",
  );
  const monthlyReport = useQuery(
    api.accounting.getMonthlyReport,
    householdId
      ? { householdId, year: reportYear, month: reportMonth }
      : "skip",
  );

  const createBill = useMutation(api.bills.create);
  const markPaid = useMutation(api.bills.markPaid);
  const createExpense = useMutation(api.expenses.create);
  const removeExpense = useMutation(api.expenses.remove);

  if (!householdId || members === undefined || overview === undefined) {
    return <LoadingState label="Loading accounting" />;
  }

  const currentHouseholdId = householdId;

  async function handleCreateBill(values: BillFormSubmitValues) {
    await createBill({
      householdId: currentHouseholdId,
      title: values.title,
      description: values.description,
      provider: values.provider,
      amountExpected: values.amountExpected,
      paidAt: values.paidAt,
      currency: values.currency,
      dueAt: values.dueAt,
      status: values.status,
      priority: values.priority,
      ownerUserId: values.ownerUserId,
      autopay: values.autopay,
      recurrence: values.recurrence ?? undefined,
    });
  }

  async function handleCreateExpense(values: ExpenseFormSubmitValues) {
    await createExpense({
      householdId: currentHouseholdId,
      title: values.title,
      merchant: values.merchant,
      amount: values.amount,
      currency: values.currency,
      spentAt: values.spentAt,
      category: values.category,
      paymentMethod: values.paymentMethod,
      notes: values.notes,
      paidByUserId: values.paidByUserId,
    });
  }

  async function handleDeleteExpense() {
    if (!expenseToDelete) return;

    setDeletePending(true);
    setDeleteError(null);

    try {
      await removeExpense({
        householdId: currentHouseholdId,
        expenseId: expenseToDelete._id,
      });
      setExpenseToDelete(null);
    } catch (caught) {
      setDeleteError(
        caught instanceof Error ? caught.message : "Could not delete expense.",
      );
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{household?.name}</p>
          <h1 className="text-2xl font-semibold">Accounting</h1>
        </div>
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" />
                Add bill
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add bill</DialogTitle>
                <DialogDescription>
                  Track a recurring or one-time household bill.
                </DialogDescription>
              </DialogHeader>
              <BillForm
                members={members}
                submitLabel="Add bill"
                onSubmit={handleCreateBill}
              />
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="size-4" />
                Log expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Log expense</DialogTitle>
                <DialogDescription>
                  Record a household expense with category and date.
                </DialogDescription>
              </DialogHeader>
              <ExpenseForm
                members={members}
                submitLabel="Log expense"
                onSubmit={handleCreateExpense}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="mt-6 grid gap-4"
      >
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bills">Bills</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="projections">Projections</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid gap-6"
          >
            <OverviewStats data={overview} />
            <SubscriptionSummaryCard subscriptions={overview.subscriptions} />
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border bg-card p-5 [box-shadow:var(--shadow-card)]">
                <h3 className="text-sm font-semibold">Expense breakdown</h3>
                <p className="text-xs text-muted-foreground">
                  This month by category
                </p>
                <div className="mt-4">
                  <CategoryBreakdown data={overview.categoryBreakdown} />
                </div>
              </div>
              <div className="rounded-xl border bg-card p-5 [box-shadow:var(--shadow-card)]">
                <h3 className="text-sm font-semibold">Quick summary</h3>
                <div className="mt-4 grid gap-3 text-sm">
                  <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <span className="text-muted-foreground">
                      Remaining to pay
                    </span>
                    <span className="font-medium">
                      {formatCurrency(overview.remaining)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <span className="text-muted-foreground">Overdue bills</span>
                    <span className="font-medium text-destructive">
                      {formatCurrency(overview.billsOverdue.amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <span className="text-muted-foreground">
                      Bills + expenses
                    </span>
                    <span className="font-medium">
                      {formatCurrency(overview.netOutflow)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="bills" className="mt-0">
          <motion.div
            key="bills"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid gap-4"
          >
            <div className="flex flex-wrap gap-2">
              {billViews.map((v) => (
                <Button
                  key={v.value}
                  size="sm"
                  variant={billView === v.value ? "secondary" : "outline"}
                  onClick={() => setBillView(v.value)}
                >
                  {v.label}
                </Button>
              ))}
            </div>
            <BillsViewPanel
              view={billView}
              householdId={currentHouseholdId}
              members={members}
              onMarkPaid={(bill) =>
                markPaid({ householdId: currentHouseholdId, billId: bill._id })
              }
            />
          </motion.div>
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-0">
          <motion.div
            key="subscriptions"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid gap-4"
          >
            <SubscriptionSummaryCard subscriptions={overview.subscriptions} />
            <BillsViewPanel
              view="subscriptions"
              householdId={currentHouseholdId}
              members={members}
              onMarkPaid={(bill) =>
                markPaid({ householdId: currentHouseholdId, billId: bill._id })
              }
            />
          </motion.div>
        </TabsContent>

        <TabsContent value="expenses" className="mt-0">
          <motion.div
            key="expenses"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid gap-4"
          >
            <div className="flex flex-wrap gap-2">
              {expenseViews.map((v) => (
                <Button
                  key={v.value}
                  size="sm"
                  variant={expenseView === v.value ? "secondary" : "outline"}
                  onClick={() => setExpenseView(v.value)}
                >
                  {v.label}
                </Button>
              ))}
            </div>
            <ExpensesViewPanel
              view={expenseView}
              householdId={currentHouseholdId}
              onRemove={setExpenseToDelete}
            />
          </motion.div>
        </TabsContent>

        <TabsContent value="projections" className="mt-0">
          <motion.div
            key="projections"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {projections === undefined ? (
              <LoadingState label="Loading projections" />
            ) : (
              <ProjectionsPanel projections={projections} />
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="reports" className="mt-0">
          <motion.div
            key="reports"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid gap-6"
          >
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={reportYear.toString()}
                onValueChange={(v) => setReportYear(Number(v))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => {
                    const y = new Date().getFullYear() - 2 + i;
                    return (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Select
                value={reportMonth.toString()}
                onValueChange={(v) => setReportMonth(Number(v))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {new Date(2000, i, 1).toLocaleString(undefined, {
                        month: "long",
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {yearlyReport === undefined || monthlyReport === undefined ? (
              <LoadingState label="Loading reports" />
            ) : (
              <>
                <YearlyOverview data={yearlyReport} />

                <div className="rounded-xl border bg-card p-5 [box-shadow:var(--shadow-card)]">
                  <h3 className="text-sm font-semibold">
                    {new Date(reportYear, reportMonth, 1).toLocaleString(
                      undefined,
                      { month: "long", year: "numeric" },
                    )}{" "}
                    detail
                  </h3>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Bills
                      </p>
                      <div className="mt-2 grid gap-2">
                        {monthlyReport.bills.length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            No bills this month.
                          </p>
                        )}
                        {monthlyReport.bills.map((bill) => (
                          <div
                            key={bill._id}
                            className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                          >
                            <span>{bill.title}</span>
                            <span className="font-medium">
                              {formatCurrency(
                                bill.amountExpected ?? 0,
                                bill.currency,
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t pt-2 text-sm">
                        <span className="text-muted-foreground">Expected</span>
                        <span className="font-medium">
                          {formatCurrency(
                            monthlyReport.summary.totalBillsExpected,
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Paid</span>
                        <span className="font-medium text-success">
                          {formatCurrency(monthlyReport.summary.totalBillsPaid)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Expenses
                      </p>
                      <div className="mt-2 grid gap-2">
                        {monthlyReport.expenses.length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            No expenses this month.
                          </p>
                        )}
                        {monthlyReport.expenses.map((expense) => (
                          <div
                            key={expense._id}
                            className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                          >
                            <span>{expense.title}</span>
                            <span className="font-medium">
                              {formatCurrency(expense.amount, expense.currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t pt-2 text-sm">
                        <span className="text-muted-foreground">Total</span>
                        <span className="font-medium">
                          {formatCurrency(monthlyReport.summary.totalExpenses)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 border-t pt-4">
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>Grand total</span>
                      <span>
                        {formatCurrency(monthlyReport.summary.grandTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-card p-5 [box-shadow:var(--shadow-card)]">
                  <h3 className="text-sm font-semibold">Category breakdown</h3>
                  <div className="mt-4">
                    <CategoryBreakdown data={monthlyReport.categoryBreakdown} />
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </TabsContent>
      </Tabs>
      <ConfirmDialog
        open={Boolean(expenseToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setExpenseToDelete(null);
            setDeleteError(null);
          }
        }}
        title="Delete expense?"
        description={
          expenseToDelete
            ? `This permanently deletes "${expenseToDelete.title}" from household accounting. This cannot be undone.`
            : "This permanently deletes the expense."
        }
        actionLabel="Delete expense"
        pending={deletePending}
        error={deleteError}
        onConfirm={handleDeleteExpense}
      />
    </div>
  );
}

function BillsViewPanel({
  view,
  householdId,
  members,
  onMarkPaid,
}: {
  view: BillView;
  householdId: Id<"households">;
  members: { membership: Doc<"householdMembers">; user: Doc<"users"> | null }[];
  onMarkPaid: (bill: Doc<"bills">) => void;
}) {
  const bills = useQuery(api.bills.list, { householdId, view });

  if (bills === undefined) {
    return (
      <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        Loading {view} bills...
      </p>
    );
  }

  return (
    <BillList
      bills={bills}
      dateMode={view === "paid" ? "paid" : "due"}
      emptyTitle={`No ${view} bills`}
      emptyDescription={
        view === "subscriptions"
          ? "Mark a bill as autopay or recurring to track subscriptions."
          : "Add a bill to start tracking household payments."
      }
      members={members}
      onMarkPaid={onMarkPaid}
    />
  );
}

function SubscriptionSummaryCard({
  subscriptions,
}: {
  subscriptions: {
    count: number;
    total: number;
    autopayCount: number;
    dueSoonCount: number;
    overdueCount: number;
  };
}) {
  const formatCurrency = useCurrencyFormatter();
  return (
    <div className="rounded-xl border bg-card p-5 [box-shadow:var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">Subscriptions</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Recurring or autopay bills tracked this month.
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold">
            {formatCurrency(subscriptions.total)}
          </p>
          <p className="text-xs text-muted-foreground">
            {subscriptions.count} active
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <SubscriptionMetric
          label="Autopay"
          value={subscriptions.autopayCount}
        />
        <SubscriptionMetric
          label="Due soon"
          value={subscriptions.dueSoonCount}
        />
        <SubscriptionMetric
          label="Overdue"
          value={subscriptions.overdueCount}
          tone="destructive"
        />
      </div>
    </div>
  );
}

function SubscriptionMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "destructive";
}) {
  return (
    <div className="rounded-lg border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          tone === "destructive"
            ? "font-semibold text-destructive"
            : "font-semibold"
        }
      >
        {value}
      </p>
    </div>
  );
}

function ExpensesViewPanel({
  view,
  householdId,
  onRemove,
}: {
  view: ExpenseView;
  householdId: Id<"households">;
  onRemove: (expense: Doc<"expenses">) => void;
}) {
  const expenses = useQuery(api.expenses.list, { householdId, view });

  if (expenses === undefined) {
    return (
      <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        Loading expenses...
      </p>
    );
  }

  return (
    <ExpenseList
      expenses={expenses}
      emptyTitle="No expenses found"
      emptyDescription="Log an expense to start tracking household spending."
      onRemove={onRemove}
    />
  );
}
