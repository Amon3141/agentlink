"use client"

import {
  BriefcaseIcon,
  CalendarClockIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  LockIcon,
  NotebookPenIcon,
} from "lucide-react"
import { useEffect, useState } from "react"

import {
  AvailabilityPolicyForm,
  MockResourceForm,
  ProjectBriefForm,
  SharingRulesForm,
  SoftHoldCalendarForm,
} from "@/components/resources/resource-forms"
import { Button } from "@/components/ui/button"
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export type AddResourceKind =
  | "availability_policy"
  | "soft_hold_calendar"
  | "mock"
  | "sharing_rules"
  | "project_brief"

const kinds: {
  id: AddResourceKind
  title: string
  description: string
  icon: React.ReactNode
}[] = [
  {
    id: "availability_policy",
    title: "Availability policy",
    description: "Preferred days, buffers, focus time, and scheduling notes.",
    icon: <CalendarClockIcon className="size-6" aria-hidden />,
  },
  {
    id: "soft_hold_calendar",
    title: "Soft hold calendar",
    description: "Internal tentative holds before writing to Google Calendar.",
    icon: <CalendarDaysIcon className="size-6" aria-hidden />,
  },
  {
    id: "mock",
    title: "Mock resource",
    description: "Freeform text context for quick demos and manual notes.",
    icon: <NotebookPenIcon className="size-6" aria-hidden />,
  },
  {
    id: "sharing_rules",
    title: "Sharing rules",
    description: "Privacy boundaries for what agents may reveal.",
    icon: <LockIcon className="size-6" aria-hidden />,
  },
  {
    id: "project_brief",
    title: "Project brief",
    description: "Goals, status, constraints, and what the agent may say.",
    icon: <BriefcaseIcon className="size-6" aria-hidden />,
  },
]

function formForKind(kind: AddResourceKind) {
  switch (kind) {
    case "availability_policy":
      return <AvailabilityPolicyForm />
    case "soft_hold_calendar":
      return <SoftHoldCalendarForm />
    case "mock":
      return <MockResourceForm />
    case "sharing_rules":
      return <SharingRulesForm />
    case "project_brief":
      return <ProjectBriefForm />
    default:
      return null
  }
}

export function AddResourceSheetContent({ open }: { open: boolean }) {
  const [step, setStep] = useState<1 | 2>(1)
  const [kind, setKind] = useState<AddResourceKind | null>(null)

  useEffect(() => {
    if (!open) {
      setStep(1)
      setKind(null)
    }
  }, [open])

  return (
    <>
      <SheetHeader>
        <SheetTitle>{step === 1 ? "Add new resource" : kinds.find((k) => k.id === kind)?.title}</SheetTitle>
        <SheetDescription>
          {step === 1
            ? "Choose a type, then fill in only the details you need."
            : "First-party resources define what your agents may use and summarize."}
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-4 px-4 pb-4">
        {step === 1 ? (
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
                setStep(1)
                setKind(null)
              }}
            >
              <ChevronLeftIcon className="size-4" aria-hidden />
              Back
            </Button>
            {kind ? formForKind(kind) : null}
          </>
        )}
      </div>
    </>
  )
}
