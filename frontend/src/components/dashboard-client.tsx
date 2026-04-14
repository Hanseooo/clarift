"use client";

import { useState, useCallback } from "react";
import { UploadDropzone } from "./upload-dropzone";
import { Button } from "@/components/ui/button";
import { LogOut, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

interface JobStatus {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  message?: string;
  documentId?: string;
}

interface DashboardClientProps {
  token?: string;
  userEmail: string;
}

export function DashboardClient({ token, userEmail }: DashboardClientProps) {
  const { signOut } = useAuth();
  const [jobs, setJobs] = useState<JobStatus[]>([]);

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
      // In a real implementation, start SSE connection here
      console.log("Upload successful, job ID:", data.job_id);
    },
    []
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
            <h1 className="text-3xl font-bold text-foreground">Clarift Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, <span className="font-medium text-foreground">{userEmail}</span>. Upload your study materials to get started.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={refreshJobs} className="gap-2">
              <RefreshCw className="size-4" />
              Refresh
            </Button>
            <Button variant="ghost" onClick={handleSignOut} className="gap-2">
              <LogOut className="size-4" />
              Sign out
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
                  token={token}
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
                        <div className="flex items-center gap-4">
                          {job.progress !== undefined && (
                            <div className="w-24">
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary transition-all"
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
                              "px-2 py-1 rounded-full text-xs font-medium",
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}