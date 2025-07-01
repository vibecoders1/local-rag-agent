import React, { useState, useRef } from 'react';
import { Upload, File, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  uploadedAt: Date;
  status: 'success' | 'error';
  error?: string;
}

const FileUploadApp: React.FC = () => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // n8n webhook URL
  const WEBHOOK_URL = 'http://localhost:5678/webhook-test/upload_document';

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = async (files: File[]) => {
    const validFiles = files.filter(file => {
      const validTypes = [
        'text/plain', 'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/markdown', 'application/json'
      ];
      return validTypes.includes(file.type) || file.name.endsWith('.txt') || file.name.endsWith('.md');
    });

    if (validFiles.length !== files.length) {
      alert('Some files were skipped. Only text, PDF, Word, and Markdown files are supported.');
    }

    for (const file of validFiles) {
      await uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    const fileId = Date.now() + '_' + file.name;
    setUploadingFiles(prev => [...prev, { id: fileId, name: file.name, progress: 0 }]);
    try {
      const fileContent = await readFileContent(file);
      setUploadingFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress: 50 } : f));
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'x-filename': file.name
        },
        body: fileContent
      });
      if (response.ok) {
        let result: any = {};
        try { result = await response.json(); } catch {}
        setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
        setUploadedFiles(prev => [...prev, {
          id: result.file_id || fileId,
          name: file.name,
          size: file.size,
          uploadedAt: new Date(),
          status: 'success'
        }]);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error: any) {
      setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
      setUploadedFiles(prev => [...prev, {
        id: fileId,
        name: file.name,
        size: file.size,
        uploadedAt: new Date(),
        status: 'error',
        error: error.message
      }]);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mb-6">
            <Upload className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            RAG Document Upload
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Upload your documents to build a powerful knowledge base with vector search capabilities
          </p>
        </div>

        {/* Upload Area */}
        <div className="max-w-4xl mx-auto mb-12">
          <div
            className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
              isDragOver
                ? 'border-indigo-400 bg-indigo-50 scale-105'
                : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept=".txt,.md,.pdf,.doc,.docx,.json"
            />
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                isDragOver ? 'bg-indigo-100' : 'bg-gray-100'
              }`}>
                <Upload className={`w-8 h-8 transition-colors ${
                  isDragOver ? 'text-indigo-600' : 'text-gray-500'
                }`} />
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-700 mb-2">
                  Drop your files here, or{' '}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-indigo-600 hover:text-indigo-700 underline"
                  >
                    browse
                  </button>
                </p>
                <p className="text-gray-500">
                  Supports: TXT, MD, PDF, DOC, DOCX, JSON files
                </p>
              </div>
            </div>
            {isDragOver && (
              <div className="absolute inset-0 bg-indigo-500 bg-opacity-10 rounded-xl flex items-center justify-center">
                <p className="text-lg font-semibold text-indigo-700">Drop files to upload</p>
              </div>
            )}
          </div>
        </div>

        {/* Uploading Files */}
        {uploadingFiles.length > 0 && (
          <div className="max-w-4xl mx-auto mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Uploading...</h3>
            <div className="space-y-3">
              {uploadingFiles.map((file) => (
                <div key={file.id} className="bg-white rounded-lg border p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                      <span className="font-medium text-gray-700">{file.name}</span>
                    </div>
                    <span className="text-sm text-gray-500">{file.progress}%</span>
                  </div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${file.progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <div className="max-w-4xl mx-auto">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Uploaded Documents ({uploadedFiles.length})
            </h3>
            <div className="grid gap-4">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="bg-white rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        file.status === 'success' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {file.status === 'success' ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{file.name}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{formatFileSize(file.size)}</span>
                          <span>•</span>
                          <span>{file.uploadedAt.toLocaleString()}</span>
                          {file.status === 'success' && (
                            <>
                              <span>•</span>
                              <span className="text-green-600 font-medium">Processed</span>
                            </>
                          )}
                        </div>
                        {file.error && (
                          <p className="text-sm text-red-600 mt-1">{file.error}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {uploadedFiles.length === 0 && uploadingFiles.length === 0 && (
          <div className="max-w-2xl mx-auto text-center">
            <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No documents uploaded yet</h3>
            <p className="text-gray-500">
              Start by uploading your first document to build your knowledge base
            </p>
          </div>
        )}

        {/* Info Section */}
        <div className="max-w-4xl mx-auto mt-16 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">How it works</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Upload className="w-6 h-6 text-indigo-600" />
              </div>
              <h4 className="font-medium text-gray-800 mb-2">Upload Documents</h4>
              <p className="text-sm text-gray-600">
                Drag and drop or select files to upload to your knowledge base
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Loader2 className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-medium text-gray-800 mb-2">Process & Embed</h4>
              <p className="text-sm text-gray-600">
                Documents are chunked, embedded using Ollama, and stored in Qdrant
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-medium text-gray-800 mb-2">Ready for RAG</h4>
              <p className="text-sm text-gray-600">
                Your documents are now searchable and ready for AI-powered queries
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploadApp; 