const API_BASE = 'https://studentoolss-production.up.railway.app'

export async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            ...options.headers,
        },
    })

    if (!response.ok) {
        let errorMessage = 'Request failed'
        try {
            const error = await response.json()
            errorMessage = error.detail || errorMessage
        } catch {
            errorMessage = response.statusText || errorMessage
        }
        throw new Error(errorMessage)
    }

    return response
}

export async function apiJson(endpoint, data) {
    const response = await apiRequest(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    return response.json()
}

export async function apiFormData(endpoint, formData) {
    const response = await apiRequest(endpoint, {
        method: 'POST',
        body: formData,
    })
    return response
}

export function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
