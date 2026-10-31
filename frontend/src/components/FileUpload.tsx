import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export interface FileUploadProps {
  onUpload: (file: File) => Promise<void>;
  isLoading?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUpload, isLoading = false }) => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = (files: FileList | null) => {
    setError(null);
    setSuccess(false);

    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Invalid file type. Please upload a valid .csv file.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleUploadClick = async () => {
    if (!selectedFile) return;
    setError(null);
    try {
      await onUpload(selectedFile);
      setSuccess(true);
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err: any) {
      setError(err?.message || 'Failed to upload CSV file');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="w-full">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-blue-500 bg-blue-50/50'
            : 'border-gray-300 hover:border-blue-400 bg-white hover:bg-gray-50/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={handleChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <UploadCloud className="w-6 h-6" />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700">
              <span className="text-blue-600 font-semibold hover:underline">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Supports CSV files with traffic data (timestamp, speed, volume, location, etc.)
            </p>
          </div>
        </div>
      </div>

      {/* Selected file preview */}
      {selectedFile && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-800">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleUploadClick}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading & Parsing...
              </>
            ) : (
              'Upload & Process'
            )}
          </button>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-xs text-red-700">
          <AlertCircle className="w-4 h-4 mr-2 text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success alert */}
      {success && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center text-xs text-green-700">
          <CheckCircle2 className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" />
          <span>Dataset uploaded and processed successfully!</span>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
