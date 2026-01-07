import { useState } from 'react'
import { useToast } from '../context/ToastContext'
import { apiFormData, formatFileSize, MAX_FILE_SIZE } from '../services/api'

export default function ImagesToPDF() {
    const { showToast } = useToast()
    const [files, setFiles] = useState([])
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)

    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files)
        if (selectedFiles.length === 0) return

        const totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0)
        if (totalSize > MAX_FILE_SIZE) {
            showToast(`Total size exceeds ${formatFileSize(MAX_FILE_SIZE)} limit`, 'error')
            return
        }

        setFiles(selectedFiles)
        setResult(null)
    }

    const convertToPdf = async () => {
        if (files.length === 0) return

        setLoading(true)
        try {
            const formData = new FormData()
            files.forEach(f => formData.append('files', f))

            const response = await apiFormData('/api/images-to-pdf', formData)
            const blob = await response.blob()

            setResult({ blob, filename: 'images.pdf' })
            showToast('Conversion complete!', 'success')
        } catch (error) {
            showToast(error.message || 'Conversion failed', 'error')
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

            <div className="file-upload" onClick={() => document.getElementById('imageFiles').click()}>
                <div className="file-upload-icon">↑</div>
                <div className="file-upload-text">
                    <strong>Click to upload</strong> or drag & drop<br />
                    Images (PNG, JPG, WebP)
                </div>
                <input type="file" id="imageFiles" accept=".png,.jpg,.jpeg,.webp,.bmp,.tiff,.gif" multiple onChange={handleFileSelect} />
            </div>

            {files.length > 0 && (
                <div className="file-list">
                    {files.map((f, i) => (
                        <div key={i} className="file-item">
                            <span className="file-item-name">{f.name}</span>
                            <span>{formatFileSize(f.size)}</span>
                        </div>
                    ))}
                </div>
            )}

            <button className="btn btn-primary" onClick={convertToPdf} disabled={files.length === 0 || loading} style={{ marginTop: '1rem' }}>
                {loading ? <><span className="loading"></span> Converting...</> : 'Convert to PDF'}
            </button>

            {result && (
                <div className="result-box">
                    <div className="result-label">✅ {files.length} Images Converted!</div>
                    <button className="btn btn-primary" onClick={downloadFile} style={{ marginTop: '0.5rem' }}>
                        📥 Download PDF
                    </button>
                </div>
            )}
        </>
    )
}
