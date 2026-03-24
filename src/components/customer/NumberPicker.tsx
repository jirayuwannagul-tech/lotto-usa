"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { LOTTERY_RULES, DrawType } from "@/lib/lottery-rules"

interface NumberSet {
  mainNumbers: string[]
  specialNumber: string
}

interface Props {
  drawType: DrawType
  onConfirm: (sets: NumberSet[]) => void
}

function randomPick(max: number, count: number): string[] {
  const pool = Array.from({ length: max }, (_, i) => String(i + 1).padStart(2, "0"))
  const picked: string[] = []
  while (picked.length < count) {
    const idx = Math.floor(Math.random() * pool.length)
    picked.push(pool.splice(idx, 1)[0])
  }
  return picked.sort()
}

function NumberGrid({
  max,
  selected,
  onToggle,
  limit,
  selectedClass,
}: {
  max: number
  selected: string[]
  onToggle: (n: string) => void
  limit: number
  selectedClass: string
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: max }, (_, i) => {
        const n = String(i + 1).padStart(2, "0")
        const isSelected = selected.includes(n)
        const isFull = selected.length >= limit && !isSelected
        return (
          <button
            key={n}
            type="button"
            onClick={() => !isFull && onToggle(n)}
            className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition
              ${isSelected
                ? selectedClass
                : isFull
                  ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
          >
            {n}
          </button>
        )
      })}
    </div>
  )
}

export function NumberPicker({ drawType, onConfirm }: Props) {
  const rule = LOTTERY_RULES[drawType]
  const specialLabel = drawType === "POWERBALL" ? "พาวเวอร์บอล" : "เมก้าบอล"
  const specialSelectedClass =
    drawType === "POWERBALL"
      ? "border-rose-500 bg-rose-500 text-white"
      : "border-sky-500 bg-sky-500 text-white"
  const [sets, setSets] = useState<NumberSet[]>([{ mainNumbers: [], specialNumber: "" }])
  const [activeSet, setActiveSet] = useState(0)

  function updateMain(setIdx: number, n: string) {
    setSets((prev) => prev.map((s, i) => {
      if (i !== setIdx) return s
      const has = s.mainNumbers.includes(n)
      return {
        ...s,
        mainNumbers: has ? s.mainNumbers.filter((x) => x !== n) : [...s.mainNumbers, n].sort(),
      }
    }))
  }

  function updateSpecial(setIdx: number, n: string) {
    setSets((prev) => prev.map((s, i) =>
      i === setIdx ? { ...s, specialNumber: s.specialNumber === n ? "" : n } : s
    ))
  }

  function quickPick(setIdx: number) {
    const main = randomPick(rule.mainMax, rule.mainCount)
    const special = randomPick(rule.specialMax, 1)[0]
    setSets((prev) => prev.map((s, i) =>
      i === setIdx ? { mainNumbers: main, specialNumber: special } : s
    ))
  }

  function clearSet(setIdx: number) {
    setSets((prev) => prev.map((s, i) =>
      i === setIdx ? { mainNumbers: [], specialNumber: "" } : s
    ))
  }

  function addSet() {
    setSets((prev) => [...prev, { mainNumbers: [], specialNumber: "" }])
    setActiveSet(sets.length)
  }

  function removeSet(setIdx: number) {
    if (sets.length === 1) return
    setSets((prev) => prev.filter((_, i) => i !== setIdx))
    setActiveSet(Math.max(0, activeSet - 1))
  }

  const current = sets[activeSet]
  const allValid = sets.every(
    (s) => s.mainNumbers.length === rule.mainCount && s.specialNumber !== ""
  )

  const pricePerTicket = rule.priceUSD + 1.5

  return (
    <div className="space-y-4">
      {/* Set tabs */}
      <div className="flex gap-2 flex-wrap">
        {sets.map((s, i) => {
          const valid = s.mainNumbers.length === rule.mainCount && s.specialNumber !== ""
          return (
            <button
              key={i}
              type="button"
              onClick={() => setActiveSet(i)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition
                ${activeSet === i
                  ? "border-slate-950 bg-slate-950 text-white"
                  : valid
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-500"
                }`}
            >
              ชุด {i + 1} {valid ? "✓" : ""}
            </button>
          )
        })}
        <button
          type="button"
          onClick={addSet}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
        >
          + เพิ่มชุด
        </button>
      </div>

      {/* Main numbers */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-slate-700">
            เลือก {rule.mainCount} เลข (1-{rule.mainMax})
            <span className="ml-2 font-mono text-emerald-600">
              {current.mainNumbers.length}/{rule.mainCount}
            </span>
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => quickPick(activeSet)}
              className="text-xs font-medium text-emerald-600 hover:text-emerald-500"
            >
              สุ่มเลข
            </button>
            <button
              type="button"
              onClick={() => clearSet(activeSet)}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              ล้าง
            </button>
            {sets.length > 1 && (
              <button
                type="button"
                onClick={() => removeSet(activeSet)}
                className="text-xs text-rose-600 hover:text-rose-500"
              >
                ลบชุดนี้
              </button>
            )}
          </div>
        </div>
        <NumberGrid
          max={rule.mainMax}
          selected={current.mainNumbers}
          onToggle={(n) => updateMain(activeSet, n)}
          limit={rule.mainCount}
          selectedClass="border-emerald-500 bg-emerald-500 text-white"
        />
      </div>

      {/* Special number */}
      <div>
        <div className="mb-2 text-sm text-slate-700">
          {specialLabel} (1-{rule.specialMax})
          <span className="ml-2 font-medium text-slate-950">{current.specialNumber || "ยังไม่เลือก"}</span>
        </div>
        <NumberGrid
          max={rule.specialMax}
          selected={current.specialNumber ? [current.specialNumber] : []}
          onToggle={(n) => updateSpecial(activeSet, n)}
          limit={1}
          selectedClass={specialSelectedClass}
        />
      </div>

      {/* Selected display */}
      {current.mainNumbers.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center font-mono text-slate-900">
          {current.mainNumbers.join(" - ")}
          {current.specialNumber && (
            <span className={`ml-3 font-semibold ${drawType === "POWERBALL" ? "text-rose-600" : "text-sky-600"}`}>
              ● {current.specialNumber}
            </span>
          )}
        </div>
      )}

      {/* Summary + Confirm */}
      <div className="border-t border-slate-200 pt-4">
        <div className="mb-3 flex justify-between text-sm text-slate-600">
          <span>{sets.length} ใบ × ${pricePerTicket.toFixed(2)}</span>
          <span className="font-semibold text-slate-950">${(sets.length * pricePerTicket).toFixed(2)}</span>
        </div>
        <Button
          onClick={() => allValid && onConfirm(sets)}
          disabled={!allValid}
          className="h-11 w-full rounded-xl bg-emerald-600 font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
        >
          {allValid
            ? "ตรวจสอบรายการต่อ"
            : `เลือกเลขให้ครบทุกชุดก่อน (${sets.filter((s) => s.mainNumbers.length === rule.mainCount && s.specialNumber).length}/${sets.length})`}
        </Button>
      </div>
    </div>
  )
}
