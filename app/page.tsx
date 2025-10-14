"use client"

import { useState } from "react"
import { UploadZone } from "@/components/upload-zone"
import { ProcessingStatus } from "@/components/processing-status"
import { MeetingResults } from "@/components/meeting-results"
import { Sparkles } from "lucide-react"
import { FileText } from "lucide-react"
import { CheckSquare } from "lucide-react"

export default function Home() {
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null)
  const [processingComplete, setProcessingComplete] = useState(false)

  const handleUploadComplete = (meetingId: string) => {
    setCurrentMeetingId(meetingId)
    setProcessingComplete(false)
  }

  const handleProcessingComplete = () => {
    setProcessingComplete(true)
  }

  const handleNewMeeting = () => {
    setCurrentMeetingId(null)
    setProcessingComplete(false)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            AI-Powered Meeting Intelligence
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient">
            Meeting Summarizer
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
            Transform your meeting recordings into actionable insights with AI-powered transcription and analysis
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {!currentMeetingId && <UploadZone onUploadComplete={handleUploadComplete} />}

          {currentMeetingId && !processingComplete && (
            <ProcessingStatus meetingId={currentMeetingId} onComplete={handleProcessingComplete} />
          )}

          {currentMeetingId && processingComplete && (
            <MeetingResults meetingId={currentMeetingId} onNewMeeting={handleNewMeeting} />
          )}
        </div>

        {/* Features */}
        {!currentMeetingId && (
          <div className="mt-20 grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            

            

            
          </div>
        )}
      </div>
    </div>
  )
}
