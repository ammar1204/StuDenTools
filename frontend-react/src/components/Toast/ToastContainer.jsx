import { useToast } from '../../context/ToastContext'

export default function ToastContainer() {
    const { toasts } = useToast()

    const icons = { success: '✓', error: '✕', info: 'ℹ' }

    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <div key={toast.id} className={`toast ${toast.type}`}>
                    <span className="toast-icon">{icons[toast.type] || icons.info}</span>
                    <span className="toast-message">{toast.message}</span>
                </div>
            ))}
        </div>
    )
}
