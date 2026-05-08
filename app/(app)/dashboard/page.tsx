"use client";

import type { ComponentType } from "react";
import { useQuery } from "convex/react";
import {ArrowRight,CalendarDays,CheckCircle2,CheckSquare,CreditCard,Lightbulb,ReceiptText,ShoppingCart,TrendingDown,TrendingUp,WalletCards} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

import { api } from "../../../convex/_generated/api";
import { RecentActivityPanel } from "@/components/dashboard/recent-activity-panel";
import { RecentNotesPanel } from "@/components/dashboard/recent-notes-panel";
import { OverduePanel } from "@/components/dashboard/overdue-panel";
import { TodayPanel } from "@/components/dashboard/today-panel";
import { UpcomingPanel } from "@/components/dashboard/upcoming-panel";
import { UpcomingBillsPanel } from "@/components/dashboard/upcoming-bills-panel";
import { ActiveShoppingListsPanel } from "@/components/dashboard/active-shopping-lists-panel";
import { DashboardMiniCalendar } from "@/components/dashboard/dashboard-mini-calendar";
import { QuickCreateDialog } from "@/components/shared/quick-create-dialog";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";
import { useHousehold } from "@/lib/household-context";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/dates";

type MonthlyPoint = {
  key: string;
  label: string;
  expenses: number;
  billsPaid: number;
  billsExpected: number;
  total: number;
};

type CategoryPoint = {
  category: string;
  amount: number;
  percent: number;
};

type GoalPoint = {
  key: string;
  title: string;
  current: number;
  target: number;
  progress: number;
  label: string;
};

type SubscriptionPoint = {
  billId: string;
  title: string;
  provider?: string;
  amount: number;
  currency: string;
  dueAt: number | null;
  status: string;
  autopay: boolean;
};

