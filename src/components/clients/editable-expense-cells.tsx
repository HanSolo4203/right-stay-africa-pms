"use client"

import { useState } from "react"
import { RotateCcw, Trash2 } from "lucide-react"
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
import { TableCell } from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import {
  expenseLineTotal,
  normalizeStatementExpenseItem,
} from "@/lib/clients/automatic-statement-expenses"
import { lineCharge } from "@/lib/owner-statement/compute"
import { formatMoneyZar } from "@/lib/owner-statement/format-money"
import {
  STATEMENT_EXPENSE_CATEGORY_VALUES,
  type StatementExpenseCategoryValue,
} from "@/lib/validations/statement-expense"
import type { StatementExpenseItem } from "@/types/statement"

const CATEGORY_LABELS: Record<StatementExpenseCategoryValue, string> = {
  CLEANING: "Cleaning",
  MID_STAY_CLEAN: "Mid-stay clean",
  UTILITIES: "Electricity / utilities",
  MAINTENANCE: "Maintenance",
  OTHER: "Other",
}

export function EditableExpenseCells({
  expense,
  disabled,
  showCategoryControls = false,
  onChange,
  onPersist,
  onRemove,
  onReset,
  showReset,
}: {
  expense: StatementExpenseItem
  disabled?: boolean
  showCategoryControls?: boolean
  onChange: (next: StatementExpenseItem) => void
  onPersist?: (next: StatementExpenseItem) => Promise<void>
  onRemove?: () => void
  onReset?: () => void
  showReset?: boolean
}) {
  const [description, setDescription] = useState(expense.description)
  const [qty, setQty] = useState(String(expense.qty))
  const [unitPrice, setUnitPrice] = useState(String(expense.unitPrice))
  const [addTenPercent, setAddTenPercent] = useState(expense.addTenPercent ?? false)
  const [expenseCategory, setExpenseCategory] = useState<StatementExpenseCategoryValue | "">(
    expense.expenseCategory ?? "OTHER"
  )
  const [persisting, setPersisting] = useState(false)

  const buildItem = (): StatementExpenseItem | null => {
    const q = Number(qty)
    const u = Number(unitPrice)
    if (!description.trim()) return null
    if (!Number.isFinite(q) || q < 0 || !Number.isFinite(u) || u < 0) return null
    const base = expenseLineTotal(q, u)
    const total = lineCharge(base, addTenPercent)
    return normalizeStatementExpenseItem({
      id: expense.id,
      description: description.trim(),
      qty: q,
      unitPrice: u,
      isAutomatic: expense.isAutomatic,
      addTenPercent,
      expenseCategory: showCategoryControls ? expenseCategory || "OTHER" : expense.expenseCategory,
    })
  }

  const commit = async () => {
    const next = buildItem()
    if (!next) {
      if (!description.trim()) toast.error("Description is required.")
      setDescription(expense.description)
      setQty(String(expense.qty))
      setUnitPrice(String(expense.unitPrice))
      return
    }
    onChange(next)
    if (onPersist && !expense.isAutomatic) {
      setPersisting(true)
      try {
        await onPersist(next)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save expense.")
      } finally {
        setPersisting(false)
      }
    }
  }

  const previewTotal = (() => {
    const item = buildItem()
    if (!item) return expense.total
    return lineCharge(expenseLineTotal(item.qty, item.unitPrice), item.addTenPercent ?? false)
  })()

  if (disabled) {
    return (
      <>
        <TableCell>{expense.description}</TableCell>
        {showCategoryControls ? (
          <TableCell className="text-sm text-slate-600">
            {expense.expenseCategory ? CATEGORY_LABELS[expense.expenseCategory] : "—"}
          </TableCell>
        ) : null}
        <TableCell className="text-right">{expense.qty}</TableCell>
        <TableCell className="text-right">{formatMoneyZar(expense.unitPrice)}</TableCell>
        {showCategoryControls ? (
          <TableCell className="text-center text-sm">{expense.addTenPercent ? "+10%" : "—"}</TableCell>
        ) : null}
        <TableCell className="text-right font-medium">{formatMoneyZar(expense.total)}</TableCell>
        <TableCell />
      </>
    )
  }

  return (
    <>
      <TableCell>
        <Input
          value={description}
          onChange={(ev) => setDescription(ev.target.value)}
          onBlur={() => void commit()}
          disabled={persisting}
          className="min-w-[160px]"
        />
      </TableCell>
      {showCategoryControls ? (
        <TableCell>
          <Select
            value={expenseCategory || "OTHER"}
            onValueChange={(v) => {
              const cat = v as StatementExpenseCategoryValue
              setExpenseCategory(cat)
              if (cat === "UTILITIES" || cat === "MAINTENANCE") {
                setAddTenPercent(true)
              }
              void commit()
            }}
            disabled={persisting}
          >
            <SelectTrigger className="h-8 min-w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATEMENT_EXPENSE_CATEGORY_VALUES.filter((c) => c !== "CLEANING").map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
      ) : null}
      <TableCell>
        <Input
          type="number"
          min={0}
          step={1}
          className="text-right"
          value={qty}
          onChange={(ev) => setQty(ev.target.value)}
          onBlur={() => void commit()}
          disabled={persisting}
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          step="0.01"
          className="text-right"
          value={unitPrice}
          onChange={(ev) => setUnitPrice(ev.target.value)}
          onBlur={() => void commit()}
          disabled={persisting}
        />
      </TableCell>
      {showCategoryControls ? (
        <TableCell>
          <div className="flex items-center justify-center gap-1.5">
            <input
              id={`svc-${expense.id}`}
              type="checkbox"
              checked={addTenPercent}
              onChange={(ev) => {
                setAddTenPercent(ev.target.checked)
                void commit()
              }}
              disabled={persisting}
              className="size-4 rounded border-slate-300"
            />
            <Label htmlFor={`svc-${expense.id}`} className="text-xs font-normal text-slate-600">
              +10%
            </Label>
          </div>
        </TableCell>
      ) : null}
      <TableCell className="text-right font-medium tabular-nums">{formatMoneyZar(previewTotal)}</TableCell>
      <TableCell>
        <div className="flex justify-end gap-0.5">
          {showReset && onReset ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 text-slate-500"
              title="Reset to CSV / property default"
              onClick={onReset}
              disabled={persisting}
            >
              <RotateCcw className="size-4" />
            </Button>
          ) : null}
          {onRemove ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 text-slate-500 hover:text-red-600"
              onClick={onRemove}
              disabled={persisting}
              title="Remove from statement"
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </div>
      </TableCell>
    </>
  )
}

export function inferExpenseCategoryFromDescription(
  description: string
): StatementExpenseCategoryValue {
  const d = description.toLowerCase()
  if (/mid[\s-]?stay/.test(d)) return "MID_STAY_CLEAN"
  if (/\belectric/i.test(d) || /\butilities?\b/i.test(d)) return "UTILITIES"
  if (/\bmaintenance\b/i.test(d) || /\brepair/i.test(d)) return "MAINTENANCE"
  return "OTHER"
}

export function defaultAddTenPercentForCategory(
  category: StatementExpenseCategoryValue
): boolean {
  return category === "UTILITIES" || category === "MAINTENANCE"
}
