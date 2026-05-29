"use client"

import { useState } from "react"
import { Loader2, Trash2 } from "lucide-react"
import {
  defaultAddTenPercentForCategory,
  EditableExpenseCells,
  inferExpenseCategoryFromDescription,
} from "@/components/clients/editable-expense-cells"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { lineCharge } from "@/lib/owner-statement/compute"
import { formatMoneyZar } from "@/lib/owner-statement/format-money"
import {
  STATEMENT_EXPENSE_CATEGORY_VALUES,
  type StatementExpenseCategoryValue,
} from "@/lib/validations/statement-expense"
import type { StatementExpenseItem } from "@/types/statement"

const EXPENSE_PRESETS = [
  "Maintenance",
  "Repairs",
  "Electricity",
  "Rates & taxes",
  "Insurance",
] as const

type CreatedExpenseResponse = {
  expense: StatementExpenseItem & {
    addTenPercent?: boolean
    expenseCategory?: string | null
  }
}

type StatementAdditionalExpensesProps = {
  clientId: string
  propertyId: string
  month: number
  year: number
  manualExpenses: StatementExpenseItem[]
  automaticExpenses: StatementExpenseItem[]
  defaultAutomaticExpenses: StatementExpenseItem[]
  welcomePackFeePerBooking: number
  midStayCleanFee: number
  selectedBookingCount: number
  disabled?: boolean
  onManualExpenseAdded: (expense: StatementExpenseItem) => void
  onManualExpenseUpdated: (expense: StatementExpenseItem) => void
  onManualExpenseRemoved: (expenseId: string) => void
  onAutomaticExpenseChange: (expense: StatementExpenseItem) => void
  onAutomaticExpenseRemove: (expenseId: string) => void
}

