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

export async function apiFormData(endpoint, formData, timeoutMs = 120000) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
        const response = await apiRequest(endpoint, {
            method: 'POST',
            body: formData,
            signal: controller.signal,
        })
        return response
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Request timed out. The file may be too large or complex — try a smaller PDF.')
        }
        throw error
    } finally {
        clearTimeout(timer)
    }
}

export function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

export const MAX_FILE_SIZE = 50 * 1024 * 1024
export const SERVER_COMPRESS_LIMIT = 100 * 1024 * 1024
export const SERVER_PDF_TO_WORD_LIMIT = 5 * 1024 * 1024
export const CLIENT_PDF_LIMIT = 200 * 1024 * 1024
export const CLIENT_IMAGE_LIMIT = 100 * 1024 * 1024
