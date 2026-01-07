import { useState } from 'react'
import { useToast } from '../context/ToastContext'
import { apiJson } from '../services/api'

export default function Paraphraser() {
    const { showToast } = useToast()
    const [text, setText] = useState('')
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)

    const paraphrase = async () => {
        if (text.trim().length < 10) {
            showToast('Text must be at least 10 characters', 'error')
            return
        }

        setLoading(true)
        try {
            const data = await apiJson('/api/paraphrase', { text: text.trim() })
            setResult(data)
            showToast('Paraphrasing complete!', 'success')
        } catch (error) {
            showToast(error.message || 'Paraphrasing failed', 'error')
        } finally {
            setLoading(false)
        }
    }

    const copyResult = () => {
        if (result) {
            navigator.clipboard.writeText(result.paraphrased_text).then(() => {
                showToast('Copied to clipboard!', 'success')
            }).catch(() => {
                showToast('Failed to copy', 'error')
            })
        }
    }

    return (
        <>

            <div className="form-group">
                <label className="form-label">Enter your text</label>
                <textarea
                    className="form-textarea"
                    placeholder="Paste your text here (10-5000 characters)..."
                    maxLength={5000}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
                <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {text.length}/5000
                </div>
            </div>

            <button className="btn btn-primary" onClick={paraphrase} disabled={loading}>
                {loading ? <><span className="loading"></span> Paraphrasing...</> : 'Paraphrase'}
            </button>

            {result && (
                <div className="result-box">
                    <div className="result-label">✅ Paraphrased Text</div>
                    <div className="result-text">{result.paraphrased_text}</div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <span>{result.original_word_count} → {result.paraphrased_word_count} words</span>
                    </div>
                    <button className="btn btn-primary" onClick={copyResult} style={{ marginTop: '0.5rem' }}>
                        📋 Copy Result
                    </button>
                </div>
            )}
        </>
    )
}
