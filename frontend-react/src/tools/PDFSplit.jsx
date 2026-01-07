import { useState } from 'react'
import { useToast } from '../context/ToastContext'
import { apiFormData, formatFileSize, MAX_FILE_SIZE } from '../services/api'

export default function PDFSplit() {
    const { showToast } = useToast()
    const [file, setFile] = useState(null)
    const [pageCount, setPageCount] = useState(0)
    const [startPage, setStartPage] = useState(1)
    const [endPage, setEndPage] = useState(1)
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)

    const handleFileSelect = async (e) => {
        const selectedFile = e.target.files[0]
        if (!selectedFile) return

        if (selectedFile.size > MAX_FILE_SIZE) {
            showToast(`File size exceeds ${formatFileSize(MAX_FILE_SIZE)} limit`, 'error')
            return
        }

        setFile(selectedFile)
        setResult(null)

        // Get page count
        try {
            const formData = new FormData()
            formData.append('file', selectedFile)
            const response = await apiFormData('/api/pdf/info', formData)
            const data = await response.json()
            setPageCount(data.total_pages)
            setEndPage(data.total_pages)
        } catch (error) {
            showToast('Failed to read PDF info', 'error')
            setFile(null)
        }
    }

    const splitPdf = async () => {
        if (!file || startPage > endPage) {
            showToast('Invalid page range', 'error')
            return
        }

        setLoading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('start_page', startPage)
            formData.append('end_page', endPage)

            const response = await apiFormData('/api/pdf/split', formData)
            const blob = await response.blob()
            const filename = `${file.name.replace('.pdf', '')}_pages_${startPage}-${endPage}.pdf`

            setResult({ blob, filename })
            showToast('PDF split!', 'success')
        } catch (error) {
            showToast(error.message || 'Split failed', 'error')
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

            <div className="file-upload" onClick={() => document.getElementById('splitFile').click()}>
                <div className="file-upload-icon">↑</div>
                <div className="file-upload-text">
                    <strong>Click to upload</strong> or drag & drop<br />
                    PDF file (max 10MB)
                </div>
                <input type="file" id="splitFile" accept=".pdf" onChange={handleFileSelect} />
            </div>

            {file && (
                <>
                    <div className="file-list">
                        <div className="file-item">
                            <span className="file-item-name">{file.name}</span>
                            <span>{pageCount} pages</span>
                        </div>
                    </div>

                    <div className="page-range" style={{ marginTop: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Start Page</label>
                            <input
                                type="number"
                                className="form-input"
                                min="1"
                                max={pageCount}
                                value={startPage}
                                onChange={(e) => setStartPage(parseInt(e.target.value) || 1)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">End Page</label>
                            <input
                                type="number"
                                className="form-input"
                                min="1"
                                max={pageCount}
                                value={endPage}
                                onChange={(e) => setEndPage(parseInt(e.target.value) || 1)}
                            />
                        </div>
                    </div>
                </>
            )}

            <button className="btn btn-primary" onClick={splitPdf} disabled={!file || loading} style={{ marginTop: '1rem' }}>
                {loading ? <><span className="loading"></span> Splitting...</> : 'Extract Pages'}
            </button>

            {result && (
                <div className="result-box">
                    <div className="result-label">✅ Pages {startPage}-{endPage} Extracted!</div>
                    <button className="btn btn-primary" onClick={downloadFile} style={{ marginTop: '0.5rem' }}>
                        📥 Download Extracted Pages
                    </button>
                </div>
            )}
        </>
    )
}
