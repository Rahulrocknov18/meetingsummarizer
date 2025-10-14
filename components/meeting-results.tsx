"use client"

import { useEffect, useState } from "react"
import { FileText, CheckSquare, Users, Calendar, AlertCircle, Download } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { MeetingWithDetails } from "@/lib/types"

interface MeetingResultsProps {
  meetingId: string
  onNewMeeting: () => void
}

export function MeetingResults({ meetingId, onNewMeeting }: MeetingResultsProps) {
  const [data, setData] = useState<MeetingWithDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/meetings/${meetingId}`)
        const result = await response.json()
        setData({
          ...result.meeting,
          transcript: result.transcript,
          summary: result.summary,
          action_items: result.action_items,
        })
      } catch (error) {
        console.error("Failed to fetch meeting data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [meetingId])

  const downloadReport = () => {
    if (!data) return

    const report = `
MEETING SUMMARY REPORT
======================

Title: ${data.title}
Date: ${new Date(data.created_at).toLocaleDateString()}
Duration: ${data.duration_seconds ? Math.floor(data.duration_seconds / 60) : "N/A"} minutes

SUMMARY
-------
${data.summary?.summary_text || "No summary available"}

KEY DECISIONS
-------------
${data.summary?.key_decisions?.map((d, i) => `${i + 1}. ${d}`).join("\n") || "None"}

PARTICIPANTS
------------
${data.summary?.participants?.join(", ") || "None listed"}

ACTION ITEMS
------------
${
  data.action_items
    ?.map(
      (item, i) => `${i + 1}. ${item.task_description}
   Assignee: ${item.assignee || "Unassigned"}
   Priority: ${item.priority}
   Status: ${item.status}`,
    )
    .join("\n\n") || "None"
}

FULL TRANSCRIPT
---------------
${data.transcript?.full_text || "No transcript available"}
    `.trim()

    const blob = new Blob([report], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `meeting-summary-${data.title.replace(/\s+/g, "-").toLowerCase()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <Card className="glass-effect p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className="glass-effect p-8">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
          <p className="text-muted-foreground">Failed to load meeting data</p>
        </div>
      </Card>
    )
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive"
      case "medium":
        return "default"
      case "low":
        return "secondary"
      default:
        return "default"
    }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <Card className="glass-effect p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-balance">{data.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(data.created_at).toLocaleDateString()}
              </span>
              {data.duration_seconds && <span>{Math.floor(data.duration_seconds / 60)} minutes</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadReport}>
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
            <Button size="sm" onClick={onNewMeeting}>
              New Meeting
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary */}
      {data.summary && (
        <Card className="glass-effect p-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Summary</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed text-pretty">{data.summary.summary_text}</p>

            {data.summary.key_decisions && data.summary.key_decisions.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold">Key Decisions</h3>
                  <ul className="space-y-2">
                    {data.summary.key_decisions.map((decision, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckSquare className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                        <span className="text-muted-foreground">{decision}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {data.summary.participants && data.summary.participants.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Participants
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {data.summary.participants.map((participant, index) => (
                      <Badge key={index} variant="secondary">
                        {participant}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Action Items */}
      {data.action_items && data.action_items.length > 0 && (
        <Card className="glass-effect p-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-accent/10">
                <CheckSquare className="w-5 h-5 text-accent" />
              </div>
              <h2 className="text-xl font-semibold">Action Items</h2>
              <Badge variant="secondary" className="ml-auto">
                {data.action_items.length}
              </Badge>
            </div>

            <div className="space-y-3">
              {data.action_items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <p className="font-medium">{item.task_description}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {item.assignee && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {item.assignee}
                          </span>
                        )}
                        {item.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(item.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant={getPriorityColor(item.priority)}>{item.priority}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Transcript */}
      {data.transcript && (
        <Card className="glass-effect p-6 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-secondary">
                <FileText className="w-5 h-5 text-secondary-foreground" />
              </div>
              <h2 className="text-xl font-semibold">Full Transcript</h2>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 max-h-96 overflow-y-auto">
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-pretty">
                {data.transcript.full_text}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
