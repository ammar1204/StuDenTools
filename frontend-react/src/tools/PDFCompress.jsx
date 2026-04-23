import { useState } from 'react'
import { useToast } from '../context/ToastContext'
import { apiFormData, formatFileSize, SERVER_COMPRESS_LIMIT } from '../services/api'

export default function PDFCompress() {
    const { showToast } = useToast()
    const [file, setFile] = useState(null)
    const [pageInfo, setPageInfo] = useState(null)
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)

    const handleFileSelect = async (e) => {
        const selectedFile = e.target.files[0]
        if (!selectedFile) return

        if (selectedFile.type !== 'application/pdf' && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
            showToast('Please select a valid PDF file', 'error')
            return
        }

        if (selectedFile.size > SERVER_COMPRESS_LIMIT) {
            showToast(`File size exceeds ${formatFileSize(SERVER_COMPRESS_LIMIT)} limit`, 'error')
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

            {result && (() => {
                const reduction = parseFloat(result.reduction)
                const isAlreadyOptimized = reduction <= 2

                return (
                    <div className="result-box">
                        {isAlreadyOptimized ? (
                            <>
                                <div className="result-label">📄 Already Well-Optimized</div>
                                <div className="compression-stats">
                                    <div className="stat-item">
                                        <div className="stat-label">Original</div>
                                        <div className="stat-value">{formatFileSize(result.originalSize)}</div>
                                    </div>
                                    <div className="stat-arrow">≈</div>
                                    <div className="stat-item">
                                        <div className="stat-label">After Compression</div>
                                        <div className="stat-value">{formatFileSize(result.compressedSize)}</div>
                                    </div>
                                </div>
                                <div style={{
                                    marginTop: '0.75rem',
                                    padding: '0.75rem 1rem',
                                    background: 'var(--bg-tertiary, rgba(255,255,255,0.05))',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    color: 'var(--text-muted)',
                                    lineHeight: '1.5'
                                }}>
                                    💡 This PDF is already well-optimized — compression {reduction <= 0
                                        ? 'would slightly increase the file size'
                                        : `only reduced the size by ${reduction}%`
                                    }. No further compression is needed!
                                </div>
                            </>
                        ) : (
                            <>
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
                                <div style={{ marginTop: '0.5rem', color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 500 }}>
                                    🎉 {reduction}% smaller
                                </div>
                                <button className="btn btn-primary" onClick={downloadFile} style={{ marginTop: '0.5rem' }}>
                                    📥 Download Compressed PDF
                                </button>
                            </>
                        )}
                    </div>
                )
            })()}
        </>
    )
}
