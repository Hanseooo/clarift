"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Upload, File, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadDocument } from "@/lib/api";

interface UploadDropzoneProps {
  token?: string;
  onUploadSuccess?: (data: { document_id: string; job_id: string; message: string }) => void;
  onUploadError?: (error: unknown) => void;
}

export function UploadDropzone({ token, onUploadSuccess, onUploadError }: UploadDropzoneProps) {
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
      const response = await uploadDocument(selectedFile, token);

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
          "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/30",
          error ? "border-destructive" : ""
        )}
      >
        <input {...getInputProps()} />
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/20">
            <Upload className="size-6 text-primary" />
          </div>
          <div>
            <p className="text-lg font-medium text-foreground">
              {isDragActive ? "Drop your PDF here" : "Drag & drop your study PDF"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse (PDF only, max 50 MB)
            </p>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl p-3 flex items-center gap-2">
          <X className="size-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Selected file */}
      {selectedFile && (
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-secondary">
              <File className="size-5 text-secondary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
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
        <Button onClick={handleUpload} className="w-full gap-2" size="lg">
          <Upload className="size-4" />
          Upload & Process
        </Button>
      )}

      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Uploading...</span>
            <span className="font-medium">{uploadProgress}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Processing document...
          </div>
        </div>
      )}
    </div>
  );
}