type InsightPoint = {
  key: string;
  title: string;
  message: string;
  severity: "positive" | "warning" | "neutral";
  href: string;
};

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const { onboardingState, household } = useHousehold();
  const householdId = household?._id;
  const dashboard = useQuery(
    api.households.getDashboard,
    householdId ? { householdId } : "skip",
  );
  const financials = useQuery(
    api.accounting.getDashboardFinancials,
    householdId ? { householdId } : "skip",
  );
  const taskDashboard = useQuery(
    api.tasks.dashboard,
    householdId ? { householdId } : "skip",
  );
  const billDashboard = useQuery(
    api.bills.dashboard,
    householdId ? { householdId } : "skip",
  );
  const eventDashboard = useQuery(
    api.events.dashboard,
    householdId ? { householdId } : "skip",
  );
  const shoppingDashboard = useQuery(
    api.shopping.dashboard,
    householdId ? { householdId } : "skip",
  );
  const expenseDashboard = useQuery(
    api.expenses.dashboard,
    householdId ? { householdId } : "skip",
  );

  if (
    !householdId ||
    dashboard === undefined ||
    financials === undefined ||
    taskDashboard === undefined ||
    billDashboard === undefined ||
    eventDashboard === undefined ||
    shoppingDashboard === undefined ||
    expenseDashboard === undefined
  ) {
    return <LoadingState label="Loading dashboard" />;
  }

  const todayDate = new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  const firstName = getFirstName(onboardingState?.user?.name);
  const todaySummary = buildTodaySummary({
    tasks: taskDashboard.totalToday,
    events: eventDashboard.totalToday,
    bills: billDashboard.totalToday,
    expenses: expenseDashboard.countToday,
  });

  return (
    <div className="mx-auto">
      <motion.section
        className="relative min-h-[360px] space-y-8 sm:space-y-10 overflow-hidden bg-card shadow-[0_28px_90px_rgba(25,25,25,0.09)] sm:p-7 p-5 dark:bg-background dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_28px_90px_rgba(0,0,0,0.26)]"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="hidden dark:block absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(255,180,95,0.2),transparent_36%)] dark:bg-[radial-gradient(circle_at_18%_0%,rgba(255,128,48,0.16),transparent_36%)]" />
        <div className="relative flex min-h-[312px] flex-col justify-between gap-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-sm text-foreground/42">{todayDate}</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-normal text-foreground/56 sm:text-4xl lg:text-5xl">
                Good morning, {firstName}.
                <br />
                <span className="text-foreground">{todaySummary}</span>
              </h2>
            </div>
            <div className="sm:hidden">
              <QuickCreateDialog />
            </div>
            <Button variant="secondary" className="hidden sm:inline-flex" asChild>
              <Link href="/tasks">
                View tasks
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <motion.div
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
            variants={container}
            initial="hidden"
            animate="visible"
          >
            <TodayStat
              label="Tasks"
              value={taskDashboard.totalToday}
              detail="Due today"
              icon={CheckSquare}
              href="/tasks"
            />
            <TodayStat
              label="Events"
              value={eventDashboard.totalToday}
              detail="On the calendar"
              icon={CalendarDays}
              href="/events"
            />
            <TodayStat
              label="Bills"
              value={billDashboard.totalToday}
              detail="Due today"
              icon={ReceiptText}
              href="/bills"
            />
            <TodayStat
              label="Expenses"
              value={expenseDashboard.countToday}
              detail={formatCurrency(expenseDashboard.totalToday)}
              icon={WalletCards}
              href="/accounting"
            />
          </motion.div>
        </div>

        <motion.section
          variants={item}
          className="overflow-hidden rounded-3xl border border-border bg-card shadow-[0_22px_70px_rgba(25,25,25,0.08)] dark:bg-card/86 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_24px_80px_rgba(0,0,0,0.24)]"
        >
          <div className="grid gap-0 xl:grid-cols-[1.05fr_1fr]">
            <div className="border-b border-border p-5 sm:p-6 xl:border-b-0 xl:border-r">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-foreground/42">
                    {financials.monthLabel}
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
                    Family money overview
                  </h1>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-foreground/50">
                    Good morning, {firstName}. {todaySummary}
                  </p>
                </div>
                <div className="sm:hidden">
                  <QuickCreateDialog />
                </div>
                <Button variant="secondary" className="hidden sm:inline-flex" asChild>
                  <Link href="/accounting">
                    View accounting
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>

              <div className="mt-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-foreground/38">
                      Actual vs planned
                    </p>
                    <p className="mt-2 text-4xl font-semibold tracking-normal text-foreground">
                      {formatCurrency(financials.budget.actualOutflow)}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm text-foreground/42">Monthly plan</p>
                    <p className="mt-1 text-xl font-semibold text-foreground/86">
                      {formatCurrency(financials.budget.plannedOutflow)}
                    </p>
                  </div>
                </div>
                <ProgressBar
                  value={financials.budget.usedPercent}
                  className="mt-5"
                  tone={financials.budget.usedPercent > 90 ? "warning" : "accent"}
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-foreground/48">
                  <span>{financials.budget.usedPercent}% used</span>
                  <span>{formatCurrency(financials.budget.remaining)} remaining</span>
                </div>
              </div>
            </div>

            <div className="grid content-between gap-4 p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <FinanceMetric
                  label="Already paid"
                  value={formatCurrency(financials.budget.paidBills)}
                  icon={CheckCircle2}
                />
                <FinanceMetric
                  label="Remaining planned"
                  value={formatCurrency(financials.budget.pendingBills)}
                  icon={ReceiptText}
                />
                <FinanceMetric
                  label="Fixed subscriptions"
                  value={formatCurrency(financials.subscriptions.total)}
                  detail={`${financials.subscriptions.count} tracked`}
                  icon={CreditCard}
                />
                <FinanceMetric
                  label="Expenses"
                  value={formatCurrency(financials.budget.expenses)}
                  detail={trendLabel(financials.budget.trendPercent)}
                  icon={
                    financials.budget.trendPercent > 0
                      ? TrendingUp
                      : TrendingDown
                  }
                />
              </div>
              <InsightStrip insights={financials.insights} />
            </div>
          </div>
        </motion.section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <MonthlyBars data={financials.monthlySeries} />
          <CategoryGraph data={financials.categoryBreakdown} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1fr_1fr]">
          <BudgetPanel budget={financials.budget} />
          <GoalsPanel goals={financials.goals} />
          <SubscriptionsPanel subscriptions={financials.subscriptions.items} />
        </section>

        <InsightsPanel insights={financials.insights} />


        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="grid gap-6 lg:grid-cols-2">
            <TodayPanel tasks={taskDashboard.todayTasks} />
            <DashboardMiniCalendar householdId={householdId} />
            <UpcomingBillsPanel bills={dashboard.upcomingBills} />
            <UpcomingPanel tasks={taskDashboard.upcomingTasks} />
            <OverduePanel tasks={taskDashboard.overdueTasks} />
            <ActiveShoppingListsPanel lists={shoppingDashboard.activeLists} />
            <RecentNotesPanel />
          </div>

          <div className="grid content-start gap-6">
            <div className="overflow-hidden rounded-3xl border border-border bg-card/90 p-5 shadow-[0_18px_55px_rgba(25,25,25,0.07)] backdrop-blur-xl dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_50px_rgba(0,0,0,0.18)]">
              <p className="text-xs font-medium text-foreground/42">
                Invite code
              </p>
              <p className="mt-3 font-mono text-3xl font-semibold tracking-normal">
                {dashboard.household.inviteCode}
              </p>
              <p className="mt-3 text-sm leading-6 text-foreground/45">
                Share this code only with people who should join this private
                household.
              </p>
            </div>
            <DailyFocus
              tasks={taskDashboard.totalToday}
              events={eventDashboard.totalToday}
              bills={billDashboard.totalToday}
              lists={shoppingDashboard.activeLists.length}
            />
            <RecentActivityPanel activity={dashboard.recentActivity} />
          </div>
        </section>

        {/*<section className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="grid gap-6 lg:grid-cols-2">
            <TodayPanel tasks={taskDashboard.todayTasks} />
            <UpcomingEventsPanel events={dashboard.upcomingEvents} />
            <UpcomingBillsPanel bills={dashboard.upcomingBills} />
            <UpcomingPanel tasks={taskDashboard.upcomingTasks} />
            <OverduePanel tasks={taskDashboard.overdueTasks} />
            <ActiveShoppingListsPanel lists={shoppingDashboard.activeLists} />
            <RecentExpensesPanel />
            <RecentNotesPanel />
          </div>

          <div className="grid content-start gap-6">
            <div className="overflow-hidden rounded-3xl border border-border bg-card/90 p-5 shadow-[0_18px_55px_rgba(25,25,25,0.07)] backdrop-blur-xl dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_50px_rgba(0,0,0,0.18)]">
              <p className="text-xs font-medium text-foreground/42">
                Invite code
              </p>
              <p className="mt-3 font-mono text-3xl font-semibold tracking-normal">
                {dashboard.household.inviteCode}
              </p>
              <p className="mt-3 text-sm leading-6 text-foreground/45">
                Share this code only with people who should join this private
                household.
              </p>
            </div>
            <DailyFocus
              tasks={taskDashboard.totalToday}
              events={eventDashboard.totalToday}
              bills={billDashboard.totalToday}
              lists={shoppingDashboard.activeLists.length}
            />
            <RecentActivityPanel activity={dashboard.recentActivity} />
          </div>
        </section>*/}
      </motion.section>
    </div>
  );
}

