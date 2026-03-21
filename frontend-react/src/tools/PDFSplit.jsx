import { useState } from 'react'
import { useToast } from '../context/ToastContext'
import { formatFileSize, CLIENT_PDF_LIMIT, logAnalyticsEvent } from '../services/api'
import { PDFDocument } from 'pdf-lib'

/**
 * Read a File as an ArrayBuffer for pdf-lib.
 */
function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
        reader.readAsArrayBuffer(file)
    })
}

/**
 * Extract a range of pages from a PDF client-side using pdf-lib.
 */
async function splitPdfClientSide(arrayBuffer, startPage, endPage) {
    const sourcePdf = await PDFDocument.load(arrayBuffer)
    const newPdf = await PDFDocument.create()

    // Convert 1-indexed to 0-indexed
    const pageIndices = []
    for (let i = startPage - 1; i < endPage; i++) {
        pageIndices.push(i)
    }

    const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices)
    copiedPages.forEach(page => newPdf.addPage(page))

    const pdfBytes = await newPdf.save()
    return new Blob([pdfBytes], { type: 'application/pdf' })
}

export default function PDFSplit() {
    const { showToast } = useToast()
    const [file, setFile] = useState(null)
    const [pdfData, setPdfData] = useState(null) // cached ArrayBuffer
    const [pageCount, setPageCount] = useState(0)
    const [startPage, setStartPage] = useState(1)
    const [endPage, setEndPage] = useState(1)
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)

    const handleFileSelect = async (e) => {
        const selectedFile = e.target.files[0]
        if (!selectedFile) return

        if (selectedFile.size > CLIENT_PDF_LIMIT) {
            showToast(`File size exceeds ${formatFileSize(CLIENT_PDF_LIMIT)} limit`, 'error')
            return
        }

        setFile(selectedFile)
        setResult(null)

        // Read and validate PDF client-side — get page count instantly
        try {
            const arrayBuffer = await readFileAsArrayBuffer(selectedFile)
            const pdf = await PDFDocument.load(arrayBuffer)
            const totalPages = pdf.getPageCount()

            setPdfData(arrayBuffer)
            setPageCount(totalPages)
            setStartPage(1)
            setEndPage(totalPages)
        } catch (error) {
            showToast('Failed to read PDF — file may be corrupted or password-protected', 'error')
            setFile(null)
            setPdfData(null)
        }
    }

    const splitPdf = async () => {
        if (!file || !pdfData || startPage > endPage) {
            showToast('Invalid page range', 'error')
            return
        }

        setLoading(true)
        try {
            const blob = await splitPdfClientSide(pdfData, startPage, endPage)
            const filename = `${file.name.replace('.pdf', '')}_pages_${startPage}-${endPage}.pdf`
            setResult({ blob, filename })
            showToast('PDF split!', 'success')
            
            logAnalyticsEvent('pdf-split', 'success', file.size / (1024 * 1024), `Pages ${startPage}-${endPage}`)
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
                    PDF file (max {formatFileSize(CLIENT_PDF_LIMIT)})
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
