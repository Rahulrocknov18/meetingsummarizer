"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Upload, Loader2, FileAudio, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface UploadZoneProps {
  onUploadComplete: (meetingId: string) => void
}

export function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type.startsWith("audio/")) {
        setFile(droppedFile)
        setTitle(droppedFile.name.replace(/\.[^/.]+$/, ""))
      }
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""))
    }
  }

  const handleUpload = async () => {
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      alert("File is too large. Please compress your audio file to under 10MB before uploading.")
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append("audio", file)
      formData.append("title", title || file.name)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000)

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorText = await response.text()

          let errorMessage = "Failed to upload file. Please try again."
          try {
            const errorJson = JSON.parse(errorText)
            errorMessage = errorJson.error || errorMessage
          } catch {
            errorMessage = errorText || errorMessage
          }

          alert(errorMessage)
          throw new Error(`Upload failed with status ${response.status}`)
        }

        const data = await response.json()

        onUploadComplete(data.meeting.id)

        // Reset form
        setFile(null)
        setTitle("")
      } catch (fetchError: any) {
        clearTimeout(timeoutId)

        if (fetchError.name === "AbortError") {
          alert("Upload timed out. Please try again.")
        } else {
          throw fetchError
        }
      }
    } catch (error) {
      console.error("Upload error:", error)
      if ((error as any).name !== "AbortError") {
        alert("Failed to upload file. Please try again.")
      }
    } finally {
      setUploading(false)
    }
  }

  const isFileTooLarge = !!file && file.size > 10 * 1024 * 1024

  return (
    <Card className="glass-effect p-8 animate-slide-up">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4 animate-pulse-glow">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-balance">Upload Meeting Audio</h2>
          <p className="text-muted-foreground text-pretty">
            Drop your audio file here or click to browse. Supports MP3, WAV, M4A, and more.
          </p>
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-all duration-300 ${
            dragActive ? "border-primary bg-primary/5 scale-105" : "border-border hover:border-primary/50"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {file ? (
            <div className="space-y-4 animate-slide-up">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20">
                <FileAudio className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFile(null)
                  setTitle("")
                }}
              >
                Remove
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-primary hover:text-primary/80 font-medium">Click to upload</span>
                  <span className="text-muted-foreground"> or drag and drop</span>
                </Label>
                <Input id="file-upload" type="file" accept="audio/*" className="hidden" onChange={handleFileChange} />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Meeting Title</Label>
          <Input
            id="title"
            placeholder="e.g., Q4 Planning Meeting"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={uploading}
          />
        </div>

        {isFileTooLarge && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              File is too large ({(file.size / 1024 / 1024).toFixed(2)} MB). Please compress your audio file to under
              10MB before uploading.
            </AlertDescription>
          </Alert>
        )}

        <Button className="w-full" size="lg" onClick={handleUpload} disabled={!file || uploading || isFileTooLarge}>
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload & Process
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}
