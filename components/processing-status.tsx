"use client"

import { useEffect, useState } from "react"
import { Loader2, CheckCircle2, XCircle, FileText, Sparkles, Clock, AlertCircle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface ProcessingStatusProps {
  meetingId: string
  onComplete: () => void
}

export function ProcessingStatus({ meetingId, onComplete }: ProcessingStatusProps) {
  const [status, setStatus] = useState<string>("uploaded")
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [fileSize, setFileSize] = useState<number | null>(null)
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null)
  const [rateLimitInfo, setRateLimitInfo] = useState<{ retryAfter?: string } | null>(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  useEffect(() => {
    let interval: NodeJS.Timeout

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/meetings/${meetingId}`)

        if (!response.ok) {
          console.error("Failed to fetch meeting status:", response.status)
          setError("Failed to fetch meeting status. Please refresh the page.")
          return
        }

        const data = await response.json()

        if (!data.meeting) {
          console.error("Meeting data is missing")
          setError("Meeting not found. Please try uploading again.")
          return
        }

        setStatus(data.meeting.status)

        if (fileSize === null && data.meeting.file_size) {
          setFileSize(data.meeting.file_size)
          // Rough estimate: 1 MB = ~1 minute of audio, processing takes ~20% of audio duration
          const estimatedMinutes = Math.ceil((data.meeting.file_size / (1024 * 1024)) * 0.2)
          setEstimatedTime(`${estimatedMinutes}-${estimatedMinutes + 2} minutes`)
        }

        // Update progress based on status
        if (data.meeting.status === "uploaded") setProgress(10)
        else if (data.meeting.status === "transcribing") {
          setProgress(Math.min(40 + elapsedTime * 0.5, 55))
        } else if (data.meeting.status === "transcribed") setProgress(60)
        else if (data.meeting.status === "summarizing") setProgress(80)
        else if (data.meeting.status === "completed") {
          setProgress(100)
          setTimeout(onComplete, 1000)
        } else if (data.meeting.status === "failed") {
          setError("Processing failed. Please try again.")
        }
      } catch (err) {
        console.error("Status check error:", err)
        setError("Failed to check processing status. Please refresh the page.")
      }
    }

    checkStatus()
    interval = setInterval(checkStatus, 2000)

    return () => clearInterval(interval)
  }, [meetingId, onComplete, elapsedTime, fileSize])

  const startTranscription = async () => {
    try {
      console.log("Starting transcription for meeting:", meetingId)
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId }),
      })

      console.log("Transcription response status:", response.status)
      const data = await response.json()
      console.log("Transcription response data:", data)

      if (!response.ok) {
        if (response.status === 429 && data.code === "RATE_LIMIT_EXCEEDED") {
          setRateLimitInfo({ retryAfter: data.retryAfter })
          setError(data.error)
          return
        }
        throw new Error(data.error || "Transcription failed")
      }

      // Start summarization after transcription
      setTimeout(startSummarization, 1000)
    } catch (err) {
      console.error("Transcription error:", err)
      const errorMessage = err instanceof Error ? err.message : "Transcription failed. Please try again."
      setError(errorMessage)
    }
  }

  const startSummarization = async () => {
    try {
      console.log("Starting summarization for meeting:", meetingId)
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId }),
      })

      console.log("Summarization response status:", response.status)
      const data = await response.json()
      console.log("Summarization response data:", data)

      if (!response.ok) {
        if (response.status === 404) {
          setError("Transcription is still in progress or failed. Please wait a moment.")
          // Retry after a delay
          setTimeout(() => {
            setError(null)
            startSummarization()
          }, 3000)
          return
        }
        throw new Error(data.error || "Summarization failed")
      }
    } catch (err) {
      console.error("Summarization error:", err)
      const errorMessage = err instanceof Error ? err.message : "Summarization failed. Please try again."
      setError(errorMessage)
    }
  }

  useEffect(() => {
    if (status === "uploaded") {
      startTranscription()
    }
  }, [status])

  if (error) {
    return (
      <Card className="glass-effect p-8 animate-slide-up">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
            {rateLimitInfo ? (
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            ) : (
              <XCircle className="w-8 h-8 text-destructive" />
            )}
          </div>
          <div>
            <h3 className="text-xl font-semibold">{rateLimitInfo ? "Rate Limit Reached" : "Processing Failed"}</h3>
            <p className="text-muted-foreground mt-2">{error}</p>
            {rateLimitInfo && (
              <Alert className="mt-4 text-left">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>What can you do?</AlertTitle>
                <AlertDescription className="space-y-2 mt-2">
                  <p>1. Wait {rateLimitInfo.retryAfter} and try again</p>
                  <p>2. Upgrade your Groq account at console.groq.com/settings/billing</p>
                  <p>3. Use shorter audio files (under 10 minutes) to stay within limits</p>
                </AlertDescription>
              </Alert>
            )}
          </div>
          <Button onClick={() => window.location.reload()}>{rateLimitInfo ? "Try Again Later" : "Try Again"}</Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="glass-effect p-8 animate-slide-up">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4 animate-pulse-glow">
            {status === "completed" ? (
              <CheckCircle2 className="w-8 h-8 text-primary" />
            ) : (
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            )}
          </div>
          <h2 className="text-2xl font-bold">
            {status === "uploaded" && "Preparing..."}
            {status === "transcribing" && "Transcribing Audio"}
            {status === "transcribed" && "Transcription Complete"}
            {status === "summarizing" && "Generating Summary"}
            {status === "completed" && "All Done!"}
          </h2>
          <p className="text-muted-foreground">
            {status === "uploaded" && "Getting ready to process your meeting"}
            {status === "transcribing" &&
              "Converting speech to text using AI (this may take several minutes for large files)"}
            {status === "transcribed" && "Preparing to analyze content"}
            {status === "summarizing" && "Extracting insights and action items"}
            {status === "completed" && "Your meeting has been fully processed"}
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mt-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Elapsed: {formatTime(elapsedTime)}</span>
            </div>
            {estimatedTime && status === "transcribing" && (
              <div className="text-xs">
                <span>Est. total: {estimatedTime}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-center text-muted-foreground">{Math.round(progress)}% complete</p>
        </div>

        {fileSize && fileSize > 50 * 1024 * 1024 && status === "transcribing" && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm text-blue-400">
            <p className="font-medium">Processing large file ({(fileSize / (1024 * 1024)).toFixed(1)} MB)</p>
            <p className="text-xs mt-1 opacity-80">
              Large audio files take longer to process. Feel free to leave this page - we'll save your results!
            </p>
          </div>
        )}

        <div className="space-y-3">
          <div
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
              ["transcribing", "transcribed", "summarizing", "completed"].includes(status)
                ? "bg-primary/10 text-primary"
                : "bg-muted/50 text-muted-foreground"
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="font-medium">Transcription</span>
            {["transcribed", "summarizing", "completed"].includes(status) && (
              <CheckCircle2 className="w-5 h-5 ml-auto" />
            )}
          </div>

          <div
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
              ["summarizing", "completed"].includes(status)
                ? "bg-accent/10 text-accent"
                : "bg-muted/50 text-muted-foreground"
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="font-medium">AI Analysis</span>
            {status === "completed" && <CheckCircle2 className="w-5 h-5 ml-auto" />}
          </div>
        </div>
      </div>
    </Card>
  )
}
