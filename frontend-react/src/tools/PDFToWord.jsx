import { useState } from 'react'
import { useToast } from '../context/ToastContext'
import { apiFormData, formatFileSize, SERVER_PDF_TO_WORD_LIMIT } from '../services/api'
import { PDFDocument } from 'pdf-lib'

export default function PDFToWord() {
    const { showToast } = useToast()
    const [file, setFile] = useState(null)
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)

    const handleFileSelect = async (e) => {
        const selectedFile = e.target.files[0]
        if (!selectedFile) return

        if (selectedFile.size > SERVER_PDF_TO_WORD_LIMIT) {
            showToast(`File size exceeds ${formatFileSize(SERVER_PDF_TO_WORD_LIMIT)} limit`, 'error')
            return
        }
        
        try {
            const arrayBuffer = await selectedFile.arrayBuffer()
            const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
            const pageCount = pdfDoc.getPageCount()
            
            if (pageCount > 50) {
                showToast(`PDF has ${pageCount} pages. Maximum allowed is 50. Please split it first.`, 'error')
                e.target.value = null
                return
            }
        } catch (error) {
            console.error("Error reading PDF:", error)
            showToast("Error checking PDF page count.", "error")
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
                    PDF file (max 50 pages)
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
