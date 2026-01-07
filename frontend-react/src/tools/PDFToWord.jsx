import { useState } from 'react'
import { useToast } from '../context/ToastContext'
import { apiFormData, formatFileSize, MAX_FILE_SIZE } from '../services/api'

export default function PDFToWord() {
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

    const convertPdf = async () => {
        if (!file) return

        setLoading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)

            const response = await apiFormData('/api/pdf-to-word', formData)
            const blob = await response.blob()
            const filename = file.name.replace('.pdf', '.docx')

            setResult({ blob, filename })
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
            showToast('Download started!', 'success')
        }
    }

    return (
        <>

            <div className="file-upload" onClick={() => document.getElementById('pdfFile').click()}>
                <div className="file-upload-icon">↑</div>
                <div className="file-upload-text">
                    <strong>Click to upload</strong> or drag & drop<br />
                    PDF file (max 10MB)
                </div>
                <input type="file" id="pdfFile" accept=".pdf" onChange={handleFileSelect} />
            </div>

            {file && (
                <div className="file-list">
                    <div className="file-item">
                        <span className="file-item-name">{file.name}</span>
                        <span>{formatFileSize(file.size)}</span>
                    </div>
                </div>
            )}

            <button className="btn btn-primary" onClick={convertPdf} disabled={!file || loading} style={{ marginTop: '1rem' }}>
                {loading ? <><span className="loading"></span> Converting...</> : 'Convert to Word'}
            </button>

            {result && (
                <div className="result-box">
                    <div className="result-label">✅ Conversion Complete!</div>
                    <div style={{ color: 'var(--text-muted)', margin: '0.5rem 0' }}>{result.filename}</div>
                    <button className="btn btn-primary" onClick={downloadFile} style={{ marginTop: '0.5rem' }}>
                        📥 Download Word Document
                    </button>
                </div>
            )}
        </>
    )
}