function TodayStat({
  label,
  value,
  detail,
  icon: Icon,
  href,
}: {
  label: string;
  value: number;
  detail: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
}) {
  return (
    <motion.div
      variants={item}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
    >
      <Link
        href={href}
        className="block min-h-[120px] rounded-3xl border border-border bg-muted/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition-colors hover:bg-muted/70 dark:bg-white/[0.055] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:hover:bg-white/[0.085]"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="flex size-9 items-center justify-center rounded-2xl bg-card text-accent dark:bg-white/[0.07]">
            <Icon className="size-4" />
          </span>
          <ArrowRight className="size-4 text-foreground/24" />
        </div>
        <div className="mt-5">
          <p className="text-3xl font-semibold tracking-normal text-foreground">
            {value}
          </p>
          <p className="mt-1 text-sm text-foreground/48">
            {label} <span className="text-foreground/28">/ {detail}</span>
          </p>
        </div>
      </Link>
    </motion.div>
  );
}

function DailyFocus({
  tasks,
  events,
  bills,
  lists,
}: {
  tasks: number;
  events: number;
  bills: number;
  lists: number;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card/90 p-5 shadow-[0_18px_55px_rgba(25,25,25,0.07)] backdrop-blur-xl dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_50px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground/88">Today</p>
          <p className="mt-1 text-sm text-foreground/42">Household activity</p>
        </div>
        <ShoppingCart className="size-4 text-foreground/34" />
      </div>
      <div className="mt-5 divide-y divide-border">
        <FocusRow label="Tasks" value={tasks} />
        <FocusRow label="Events" value={events} />
        <FocusRow label="Bills" value={bills} />
        <FocusRow label="Active lists" value={lists} />
      </div>
    </div>
  );
}

function FocusRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-3 text-sm">
      <span className="text-foreground/45">{label}</span>
      <span className="font-semibold text-foreground/88">{value}</span>
    </div>
  );
}

function getFirstName(name?: string | null) {
  return name?.trim().split(/\s+/)[0] || "there";
}

function buildTodaySummary({
  tasks,
  events,
  bills,
  expenses,
}: {
  tasks: number;
  events: number;
  bills: number;
  expenses: number;
}) {
  const parts = [
    formatCount(events, "event"),
    formatCount(bills, "bill"),
    formatCount(tasks, "task"),
    formatCount(expenses, "expense"),
  ].filter(Boolean);

  if (parts.length === 0) {
    return "You have a clear day.";
  }

  return `You have ${toSentence(parts)} today.`;
}

function formatCount(count: number, noun: string) {
  if (count === 0) {
    return "";
  }

  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function toSentence(parts: string[]) {
  if (parts.length === 1) {
    return parts[0];
  }

  if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]}`;
  }

  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}


function FinanceMetric({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/35 p-4 dark:bg-white/[0.045]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-foreground/42">{label}</p>
          <p className="mt-2 text-xl font-semibold tracking-normal text-foreground">
            {value}
          </p>
          {detail && <p className="mt-1 text-xs text-foreground/40">{detail}</p>}
        </div>
        <span className="flex size-9 items-center justify-center rounded-2xl bg-card text-accent dark:bg-white/[0.07]">
          <Icon className="size-4" />
        </span>
      </div>
    </div>
  );
}

function MonthlyBars({ data }: { data: MonthlyPoint[] }) {
  const max = Math.max(...data.map((point) => point.total), 1);

  return (
    <Panel title="Monthly trend" description="Expenses and bills over 6 months.">
      <div className="mt-6 flex h-64 items-end gap-3 border-b border-border pb-4">
        {data.map((point, index) => {
          const expenseHeight = (point.expenses / max) * 100;
          const paidHeight = (point.billsPaid / max) * 100;
          const expectedHeight = (point.billsExpected / max) * 100;
          const isEmpty = point.total === 0;

          return (
            <div key={point.key} className="flex min-w-0 flex-1 flex-col items-center gap-3">
              <div className="flex h-48 w-full max-w-14 items-end justify-center">
                {isEmpty ? (
                  <div className="h-2 w-full rounded-full bg-muted" />
                ) : (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max((point.total / max) * 100, 4)}%` }}
                    transition={{ delay: index * 0.04, duration: 0.45 }}
                    className="flex w-full flex-col justify-end overflow-hidden rounded-t-2xl bg-muted"
                    title={`${point.label}: ${formatCurrency(point.total)}`}
                  >
                    <div
                      className="bg-accent"
                      style={{ height: `${Math.max(expenseHeight, point.expenses > 0 ? 4 : 0)}%` }}
                    />
                    <div
                      className="bg-success"
                      style={{ height: `${Math.max(paidHeight, point.billsPaid > 0 ? 4 : 0)}%` }}
                    />
                    <div
                      className="bg-warning"
                      style={{ height: `${Math.max(expectedHeight, point.billsExpected > 0 ? 4 : 0)}%` }}
                    />
                  </motion.div>
                )}
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-foreground/62">
                  {point.label}
                </p>
                <p className="mt-1 text-[11px] text-foreground/36">
                  {formatCompactCurrency(point.total)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <Legend
        items={[
          ["Expenses", "bg-accent"],
          ["Paid bills", "bg-success"],
          ["Expected bills", "bg-warning"],
        ]}
      />
    </Panel>
  );
}

