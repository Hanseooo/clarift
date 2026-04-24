"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Upload, File, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadDocument } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";

interface UploadDropzoneProps {
  onUploadSuccess?: (data: { document_id: string; job_id: string; message: string }) => void;
  onUploadError?: (error: unknown) => void;
}

export function UploadDropzone({ onUploadSuccess, onUploadError }: UploadDropzoneProps) {
  const { getToken } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type (PDF only for now)
    if (file.type !== "application/pdf") {
      setError("Only PDF files are supported.");
      return;
    }

    setSelectedFile(file);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: false,
    maxSize: 50 * 1024 * 1024, // 50 MB
  });

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      // Create a copy of the client with auth header if token provided
      const currentToken = await getToken();
      const response = await uploadDocument(selectedFile, currentToken || undefined);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.error) {
        console.error("Upload error:", response.error);
        throw new Error("Upload failed");
      }

      const data = response.data as { document_id: string; job_id: string; message: string };
      onUploadSuccess?.(data);
      setSelectedFile(null);
      setUploadProgress(0);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      onUploadError?.(err);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setError(null);
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-[1.5px] border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-150 ease relative overflow-hidden",
          isDragActive
            ? "border-brand-500 bg-brand-500/[0.06] scale-[1.01]"
            : "border-brand-400 bg-gradient-to-br from-brand-500/[0.04] to-brand-400/[0.02] hover:border-brand-500 hover:bg-brand-500/[0.06]",
          error ? "border-danger-500" : ""
        )}
      >
        <input {...getInputProps()} />
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-500/10 border border-brand-500/20 mx-auto">
            <Upload className="size-6 text-brand-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">
              {isDragActive ? "Drop your PDF here" : "Drag & drop your study PDF"}
            </p>
            <p className="text-xs text-text-tertiary mt-1">
              or click to browse (PDF only, max 50 MB)
            </p>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-danger-100 border border-danger-500/30 text-danger-800 text-sm rounded-xl p-3 flex items-center gap-2">
          <X className="size-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Selected file */}
      {selectedFile && (
        <div className="bg-surface-card border border-border-default rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-brand-100">
              <File className="size-5 text-brand-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-text-primary truncate">{selectedFile.name}</p>
              <p className="text-xs text-text-secondary">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={removeFile}
            disabled={uploading}
            className="shrink-0"
          >
            <X className="size-4" />
          </Button>
        </div>
      )}

      {/* Upload button & progress */}
      {selectedFile && !uploading && (
        <Button onClick={handleUpload} className="w-full gap-2 bg-brand-500 hover:bg-brand-600 text-white" size="lg">
          <Upload className="size-4" />
          Upload & Process
        </Button>
      )}

      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Uploading...</span>
            <span className="font-medium text-text-primary">{uploadProgress}%</span>
          </div>
          <div className="h-2 bg-surface-subtle rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-text-secondary">
            <Loader2 className="size-4 animate-spin text-brand-500" />
            Processing document...
          </div>
        </div>
      )}
    </div>
  );
}
