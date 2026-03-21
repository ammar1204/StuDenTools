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
 * Merge multiple PDFs client-side using pdf-lib.
 */
async function mergePdfsClientSide(files) {
    const mergedPdf = await PDFDocument.create()

    for (const file of files) {
        const arrayBuffer = await readFileAsArrayBuffer(file)
        const sourcePdf = await PDFDocument.load(arrayBuffer)
        const copiedPages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices())
        copiedPages.forEach(page => mergedPdf.addPage(page))
    }

    const mergedBytes = await mergedPdf.save()
    return new Blob([mergedBytes], { type: 'application/pdf' })
}

export default function PDFMerge() {
    const { showToast } = useToast()
    const [files, setFiles] = useState([])
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)

    const addFiles = (e) => {
        const newFiles = Array.from(e.target.files)
        if (newFiles.length === 0) return

        // Validate each file is a PDF
        const invalidFile = newFiles.find(f => !f.name.toLowerCase().endsWith('.pdf'))
        if (invalidFile) {
            showToast(`"${invalidFile.name}" is not a PDF file`, 'error')
            return
        }

        const combined = [...files, ...newFiles]
        const totalSize = combined.reduce((acc, f) => acc + f.size, 0)
        if (totalSize > CLIENT_PDF_LIMIT) {
            showToast(`Total size exceeds ${formatFileSize(CLIENT_PDF_LIMIT)} limit`, 'error')
            return
        }

        setFiles(combined)
        setResult(null)

        // Reset the input so the same file can be added again if needed
        e.target.value = ''
    }

    const removeFile = (index) => {
        setFiles(files.filter((_, i) => i !== index))
        setResult(null)
    }

    const moveFile = (index, direction) => {
        const newFiles = [...files]
        const targetIndex = index + direction
        if (targetIndex < 0 || targetIndex >= newFiles.length) return
        ;[newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]]
        setFiles(newFiles)
        setResult(null)
    }

    const mergePdfs = async () => {
        if (files.length < 2) {
            showToast('Please add at least 2 PDF files to merge', 'error')
            return
        }

        setLoading(true)
        try {
            const blob = await mergePdfsClientSide(files)
            setResult({ blob, filename: 'merged.pdf' })
            showToast('PDFs merged!', 'success')
            
            const totalMb = files.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)
            logAnalyticsEvent('pdf-merge', 'success', totalMb, `Merged ${files.length} files`)
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
                    <strong>Click to add PDFs</strong> or drag & drop<br />
                    {files.length === 0 ? 'Add PDF files one by one or multiple at once' : 'Add more PDFs'}
                </div>
                <input type="file" id="mergeFiles" accept=".pdf" multiple onChange={addFiles} />
            </div>

            {files.length > 0 && (
                <div className="file-list">
                    {files.map((f, i) => (
                        <div key={`${f.name}-${f.size}-${i}`} className="file-item">
                            <span className="file-item-name" style={{ flex: 1 }}>{f.name}</span>
                            <span style={{ marginRight: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{formatFileSize(f.size)}</span>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                <button
                                    className="btn-remove"
                                    onClick={() => moveFile(i, -1)}
                                    disabled={i === 0}
                                    title="Move up"
                                    style={{ opacity: i === 0 ? 0.3 : 1 }}
                                >↑</button>
                                <button
                                    className="btn-remove"
                                    onClick={() => moveFile(i, 1)}
                                    disabled={i === files.length - 1}
                                    title="Move down"
                                    style={{ opacity: i === files.length - 1 ? 0.3 : 1 }}
                                >↓</button>
                                <button className="btn-remove" onClick={() => removeFile(i)} title="Remove">×</button>
                            </div>
                        </div>
                    ))}
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                        {files.length} file{files.length !== 1 ? 's' : ''} · {formatFileSize(files.reduce((a, f) => a + f.size, 0))} total
                    </div>
                </div>
            )}

            <button className="btn btn-primary" onClick={mergePdfs} disabled={files.length < 2 || loading} style={{ marginTop: '1rem' }}>
                {loading ? <><span className="loading"></span> Merging...</> : `Merge ${files.length} PDF${files.length !== 1 ? 's' : ''}`}
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
