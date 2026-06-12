"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LOTTERY_RULES, DrawType } from "@/lib/lottery-rules"

async function smartPick(
  type: DrawType,
): Promise<{ mainNumbers: string[]; specialNumber: string } | null> {
  try {
    const res = await fetch(`/api/smart-pick?type=${type}&count=1`)
    if (!res.ok) return null
    const data = await res.json()
    return data.sets?.[0] ?? null
  } catch {
    return null
  }
}

interface NumberSet {
  mainNumbers: string[]
  specialNumber: string
}

interface Props {
  drawType: DrawType
  onConfirm: (sets: NumberSet[]) => void
  confirmLabel?: string
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
                  ? "cursor-not-allowed border-white/5 bg-white/5 text-white/20"
                  : "border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10"
              }`}
          >
            {n}
          </button>
        )
      })}
    </div>
  )
}

export function NumberPicker({ drawType, onConfirm, confirmLabel = "ตรวจสอบรายการต่อ" }: Props) {
  const rule = LOTTERY_RULES[drawType]
  const specialLabel = drawType === "POWERBALL" ? "พาวเวอร์บอล" : "เมก้าบอล"
  const specialSelectedClass =
    drawType === "POWERBALL"
      ? "border-rose-500 bg-rose-500 text-white"
      : "border-sky-500 bg-sky-500 text-white"
  const [sets, setSets] = useState<NumberSet[]>([{ mainNumbers: [], specialNumber: "" }])
  const [activeSet, setActiveSet] = useState(0)
  const [aiLoading, setAiLoading] = useState(false)

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

  async function aiPick(setIdx: number) {
    setAiLoading(true)
    const result = await smartPick(drawType)
    setAiLoading(false)
    if (!result) {
      quickPick(setIdx)
      return
    }
    setSets((prev) => prev.map((s, i) =>
      i === setIdx ? result : s
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
                  ? "border-[#c9a84c] bg-[#c9a84c] text-black"
                  : valid
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    : "border-white/15 bg-white/5 text-white/50"
                }`}
            >
              ชุด {i + 1} {valid ? "✓" : ""}
            </button>
          )
        })}
        <button
          type="button"
          onClick={addSet}
          className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/50 transition hover:border-white/30 hover:text-white"
        >
          + เพิ่มชุด
        </button>
      </div>

      {/* Main numbers */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-white/60">
            เลือก {rule.mainCount} เลข (1-{rule.mainMax})
            <span className="ml-2 font-mono text-[#c9a84c]">
              {current.mainNumbers.length}/{rule.mainCount}
            </span>
          </span>
          <div className="flex gap-3 items-center">
            <button
              type="button"
              onClick={() => aiPick(activeSet)}
              disabled={aiLoading}
              className="flex items-center gap-1 text-xs font-medium text-violet-400 hover:text-violet-300 disabled:opacity-50"
              title="เลือกเลขโดยใช้สถิติผลรางวัลที่ผ่านมา"
            >
              {aiLoading ? (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border border-violet-400 border-t-transparent" />
              ) : (
                <span>✦</span>
              )}
              AI เลือก
            </button>
            <button
              type="button"
              onClick={() => quickPick(activeSet)}
              className="text-xs font-medium text-[#c9a84c] hover:text-[#d4b860]"
            >
              สุ่มเลข
            </button>
            <button
              type="button"
              onClick={() => clearSet(activeSet)}
              className="text-xs text-white/40 hover:text-white/70"
            >
              ล้าง
            </button>
            {sets.length > 1 && (
              <button
                type="button"
                onClick={() => removeSet(activeSet)}
                className="text-xs text-rose-400 hover:text-rose-300"
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
          selectedClass="border-[#c9a84c] bg-[#c9a84c] text-black"
        />
      </div>

      {/* Special number */}
      <div>
        <div className="mb-2 text-sm text-white/60">
          {specialLabel} (1-{rule.specialMax})
          <span className="ml-2 font-medium text-white">{current.specialNumber || "ยังไม่เลือก"}</span>
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
        <div className="rounded-2xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 p-3 text-center font-mono text-white">
          {current.mainNumbers.join(" - ")}
          {current.specialNumber && (
            <span className={`ml-3 font-semibold ${drawType === "POWERBALL" ? "text-rose-400" : "text-sky-400"}`}>
              ● {current.specialNumber}
            </span>
          )}
        </div>
      )}

      {/* AI disclaimer + stats link */}
      <p className="text-center text-[10px] text-white/25">
        ✦ AI เลือก ใช้สถิติความถี่จากผลรางวัลที่ผ่านมา — ไม่ได้รับประกันโชค ลอตเตอรีคือความน่าจะเป็น
        {" ·"}{" "}
        <Link href="/stats" className="underline hover:text-white/50">
          ดูสถิติ %
        </Link>
      </p>

      {/* Summary + Confirm */}
      <div className="border-t border-white/10 pt-4">
        <div className="mb-3 flex justify-between text-sm text-white/50">
          <span>{sets.length} ใบ × ${pricePerTicket.toFixed(2)}</span>
          <span className="font-semibold text-[#c9a84c]">${(sets.length * pricePerTicket).toFixed(2)}</span>
        </div>
        <Button
          onClick={() => allValid && onConfirm(sets)}
          disabled={!allValid}
          className="h-11 w-full rounded-xl bg-[#c9a84c] font-semibold text-black hover:bg-[#d4b860] disabled:opacity-40"
        >
          {allValid
            ? confirmLabel
            : `เลือกเลขให้ครบทุกชุดก่อน (${sets.filter((s) => s.mainNumbers.length === rule.mainCount && s.specialNumber).length}/${sets.length})`}
        </Button>
      </div>
    </div>
  )
}
