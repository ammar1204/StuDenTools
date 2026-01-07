import { useState } from 'react'
import { useToast } from '../context/ToastContext'
import { apiFormData, formatFileSize, MAX_FILE_SIZE } from '../services/api'

export default function PDFMerge() {
    const { showToast } = useToast()
    const [files, setFiles] = useState([])
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)

    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files)
        if (selectedFiles.length < 2) {
            showToast('Please select at least 2 PDFs', 'error')
            return
        }

        const totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0)
        if (totalSize > MAX_FILE_SIZE) {
            showToast(`Total size exceeds ${formatFileSize(MAX_FILE_SIZE)} limit`, 'error')
            return
        }

        setFiles(selectedFiles)
        setResult(null)
    }

    const mergePdfs = async () => {
        if (files.length < 2) return

        setLoading(true)
        try {
            const formData = new FormData()
            files.forEach(f => formData.append('files', f))

            const response = await apiFormData('/api/pdf/merge', formData)
            const blob = await response.blob()

            setResult({ blob, filename: 'merged.pdf' })
            showToast('PDFs merged!', 'success')
        } catch (error) {
            showToast(error.message || 'Merge failed', 'error')
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

            <div className="file-upload" onClick={() => document.getElementById('mergeFiles').click()}>
                <div className="file-upload-icon">↑</div>
                <div className="file-upload-text">
                    <strong>Click to upload</strong> or drag & drop<br />
                    Multiple PDF files (min 2)
                </div>
                <input type="file" id="mergeFiles" accept=".pdf" multiple onChange={handleFileSelect} />
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

            <button className="btn btn-primary" onClick={mergePdfs} disabled={files.length < 2 || loading} style={{ marginTop: '1rem' }}>
                {loading ? <><span className="loading"></span> Merging...</> : 'Merge PDFs'}
            </button>

            {result && (
                <div className="result-box">
                    <div className="result-label">✅ {files.length} PDFs Merged!</div>
                    <button className="btn btn-primary" onClick={downloadFile} style={{ marginTop: '0.5rem' }}>
                        📥 Download Merged PDF
                    </button>
                </div>
            )}
        </>
    )
}
