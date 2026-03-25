import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { formatSize } from '../lib/utils'

interface FileUploaderProps {
    onFileSelect: (files: File[]) => void;
    multiple?: boolean;
}

const FileUploader = ({ onFileSelect, multiple = false }: FileUploaderProps) => {
    // 1. Add local state to track the batch of files
    const [files, setFiles] = useState<File[]>([]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        // Update local UI state and send data to the parent (Upload.tsx)
        setFiles(acceptedFiles);
        onFileSelect(acceptedFiles);
    }, [onFileSelect]);

    const maxFileSize = 20 * 1024 * 1024; // 20MB in bytes

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: multiple,
        accept: { 'application/pdf': ['.pdf'] },
        maxSize: maxFileSize,
    })

    // 2. Allow removing a specific file from the batch
    const removeFile = (e: React.MouseEvent, fileToRemove: File) => {
        e.stopPropagation(); // Prevents the file dialog from opening
        const updatedFiles = files.filter(f => f !== fileToRemove);
        setFiles(updatedFiles);
        onFileSelect(updatedFiles);
    }

    return (
        <div className={`w-full gradient-border ${isDragActive ? 'bg-blue-50 border-blue-400' : 'bg-white'}`}>
            <div {...getRootProps()} className="p-6">
                <input {...getInputProps()} />

                <div className="space-y-4 cursor-pointer">
                    {files.length > 0 ? (
                        // 3. Create a scrollable container for the list of files
                        <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-2">
                            {files.map((file, index) => (
                                <div key={index} className="uploader-selected-file flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center space-x-3 overflow-hidden">
                                        <img src="/images/pdf.png" alt="pdf" className="w-8 h-8 flex-shrink-0" />
                                        <div className="truncate">
                                            <p className="text-sm font-medium text-gray-800 truncate max-w-xs">
                                                {file.name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {formatSize(file.size)}
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        type="button" // Prevents accidental form submission
                                        className="p-2 cursor-pointer hover:bg-gray-300 rounded-full transition" 
                                        onClick={(e) => removeFile(e, file)}
                                    >
                                        <img src="/icons/cross.svg" alt="remove" className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8">
                            <div className="mx-auto w-16 h-16 flex items-center justify-center mb-4">
                                <img src="/icons/info.svg" alt="upload" className="w-16 h-16 opacity-50" />
                            </div>
                            <p className="text-lg text-gray-600 text-center">
                                <span className="font-semibold text-blue-600">
                                    Click to upload
                                </span> or drag and drop
                            </p>
                            <p className="text-sm text-gray-400 text-center mt-2">
                                You can select multiple PDFs (max {formatSize(maxFileSize)} each)
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default FileUploader