export function StatementAdditionalExpenses({
  clientId,
  propertyId,
  month,
  year,
  manualExpenses,
  automaticExpenses,
  defaultAutomaticExpenses,
  welcomePackFeePerBooking,
  midStayCleanFee,
  selectedBookingCount,
  disabled,
  onManualExpenseAdded,
  onManualExpenseUpdated,
  onManualExpenseRemoved,
  onAutomaticExpenseChange,
  onAutomaticExpenseRemove,
}: StatementAdditionalExpensesProps) {
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [description, setDescription] = useState("")
  const [qty, setQty] = useState("1")
  const [unitPrice, setUnitPrice] = useState("")
  const [addTenPercent, setAddTenPercent] = useState(false)
  const [expenseCategory, setExpenseCategory] = useState<StatementExpenseCategoryValue>("OTHER")

  const defaultById = new Map(defaultAutomaticExpenses.map((e) => [e.id, e]))

  const computedTotal = (() => {
    const q = Number(qty)
    const u = Number(unitPrice)
    if (!Number.isFinite(q) || !Number.isFinite(u) || q < 1 || u <= 0) return 0
    const base = Math.round(q * u * 100) / 100
    return lineCharge(base, addTenPercent)
  })()

  const resetForm = () => {
    setAdding(false)
    setDescription("")
    setQty("1")
    setUnitPrice("")
    setAddTenPercent(false)
    setExpenseCategory("OTHER")
  }

  const persistManualExpense = async (expense: StatementExpenseItem) => {
    const res = await fetch(`/api/clients/statements/expenses/${expense.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: expense.description,
        qty: expense.qty,
        unitPrice: expense.unitPrice,
        addTenPercent: expense.addTenPercent ?? false,
        expenseCategory: expense.expenseCategory ?? "OTHER",
      }),
    })
    const data = (await res.json()) as CreatedExpenseResponse & { error?: string }
    if (!res.ok || !data.expense) {
      throw new Error(data.error ?? "Failed to update expense.")
    }
    onManualExpenseUpdated({
      id: data.expense.id,
      description: data.expense.description,
      qty: data.expense.qty,
      unitPrice: data.expense.unitPrice,
      total: data.expense.total,
      addTenPercent: data.expense.addTenPercent ?? false,
      expenseCategory: (data.expense.expenseCategory as StatementExpenseCategoryValue | null) ?? null,
    })
  }

  const applyPreset = (label: string) => {
    const category = inferExpenseCategoryFromDescription(label)
    setDescription(label)
    setExpenseCategory(category)
    setAddTenPercent(defaultAddTenPercentForCategory(category))
  }

  const addExpense = async () => {
    const q = Number(qty)
    const u = Number(unitPrice)
    if (!description.trim()) {
      toast.error("Description is required.")
      return
    }
    if (!Number.isFinite(q) || q < 1) {
      toast.error("Quantity must be at least 1.")
      return
    }
    if (!Number.isFinite(u) || u <= 0) {
      toast.error("Unit price must be positive.")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/clients/statements/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          propertyId,
          month,
          year,
          description: description.trim(),
          qty: q,
          unitPrice: u,
          addTenPercent,
          expenseCategory,
        }),
      })
      const data = (await res.json()) as CreatedExpenseResponse & { error?: string }
      if (!res.ok) {
        toast.error(data.error ?? "Failed to add expense.")
        return
      }
      if (!data.expense) {
        toast.error("Expense saved but response was invalid.")
        return
      }
      onManualExpenseAdded({
        id: data.expense.id,
        description: data.expense.description,
        qty: data.expense.qty,
        unitPrice: data.expense.unitPrice,
        total: data.expense.total,
        addTenPercent: data.expense.addTenPercent ?? false,
        expenseCategory: (data.expense.expenseCategory as StatementExpenseCategoryValue | null) ?? null,
      })
      toast.success("Expense added.")
      resetForm()
    } catch {
      toast.error("Failed to add expense.")
    } finally {
      setSaving(false)
    }
  }

  const deleteExpense = async (id: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/statements/expenses/${id}`, { method: "DELETE" })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        toast.error(data.error ?? "Failed to delete expense.")
        return
      }
      onManualExpenseRemoved(id)
      toast.success("Expense removed.")
    } catch {
      toast.error("Failed to delete expense.")
    } finally {
      setSaving(false)
    }
  }

  const autoTotal = automaticExpenses.reduce((s, e) => s + e.total, 0)
  const manualTotal = manualExpenses.reduce((s, e) => s + e.total, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          Only expenses for bookings ticked in step 2. Edit amounts below; totals feed into the summary above.
        </p>
        {!disabled && !adding ? (
          <Button type="button" size="sm" variant="outline" onClick={() => setAdding(true)}>
            Add expense
          </Button>
        ) : null}
      </div>
      {disabled ? (
        <p className="text-sm text-slate-500">
          Assign a client to this property before recording additional expenses.
        </p>
      ) : null}

      {selectedBookingCount === 0 ? (
        <p className="rounded-lg border border-dashed border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          Select at least one booking in step 2 to show automatic cleaning and welcome pack lines.
        </p>
      ) : null}

      {automaticExpenses.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Automatic ({selectedBookingCount} selected booking
            {selectedBookingCount === 1 ? "" : "s"})
          </p>
          <p className="text-xs text-slate-500">
            CSV cleaning fees per included stay, plus mid-stay and manual cleans from the
            cleaning schedule for this month — all editable before you save or generate.
            {welcomePackFeePerBooking > 0
              ? ` Welcome pack: ${formatMoneyZar(welcomePackFeePerBooking)} per included booking (default).`
              : ""}
            {midStayCleanFee > 0
              ? ` Mid-stay / manual cleans: ${formatMoneyZar(midStayCleanFee)} each (property default).`
              : ""}
          </p>
          <div className="overflow-x-auto rounded-lg border border-slate-100 bg-slate-50/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {automaticExpenses.map((e) => (
                  <TableRow key={e.id}>
                    <EditableExpenseCells
                      key={`${e.id}-${e.qty}-${e.unitPrice}-${e.description}`}
                      expense={e}
                      disabled={disabled}
                      showReset={defaultById.has(e.id)}
                      onChange={onAutomaticExpenseChange}
                      onReset={() => {
                        const def = defaultById.get(e.id)
                        if (def) onAutomaticExpenseChange(def)
                      }}
                      onRemove={() => onAutomaticExpenseRemove(e.id)}
                    />
                  </TableRow>
                ))}
                <TableRow className="font-medium">
                  <TableCell colSpan={3}>Automatic expenses total</TableCell>
                  <TableCell className="text-right">{formatMoneyZar(autoTotal)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      ) : selectedBookingCount > 0 && welcomePackFeePerBooking > 0 ? (
        <p className="text-sm text-slate-500">No automatic lines for the current selection.</p>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
          Manual (maintenance, repairs, electricity, etc.)
        </p>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead className="text-center">Service fee</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {manualExpenses.map((e) => (
                <TableRow key={e.id}>
                  <EditableExpenseCells
                    expense={e}
                    disabled={disabled}
                    showCategoryControls
                    onChange={onManualExpenseUpdated}
                    onPersist={disabled ? undefined : persistManualExpense}
                    onRemove={
                      disabled ? undefined : () => void deleteExpense(e.id)
                    }
                  />
                </TableRow>
              ))}
              {adding ? (
                <TableRow>
                  <TableCell>
                    <div className="space-y-2">
                      <Input
                        placeholder="Description"
                        value={description}
                        onChange={(ev) => setDescription(ev.target.value)}
                      />
                      <div className="flex flex-wrap gap-1">
                        {EXPENSE_PRESETS.map((label) => (
                          <Button
                            key={label}
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => applyPreset(label)}
                          >
                            {label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={expenseCategory}
                      onValueChange={(v) => {
                        const cat = v as StatementExpenseCategoryValue
                        setExpenseCategory(cat)
                        setAddTenPercent(defaultAddTenPercentForCategory(cat))
                      }}
                    >
                      <SelectTrigger className="h-8 min-w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATEMENT_EXPENSE_CATEGORY_VALUES.filter((c) => c !== "CLEANING").map(
                          (c) => (
                            <SelectItem key={c} value={c}>
                              {c === "UTILITIES"
                                ? "Electricity / utilities"
                                : c === "MID_STAY_CLEAN"
                                  ? "Mid-stay clean"
                                  : c.charAt(0) + c.slice(1).toLowerCase().replace(/_/g, " ")}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      className="text-right"
                      value={qty}
                      onChange={(ev) => setQty(ev.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="text-right"
                      placeholder="ZAR"
                      value={unitPrice}
                      onChange={(ev) => setUnitPrice(ev.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1.5">
                      <input
                        id="new-expense-svc"
                        type="checkbox"
                        checked={addTenPercent}
                        onChange={(ev) => setAddTenPercent(ev.target.checked)}
                        className="size-4 rounded border-slate-300"
                      />
                      <Label htmlFor="new-expense-svc" className="text-xs font-normal">
                        +10%
                      </Label>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-slate-600">
                    {formatMoneyZar(computedTotal)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              ) : null}
              {manualExpenses.length === 0 && !adding ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-slate-500">
                    No manual expenses for this period.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
        {manualExpenses.length > 0 ? (
          <p className="text-right text-sm font-medium text-slate-700">
            Manual total: {formatMoneyZar(manualTotal)}
          </p>
        ) : null}
      </div>

      {adding ? (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            className="bg-emerald-700 hover:bg-emerald-800"
            disabled={saving}
            onClick={() => void addExpense()}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Add
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={saving} onClick={resetForm}>
            Cancel
          </Button>
        </div>
      ) : null}
    </div>
  )
}