function formatCompactCurrency(amount: number) {
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 1,
  }).format(amount);
}

function trendLabel(percent: number) {
  if (percent === 0) {
    return "flat vs last month";
  }

  return `${Math.abs(percent)}% ${percent > 0 ? "higher" : "lower"} vs last month`;
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      variants={item}
      className="rounded-3xl border border-border bg-card/90 p-5 shadow-[0_18px_55px_rgba(25,25,25,0.06)] dark:bg-white/[0.045] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground/88">{title}</h2>
          <p className="mt-1 text-sm text-foreground/42">{description}</p>
        </div>
      </div>
      {children}
    </motion.div>
  );
}

function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-3 text-xs text-foreground/42">
      {items.map(([label, color]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span className={cn("size-2 rounded-full", color)} />
          {label}
        </span>
      ))}
    </div>
  );
}

function EmptyPanelText({ label }: { label: string }) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-border bg-muted/25 p-6 text-center text-sm text-foreground/42">
      {label}
    </div>
  );
}



function CategoryGraph({ data }: { data: CategoryPoint[] }) {
  const max = Math.max(...data.map((point) => point.amount), 1);

  return (
    <Panel title="Expense types" description="Current month by category.">
      {data.length === 0 ? (
        <EmptyPanelText label="No expenses logged this month." />
      ) : (
        <div className="mt-6 grid gap-4">
          {data.map((point, index) => (
            <motion.div
              key={point.category}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium text-foreground/82">
                  {point.category}
                </span>
                <span className="shrink-0 text-foreground/48">
                  {formatCurrency(point.amount)} · {point.percent}%
                </span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max((point.amount / max) * 100, 6)}%` }}
                  transition={{ delay: index * 0.04, duration: 0.45 }}
                  className={cn("h-full rounded-full", categoryColor(index))}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function categoryColor(index: number) {
  const colors = [
    "bg-accent",
    "bg-success",
    "bg-info",
    "bg-warning",
    "bg-primary",
    "bg-secondary",
  ];

  return colors[index % colors.length];
}

function BudgetPanel({
  budget,
}: {
  budget: {
    plannedOutflow: number;
    actualOutflow: number;
    remaining: number;
    trailingAverageExpenses: number;
    usedPercent: number;
  };
}) {
  return (
    <Panel title="Budget progress" description="Derived from bills and trailing expense average.">
      <div className="mt-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-3xl font-semibold tracking-normal">
              {budget.usedPercent}%
            </p>
            <p className="mt-1 text-sm text-foreground/42">of plan used</p>
          </div>
          <p className="text-right text-sm text-foreground/48">
            {formatCurrency(budget.remaining)}
            <br />
            remaining
          </p>
        </div>
        <ProgressBar
          value={budget.usedPercent}
          className="mt-5"
          tone={budget.usedPercent > 90 ? "warning" : "accent"}
        />
        <div className="mt-5 grid gap-2 text-sm">
          <BudgetRow label="Actual outflow" value={budget.actualOutflow} />
          <BudgetRow label="Monthly plan" value={budget.plannedOutflow} />
          <BudgetRow label="Trailing expense avg" value={budget.trailingAverageExpenses} />
        </div>
      </div>
    </Panel>
  );
}


function BudgetRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-muted/35 px-3 py-2 dark:bg-white/[0.035]">
      <span className="text-foreground/45">{label}</span>
      <span className="font-semibold text-foreground/82">
        {formatCurrency(value)}
      </span>
    </div>
  );
}

function GoalsPanel({ goals }: { goals: GoalPoint[] }) {
  return (
    <Panel title="Goals" description="Derived progress from household activity.">
      <div className="mt-6 grid gap-4">
        {goals.map((goal) => (
          <div key={goal.key}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground/86">
                  {goal.title}
                </p>
                <p className="mt-1 text-xs text-foreground/42">{goal.label}</p>
              </div>
              <span className="text-sm font-semibold text-foreground/72">
                {goal.progress}%
              </span>
            </div>
            <ProgressBar value={goal.progress} className="mt-3" tone="success" />
          </div>
        ))}
      </div>
    </Panel>
  );
}

function SubscriptionsPanel({
  subscriptions,
}: {
  subscriptions: SubscriptionPoint[];
}) {
  return (
    <Panel title="Subscriptions" description="Recurring or autopay bills.">
      {subscriptions.length === 0 ? (
        <EmptyPanelText label="No recurring or autopay bills found." />
      ) : (
        <div className="mt-5 divide-y divide-border">
          {subscriptions.map((subscription) => (
            <Link
              key={subscription.billId}
              href={`/bills/${subscription.billId}`}
              className="flex items-center justify-between gap-4 py-3 text-sm"
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold text-foreground/86">
                  {subscription.provider ?? subscription.title}
                </span>
                <span className="mt-1 block text-xs text-foreground/42">
                  {subscription.autopay ? "Autopay" : "Recurring"} ·{" "}
                  {formatDate(subscription.dueAt)}
                </span>
              </span>
              <span className="shrink-0 font-semibold text-foreground/82">
                {formatCurrency(subscription.amount, subscription.currency)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </Panel>
  );
}

function InsightsPanel({ insights }: { insights: InsightPoint[] }) {
  return (
    <Panel title="Insights" description="Signals from spending and household planning.">
      <div className="mt-5 grid gap-3">
        {insights.map((insight) => (
          <Link
            key={insight.key}
            href={insight.href}
            className="group flex gap-3 rounded-2xl border border-border bg-muted/25 p-3 transition-colors hover:bg-muted/50 dark:bg-white/[0.035] dark:hover:bg-white/[0.06]"
          >
            <span
              className={cn(
                "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-2xl",
                insight.severity === "warning" &&
                  "bg-warning/12 text-warning",
                insight.severity === "positive" &&
                  "bg-success/12 text-success",
                insight.severity === "neutral" && "bg-card text-accent",
              )}
            >
              <Lightbulb className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground/86">
                {insight.title}
              </span>
              <span className="mt-1 block text-sm leading-5 text-foreground/45">
                {insight.message}
              </span>
            </span>
            <ArrowRight className="ml-auto size-4 shrink-0 text-foreground/24 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </Panel>
  );
}

function InsightStrip({ insights }: { insights: InsightPoint[] }) {
  const primary = insights[0];

  if (!primary) {
    return null;
  }

  return (
    <Link
      href={primary.href}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card/80 p-4 text-sm transition-colors hover:bg-muted/50 dark:bg-white/[0.04]"
    >
      <Lightbulb className="size-4 shrink-0 text-accent" />
      <span className="min-w-0">
        <span className="block font-semibold text-foreground/86">
          {primary.title}
        </span>
        <span className="mt-1 block truncate text-foreground/45">
          {primary.message}
        </span>
      </span>
      <ArrowRight className="ml-auto size-4 shrink-0 text-foreground/24" />
    </Link>
  );
}

function ProgressBar({
  value,
  className,
  tone = "accent",
}: {
  value: number;
  className?: string;
  tone?: "accent" | "success" | "warning";
}) {
  return (
    <div className={cn("h-2.5 overflow-hidden rounded-full bg-muted", className)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
        transition={{ duration: 0.5 }}
        className={cn(
          "h-full rounded-full",
          tone === "accent" && "bg-accent",
          tone === "success" && "bg-success",
          tone === "warning" && "bg-warning",
        )}
      />
    </div>
  );
}
