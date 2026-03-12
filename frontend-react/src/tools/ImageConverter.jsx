import { useState } from 'react'
import { useToast } from '../context/ToastContext'
import { formatFileSize, CLIENT_IMAGE_LIMIT } from '../services/api'

const FORMAT_OPTIONS = [
    { value: 'png', label: 'PNG', mime: 'image/png' },
    { value: 'jpg', label: 'JPG', mime: 'image/jpeg' },
    { value: 'webp', label: 'WEBP', mime: 'image/webp' },
]

const QUALITY_MAP = {
    jpg: 0.95,
    webp: 0.90,
    png: undefined, // lossless
}

function getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase()
}

/**
 * Convert an image file to the target format using Canvas API.
 * Handles RGBA→RGB flattening for JPEG by drawing onto white background.
 */
function convertImageClientSide(file, outputFormat) {
    return new Promise((resolve, reject) => {
        const img = new Image()
        const reader = new FileReader()

        reader.onload = (e) => {
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas')
                    canvas.width = img.naturalWidth
                    canvas.height = img.naturalHeight
                    const ctx = canvas.getContext('2d')

                    // For JPEG: fill white background first (no transparency support)
                    if (outputFormat === 'jpg') {
                        ctx.fillStyle = '#FFFFFF'
                        ctx.fillRect(0, 0, canvas.width, canvas.height)
                    }

                    ctx.drawImage(img, 0, 0)

                    const fmt = FORMAT_OPTIONS.find(f => f.value === outputFormat)
                    const quality = QUALITY_MAP[outputFormat]

                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error(`Conversion to ${outputFormat.toUpperCase()} failed — format may not be supported by your browser`))
                                return
                            }
                            resolve(blob)
                        },
                        fmt.mime,
                        quality
                    )
                } catch (err) {
                    reject(err)
                }
            }
            img.onerror = () => reject(new Error('Failed to load image'))
            img.src = e.target.result
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(file)
    })
}

export default function ImageConverter() {
    const { showToast } = useToast()
    const [file, setFile] = useState(null)
    const [outputFormat, setOutputFormat] = useState('png')
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)

    const handleFileSelect = (e) => {
        const selected = e.target.files[0]
        if (!selected) return

        if (selected.size > CLIENT_IMAGE_LIMIT) {
            showToast(`File exceeds ${formatFileSize(CLIENT_IMAGE_LIMIT)} limit`, 'error')
            return
        }

        setFile(selected)
        setResult(null)

        // Auto-select a different output format than the input
        const ext = getFileExtension(selected.name)
        const normalized = ext === 'jpeg' ? 'jpg' : ext
        const firstDifferent = FORMAT_OPTIONS.find(f => f.value !== normalized)
        if (firstDifferent) {
            setOutputFormat(firstDifferent.value)
        }
    }

    const handleDrop = (e) => {
        e.preventDefault()
        e.currentTarget.classList.remove('dragover')
        const dropped = e.dataTransfer.files[0]
        if (dropped) {
            const fakeEvent = { target: { files: [dropped] } }
            handleFileSelect(fakeEvent)
        }
    }

    const convertImage = async () => {
        if (!file) return

        setLoading(true)
        try {
            const blob = await convertImageClientSide(file, outputFormat)

            const originalName = file.name.replace(/\.[^/.]+$/, '')
            const ext = FORMAT_OPTIONS.find(f => f.value === outputFormat)?.value || outputFormat
            setResult({ blob, filename: `${originalName}.${ext}` })
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
            <div
                className="file-upload"
                onClick={() => document.getElementById('imageFile').click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover') }}
                onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
                onDrop={handleDrop}
            >
                <div className="file-upload-icon">↑</div>
                <div className="file-upload-text">
                    <strong>Click to upload</strong> or drag & drop<br />
                    PNG, JPG, WEBP, BMP, TIFF, GIF
                </div>
                <input type="file" id="imageFile" accept=".png,.jpg,.jpeg,.webp,.bmp,.tiff,.tif,.gif" onChange={handleFileSelect} />
            </div>

            {file && (
                <div className="file-list">
                    <div className="file-item">
                        <span className="file-item-name">{file.name}</span>
                        <span>{formatFileSize(file.size)}</span>
                    </div>
                </div>
            )}

            <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Convert to</label>
                <select
                    className="form-select"
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value)}
                >
                    {FORMAT_OPTIONS.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                </select>
            </div>

            <button className="btn btn-primary" onClick={convertImage} disabled={!file || loading} style={{ marginTop: '1rem' }}>
                {loading ? <><span className="loading"></span> Converting...</> : 'Convert Image'}
            </button>

            {result && (
                <div className="result-box">
                    <div className="result-label">✅ Converted to {outputFormat.toUpperCase()}!</div>
                    <button className="btn btn-primary" onClick={downloadFile} style={{ marginTop: '0.5rem' }}>
                        📥 Download {result.filename}
                    </button>
                </div>
            )}
        </>
    )
}
