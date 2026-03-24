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

function NumberGrid({ max, selected, onToggle, limit }: {
  max: number; selected: string[]; onToggle: (n: string) => void; limit: number
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: max }, (_, i) => {
        const n = String(i + 1).padStart(2, "0")
        const isSelected = selected.includes(n)
        const isFull = selected.length >= limit && !isSelected
        return (
          <button
            key={n}
            onClick={() => !isFull && onToggle(n)}
            className={`w-9 h-9 rounded-full text-sm font-bold transition-all
              ${isSelected
                ? "bg-blue-500 text-white scale-110 shadow-lg shadow-blue-500/30"
                : isFull
                  ? "bg-white/5 text-white/20 cursor-not-allowed"
                  : "bg-white/10 text-white hover:bg-white/20 hover:scale-105"
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
              onClick={() => setActiveSet(i)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border
                ${activeSet === i
                  ? "bg-blue-500 text-white border-blue-400"
                  : valid
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : "bg-white/10 text-white/60 border-white/20"
                }`}
            >
              ชุด {i + 1} {valid ? "✓" : ""}
            </button>
          )
        })}
        <button
          onClick={addSet}
          className="px-3 py-1.5 rounded-full text-sm bg-white/10 text-white/60 border border-white/20 hover:bg-white/20"
        >
          + เพิ่มชุด
        </button>
      </div>

      {/* Main numbers */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-white/80 text-sm">
            เลือก {rule.mainCount} เลข (1-{rule.mainMax})
            <span className="ml-2 text-blue-400 font-mono">
              {current.mainNumbers.length}/{rule.mainCount}
            </span>
          </span>
          <div className="flex gap-2">
            <button onClick={() => quickPick(activeSet)} className="text-xs text-blue-400 hover:text-blue-300">🎲 สุ่ม</button>
            <button onClick={() => clearSet(activeSet)} className="text-xs text-white/40 hover:text-white/60">ล้าง</button>
            {sets.length > 1 && (
              <button onClick={() => removeSet(activeSet)} className="text-xs text-red-400 hover:text-red-300">ลบชุดนี้</button>
            )}
          </div>
        </div>
        <NumberGrid
          max={rule.mainMax}
          selected={current.mainNumbers}
          onToggle={(n) => updateMain(activeSet, n)}
          limit={rule.mainCount}
        />
      </div>

      {/* Special number */}
      <div>
        <div className="text-white/80 text-sm mb-2">
          {rule.specialLabel} (1-{rule.specialMax})
          <span className="ml-2 text-blue-400">{current.specialNumber || "ยังไม่เลือก"}</span>
        </div>
        <NumberGrid
          max={rule.specialMax}
          selected={current.specialNumber ? [current.specialNumber] : []}
          onToggle={(n) => updateSpecial(activeSet, n)}
          limit={1}
        />
      </div>

      {/* Selected display */}
      {current.mainNumbers.length > 0 && (
        <div className="bg-white/5 rounded-lg p-3 font-mono text-white text-center">
          {current.mainNumbers.join(" - ")}
          {current.specialNumber && (
            <span className={`ml-3 ${drawType === "POWERBALL" ? "text-red-400" : "text-blue-400"}`}>
              ● {current.specialNumber}
            </span>
          )}
        </div>
      )}

      {/* Summary + Confirm */}
      <div className="border-t border-white/10 pt-4">
        <div className="flex justify-between text-white/60 text-sm mb-3">
          <span>{sets.length} ใบ × ${pricePerTicket.toFixed(2)}</span>
          <span className="text-white font-semibold">${(sets.length * pricePerTicket).toFixed(2)}</span>
        </div>
        <Button
          onClick={() => allValid && onConfirm(sets)}
          disabled={!allValid}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold disabled:opacity-40"
        >
          {allValid ? "ดำเนินการชำระเงิน →" : `เลือกเลขให้ครบทุกชุดก่อน (${sets.filter(s => s.mainNumbers.length === rule.mainCount && s.specialNumber).length}/${sets.length})`}
        </Button>
      </div>
    </div>
  )
}
