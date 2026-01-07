import { useState } from 'react'
import { useToast } from '../context/ToastContext'
import { apiJson } from '../services/api'

export default function CitationGenerator() {
    const { showToast } = useToast()
    const [input, setInput] = useState('')
    const [style, setStyle] = useState('apa')
    const [sourceType, setSourceType] = useState('')
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)

    const generateCitation = async () => {
        if (!input.trim()) {
            showToast('Please enter a DOI, URL, or paper title', 'error')
            return
        }

        setLoading(true)
        try {
            const requestBody = { input: input.trim(), style }
            if (sourceType) requestBody.source_type = sourceType

            const data = await apiJson('/api/citation', requestBody)
            setResult(data)
            showToast('Citation generated!', 'success')
        } catch (error) {
            showToast(error.message || 'Citation generation failed', 'error')
        } finally {
            setLoading(false)
        }
    }

    const copyCitation = () => {
        if (result) {
            const plainText = result.citation.replace(/\*/g, '')
            navigator.clipboard.writeText(plainText).then(() => {
                showToast('Citation copied to clipboard!', 'success')
            }).catch(() => {
                showToast('Failed to copy citation', 'error')
            })
        }
    }

    const formatCitation = (text) => {
        return text.replace(/\*(.*?)\*/g, '<em>$1</em>')
    }

    return (
        <>

            <div className="form-group">
                <label className="form-label">Paste DOI, paper URL, website URL, or paper title</label>
                <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., 10.1038/nature12373 or https://..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                />
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label className="form-label">Citation Style</label>
                    <select className="form-select" value={style} onChange={(e) => setStyle(e.target.value)}>
                        <option value="apa">APA (7th Edition)</option>
                        <option value="ieee">IEEE</option>
                        <option value="harvard">Harvard</option>
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Source Type</label>
                    <select className="form-select" value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
                        <option value="">Auto-detect</option>
                        <option value="journal-article">Journal Article</option>
                        <option value="website">Website</option>
                        <option value="book">Book</option>
                    </select>
                </div>
            </div>

            <button className="btn btn-primary" onClick={generateCitation} disabled={loading}>
                {loading ? <><span className="loading"></span> Generating...</> : 'Generate Citation'}
            </button>

            {result && (
                <div className="result-box">
                    <div className="result-label">✅ {style.toUpperCase()} Citation</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                        Detected: {result.detected_type} (via {result.input_type})
                    </div>
                    <div
                        className="citation-text"
                        dangerouslySetInnerHTML={{ __html: formatCitation(result.citation) }}
                    />
                    <button className="btn btn-primary" onClick={copyCitation} style={{ marginTop: '0.5rem' }}>
                        📋 Copy Citation
                    </button>
                </div>
            )}
        </>
    )
}
