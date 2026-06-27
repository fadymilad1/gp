'use client'

import React, { useRef } from 'react'

interface FileUploadProps {
  label?: string
  accept?: string
  onChange?: (file: File | null) => void
  error?: string
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  accept = 'image/*',
  onChange,
  error,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    onChange?.(file)
  }

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-neutral-dark mb-2">
          {label}
        </label>
      )}
      <div
        className={`border-2 border-dashed border-neutral-border rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors ${
          error ? 'border-error' : ''
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
          aria-label={label ? `${label} file upload` : 'File upload'}
          title={label ? `${label} file upload` : 'File upload'}
        />
        <p className="text-neutral-gray">
          Click to upload or drag and drop
        </p>
        <p className="text-sm text-neutral-gray mt-1">
          CSV, Excel file up to 10MB
        </p>
      </div>
      {error && (
        <p className="mt-1 text-sm text-error">{error}</p>
      )}
    </div>
  )
}

