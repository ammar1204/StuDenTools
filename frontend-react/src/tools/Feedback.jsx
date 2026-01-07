import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../context/ToastContext'
import { apiJson } from '../services/api'

export default function Feedback() {
    const { showToast } = useToast()
    const navigate = useNavigate()
    const [message, setMessage] = useState('')
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)

    const submitFeedback = async () => {
        if (!message.trim()) {
            showToast('Please enter a message', 'error')
            return
        }

        setLoading(true)
        try {
            await apiJson('/api/feedback/', {
                type: 'general',
                message: message.trim(),
                email: email.trim() || null
            })
            showToast('Thank you for your feedback!', 'success')
            setTimeout(() => navigate('/'), 1500)
        } catch (error) {
            showToast(error.message || 'Failed to send feedback', 'error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>

            <div className="form-group">
                <label className="form-label">Message</label>
                <textarea
                    className="form-textarea"
                    placeholder="Tell us what you think..."
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
            </div>

            <div className="form-group">
                <label className="form-label">Email (Optional)</label>
                <input
                    type="email"
                    className="form-input"
                    placeholder="If you want a reply"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </div>

            <button className="btn btn-primary" onClick={submitFeedback} disabled={loading}>
                {loading ? <><span className="loading"></span> Sending...</> : 'Submit Feedback'}
            </button>
        </>
    )
}
