import { useState } from 'react'
import { useToast } from '../context/ToastContext'
import { apiFormData, formatFileSize, MAX_FILE_SIZE } from '../services/api'

export default function PDFCompress() {
    const { showToast } = useToast()
    const [file, setFile] = useState(null)
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0]
        if (!selectedFile) return

        if (selectedFile.size > MAX_FILE_SIZE) {
            showToast(`File size exceeds ${formatFileSize(MAX_FILE_SIZE)} limit`, 'error')
            return
        }
        setFile(selectedFile)
        setResult(null)
    }

    const compressPdf = async () => {
        if (!file) return

        setLoading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)

            const response = await apiFormData('/api/pdf/compress', formData)
            const blob = await response.blob()

            const originalSize = response.headers.get('X-Original-Size') || file.size
            const compressedSize = response.headers.get('X-Compressed-Size') || blob.size
            const reduction = response.headers.get('X-Reduction-Percent') ||
                Math.round((1 - blob.size / file.size) * 100)

            setResult({
                blob,
                filename: file.name.replace('.pdf', '_compressed.pdf'),
                originalSize: parseInt(originalSize),
                compressedSize: parseInt(compressedSize),
                reduction
            })
            showToast('Compression complete!', 'success')
        } catch (error) {
            showToast(error.message || 'Compression failed', 'error')
        } finally {
            setLoading(false)
        }
    }

    const downloadFile = () => {
        if (result) {
            const url = URL.createObjectURL(result.blob)
            const a = document.createElement('a')
            a.href = url
            a.download = result.filename
            a.click()
            URL.revokeObjectURL(url)
        }
    }

    return (
        <>

            <div className="file-upload" onClick={() => document.getElementById('compressFile').click()}>
                <div className="file-upload-icon">↑</div>
                <div className="file-upload-text">
                    <strong>Click to upload</strong> or drag & drop<br />
                    PDF file (max 100MB)
                </div>
                <input type="file" id="compressFile" accept=".pdf" onChange={handleFileSelect} />
            </div>

            {file && (
                <div className="file-list">
                    <div className="file-item">
                        <span className="file-item-name">{file.name}</span>
                        <span>{formatFileSize(file.size)}</span>
                    </div>
                </div>
            )}

            <button className="btn btn-primary" onClick={compressPdf} disabled={!file || loading} style={{ marginTop: '1rem' }}>
                {loading ? <><span className="loading"></span> Compressing...</> : 'Compress PDF'}
            </button>

            {result && (
                <div className="result-box">
                    <div className="result-label">✅ Compression Complete!</div>
                    <div className="compression-stats">
                        <div className="stat-item">
                            <div className="stat-label">Original</div>
                            <div className="stat-value">{formatFileSize(result.originalSize)}</div>
                        </div>
                        <div className="stat-arrow">→</div>
                        <div className="stat-item">
                            <div className="stat-label">Compressed</div>
                            <div className="stat-value">{formatFileSize(result.compressedSize)}</div>
                        </div>
                    </div>
                    <div style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {result.reduction}% reduction
                    </div>
                    <button className="btn btn-primary" onClick={downloadFile} style={{ marginTop: '0.5rem' }}>
                        📥 Download Compressed PDF
                    </button>
                </div>
            )}
        </>
    )
}
