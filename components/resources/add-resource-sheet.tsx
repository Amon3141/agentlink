"use client"

import {
  CalendarClockIcon,
  ChevronLeftIcon,
  LockIcon,
  NotebookPenIcon,
} from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"

import {
  AvailabilityPolicyForm,
  ShortNoteResourceForm,
  SharingRulesForm,
  SoftHoldCalendarForm,
} from "@/components/resources/resource-forms"
import type { Resource } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export type AddResourceKind = "availability_policy" | "mock" | "sharing_rules"

const kinds: {
  id: AddResourceKind
  title: string
  description: string
  icon: ReactNode
}[] = [
  {
    id: "availability_policy",
    title: "Availability policy",
    description: "Preferred days, buffers, focus time, and scheduling notes.",
    icon: <CalendarClockIcon className="size-6" aria-hidden />,
  },
  {
    id: "mock",
    title: "Short note",
    description: "Freeform text context your agents can summarize.",
    icon: <NotebookPenIcon className="size-6" aria-hidden />,
  },
  {
    id: "sharing_rules",
    title: "Sharing rules",
    description: "Privacy boundaries for what agents may reveal.",
    icon: <LockIcon className="size-6" aria-hidden />,
  },
]

function formForKind(kind: AddResourceKind) {
  switch (kind) {
    case "availability_policy":
      return <AvailabilityPolicyForm />
    case "mock":
      return <ShortNoteResourceForm />
    case "sharing_rules":
      return <SharingRulesForm />
    default:
      return null
  }
}

export function AddResourceSheetContent({
  open,
  editMockResource,
  editSoftHoldResource,
  onClearEdit,
}: {
  open: boolean
  editMockResource?: Resource | null
  editSoftHoldResource?: Resource | null
  onClearEdit?: () => void
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [kind, setKind] = useState<AddResourceKind | null>(null)

  const editingMock = editMockResource?.type === "mock"
  const editingSoftHold = editSoftHoldResource?.type === "soft_hold_calendar"

  useEffect(() => {
    if (!open) {
      setStep(1)
      setKind(null)
      return
    }
    if (editingMock) {
      setStep(2)
      setKind("mock")
      return
    }
    if (editingSoftHold) {
      setStep(2)
      setKind(null)
    }
  }, [open, editingMock, editingSoftHold, editMockResource?.id, editSoftHoldResource?.id])

  const title = editingMock
    ? "Edit short note"
    : editingSoftHold
      ? "Edit calendar"
      : step === 1
        ? "Add new resource"
        : kinds.find((k) => k.id === kind)?.title

  return (
    <>
      <SheetHeader>
        <SheetTitle>{title}</SheetTitle>
        <SheetDescription>
          {step === 1 && !editingMock && !editingSoftHold
            ? "Choose a type, then fill in only the details you need."
            : "First-party resources define what your agents may use and summarize."}
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-4 px-4 pb-4">
        {step === 1 && !editingMock && !editingSoftHold ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {kinds.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setKind(item.id)
                  setStep(2)
                }}
                className={cn(
                  "sketch-border flex flex-col gap-2 rounded-2xl border bg-card/90 p-4 text-left transition hover:bg-card",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                )}
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-muted/50">
                  {item.icon}
                </span>
                <span className="text-sm font-medium">{item.title}</span>
                <span className="text-xs text-muted-foreground">{item.description}</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2 w-fit gap-1"
              onClick={() => {
                if (editingMock || editingSoftHold) {
                  onClearEdit?.()
                }
                setStep(1)
                setKind(null)
              }}
            >
              <ChevronLeftIcon className="size-4" aria-hidden />
              Back
            </Button>
            {editingMock ? (
              <ShortNoteResourceForm resource={editMockResource} />
            ) : editingSoftHold && editSoftHoldResource ? (
              <SoftHoldCalendarForm resource={editSoftHoldResource} />
            ) : kind ? (
              formForKind(kind)
            ) : null}
          </>
        )}
      </div>
    </>
  )
}
