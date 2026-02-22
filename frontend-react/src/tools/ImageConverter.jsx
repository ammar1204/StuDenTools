import { useState } from 'react'
import { useToast } from '../context/ToastContext'
import { apiFormData, formatFileSize, MAX_FILE_SIZE } from '../services/api'

const FORMAT_OPTIONS = [
    { value: 'png', label: 'PNG' },
    { value: 'jpg', label: 'JPG' },
    { value: 'webp', label: 'WEBP' },
    { value: 'bmp', label: 'BMP' },
]

function getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase()
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

        if (selected.size > MAX_FILE_SIZE) {
            showToast(`File exceeds ${formatFileSize(MAX_FILE_SIZE)} limit`, 'error')
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
            // Trigger through the same handler logic
            const fakeEvent = { target: { files: [dropped] } }
            handleFileSelect(fakeEvent)
        }
    }

    const convertImage = async () => {
        if (!file) return

        setLoading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('output_format', outputFormat)

            const response = await apiFormData('/api/convert-image', formData)
            const blob = await response.blob()

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
