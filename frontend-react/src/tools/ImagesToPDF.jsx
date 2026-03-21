import { useState } from 'react'
import { useToast } from '../context/ToastContext'
import { formatFileSize, CLIENT_PDF_LIMIT, logAnalyticsEvent } from '../services/api'
import { jsPDF } from 'jspdf'

/**
 * Read a File as a data URL for embedding in jsPDF.
 */
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
        reader.readAsDataURL(file)
    })
}

/**
 * Get image dimensions from a data URL.
 */
function getImageDimensions(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
        img.onerror = () => reject(new Error('Failed to load image dimensions'))
        img.src = dataUrl
    })
}

/**
 * Build a PDF from image files entirely client-side using jsPDF.
 * Each image becomes a separate page sized to fit the image.
 */
async function buildPdfFromImages(files) {
    const pdf = new jsPDF({ unit: 'px', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    for (let i = 0; i < files.length; i++) {
        const dataUrl = await readFileAsDataURL(files[i])
        const dims = await getImageDimensions(dataUrl)

        // Scale image to fit page while preserving aspect ratio
        const ratio = Math.min(pageWidth / dims.width, pageHeight / dims.height)
        const scaledW = dims.width * ratio
        const scaledH = dims.height * ratio
        const x = (pageWidth - scaledW) / 2
        const y = (pageHeight - scaledH) / 2

        if (i > 0) pdf.addPage()

        // Determine format from file extension
        const ext = files[i].name.split('.').pop().toLowerCase()
        const format = ext === 'jpg' || ext === 'jpeg' ? 'JPEG'
            : ext === 'webp' ? 'WEBP'
            : 'PNG'

        pdf.addImage(dataUrl, format, x, y, scaledW, scaledH)
    }

    return pdf.output('blob')
}

export default function ImagesToPDF() {
    const { showToast } = useToast()
    const [files, setFiles] = useState([])
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)

    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files)
        if (selectedFiles.length === 0) return

        const totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0)
        if (totalSize > CLIENT_PDF_LIMIT) {
            showToast(`Total size exceeds ${formatFileSize(CLIENT_PDF_LIMIT)} limit`, 'error')
            return
        }

        setFiles(selectedFiles)
        setResult(null)
    }

    const convertToPdf = async () => {
        if (files.length === 0) return

        setLoading(true)
        try {
            const blob = await buildPdfFromImages(files)
            setResult({ blob, filename: 'images.pdf' })
            showToast('Conversion complete!', 'success')
            
            const totalMb = files.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)
            logAnalyticsEvent('images-to-pdf', 'success', totalMb, `Converted ${files.length} images`)
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
