"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { UploadDropzone } from "./upload-dropzone";
import { Button } from "@/components/ui/button";
import { LogOut, RefreshCw, CheckCircle, XCircle, Clock, ChevronRight, FileText, Trash2 } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { DeleteDocumentButton } from "@/components/features/documents/delete-document-button";

interface JobStatus {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  message?: string;
  documentId?: string;
}

interface Document {
  id: string;
  title: string;
  status: string;
  mimeType: string;
  createdAt: Date;
}

interface DashboardClientProps {
  userEmail: string;
  documents: Document[];
}

export function DashboardClient({ userEmail, documents }: DashboardClientProps) {
  const { signOut, getToken } = useAuth();
  const [jobs, setJobs] = useState<JobStatus[]>([]);

  const startSSE = useCallback(
    async (jobId: string, documentId: string) => {
      const currentToken = await getToken();
      if (!currentToken) return;
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${baseUrl}/api/v1/jobs/${jobId}/stream`, {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        });

        if (!response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          
          // keep the last part in the buffer because it might be incomplete
          buffer = parts.pop() || "";

          for (const part of parts) {
            const lines = part.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.substring(6));
                  
                  if (data.status === "timeout") continue;

                  setJobs((prev) =>
                    prev.map((job) =>
                      job.jobId === jobId
                        ? {
                            ...job,
                            status: data.status,
                            progress: data.progress,
                            message:
                              data.status === "completed"
                                ? "Processing completed successfully!"
                                : data.status === "failed"
                                ? "Processing failed."
                                : "Processing document...",
                          }
                        : job
                    )
                  );

                  if (data.status === "completed" || data.status === "failed") {
                    return; // exit the function and close the stream logically
                  }
                } catch (e) {
                  console.error("SSE parse error", e, line);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Error connecting to SSE stream:", err);
      }
    },
    [getToken]
  );

  const handleUploadSuccess = useCallback(
    (data: { document_id: string; job_id: string; message: string }) => {
      const newJob: JobStatus = {
        jobId: data.job_id,
        status: "pending",
        progress: 0,
        message: "Uploaded, waiting for processing...",
        documentId: data.document_id,
      };
      setJobs((prev) => [newJob, ...prev]);
      
      // Start SSE connection to stream updates
      startSSE(data.job_id, data.document_id);
    },
    [startSSE]
  );

  const handleSignOut = async () => {
    await signOut();
  };

  const refreshJobs = () => {
    console.log("Refreshing jobs...");
  };

  const getStatusIcon = (status: JobStatus["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="size-5 text-green-500" />;
      case "failed":
        return <XCircle className="size-5 text-destructive" />;
      case "processing":
        return <RefreshCw className="size-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="size-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Welcome back</h1>
            <p className="text-muted-foreground mt-1">
              Upload your study materials to generate summaries, quizzes, and practice materials.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={refreshJobs} className="gap-2">
              <RefreshCw className="size-4" />
              Refresh Activity
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: Upload */}
          <div className="lg:col-span-2 space-y-8">
            {/* Upload card */}
            <div className="border border-border rounded-2xl bg-card overflow-hidden">
              <div className="border-b border-border p-6">
                <h2 className="text-xl font-semibold text-foreground">Upload Study Material</h2>
                <p className="text-muted-foreground mt-1">
                  Upload a PDF, image, or text file. Clarift will generate summaries, quizzes, and personalized practice.
                </p>
              </div>
              <div className="p-6">
                <UploadDropzone
                  onUploadSuccess={handleUploadSuccess}
                  onUploadError={(error) => console.error("Upload error:", error)}
                />
              </div>
            </div>

            {/* Recent activity */}
            <div className="border border-border rounded-2xl bg-card overflow-hidden">
              <div className="border-b border-border p-6">
                <h2 className="text-xl font-semibold text-foreground">Recent Activity</h2>
                <p className="text-muted-foreground mt-1">Track the progress of your uploaded documents.</p>
              </div>
              <div className="p-6">
                {jobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No recent activity. Upload a file to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {jobs.map((job) => (
                      <div
                        key={job.jobId}
                        className="border border-border rounded-xl p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(job.status)}
                          <div>
                            <p className="font-medium text-foreground">
                              Document {job.documentId?.substring(0, 8)}
                            </p>
                            <p className="text-sm text-muted-foreground">{job.message}</p>
                          </div>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          <div className="flex items-center gap-4">
                            {job.progress !== undefined && (
                              <div className="w-24">
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary transition-all duration-500 ease-in-out"
                                    style={{ width: `${job.progress}%` }}
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground text-center mt-1">
                                  {job.progress}%
                                </p>
                              </div>
                            )}
                            <span
                              className={cn(
                                "px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap",
                                job.status === "completed"
                                  ? "bg-green-500/10 text-green-700"
                                  : job.status === "failed"
                                  ? "bg-destructive/10 text-destructive"
                                  : job.status === "processing"
                                  ? "bg-blue-500/10 text-blue-700"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {job.status}
                            </span>
                          </div>
                          
                          {job.status === "completed" && job.documentId && (
                            <div className="flex items-center gap-2">
                              <Link href={`/documents/${job.documentId}`}>
                                <Button size="sm" variant="outline" className="w-full md:w-auto gap-1">
                                  View <ChevronRight className="size-3" />
                                </Button>
                              </Link>
                              <Link href={`/chat?document=${job.documentId}`}>
                                <Button size="sm" className="w-full md:w-auto gap-1">
                                  Study Now <ChevronRight className="size-3" />
                                </Button>
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column: How It Works */}
          <div className="space-y-8">
            <div className="border border-border rounded-2xl bg-card overflow-hidden">
              <div className="border-b border-border p-6">
                <h2 className="text-xl font-semibold text-foreground">How It Works</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium text-foreground">1. Upload</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload your study material (PDF, image, or text). Clarift processes it securely.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium text-foreground">2. Summarize</h3>
                  <p className="text-sm text-muted-foreground">
                    Get structured summaries tailored to your learning style.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium text-foreground">3. Quiz</h3>
                  <p className="text-sm text-muted-foreground">
                    Answer auto‑generated questions to test your understanding.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium text-foreground">4. Practice</h3>
                  <p className="text-sm text-muted-foreground">
                    Receive targeted practice drills for weak topics.
                  </p>
              </div>
            </div>

            {/* Documents List */}
            <div className="border border-border rounded-2xl bg-card overflow-hidden">
              <div className="border-b border-border p-6">
                <h2 className="text-xl font-semibold text-foreground">Your Documents</h2>
                <p className="text-muted-foreground mt-1">View and manage your uploaded documents.</p>
              </div>
              <div className="p-6">
                {documents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="size-12 mx-auto mb-3 opacity-50" />
                    <p>No documents yet. Upload a file to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="border border-border rounded-xl p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                      >
                        <Link href={`/documents/${doc.id}`} className="flex items-center gap-3 flex-1">
                          <FileText className="size-5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{doc.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(doc.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </Link>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium",
                              doc.status === "ready" || doc.status === "completed"
                                ? "bg-green-500/10 text-green-700"
                                : doc.status === "processing"
                                ? "bg-yellow-500/10 text-yellow-700"
                                : doc.status === "failed"
                                ? "bg-destructive/10 text-destructive"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {doc.status}
                          </span>
                          <DeleteDocumentButton documentId={doc.id} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}