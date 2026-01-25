import { useEffect } from 'react'

export default function SEO({
    title,
    description,
    canonical,
    type = 'website',
    image = '/logo.png', // Default image
    jsonLd
}) {
    useEffect(() => {
        // Update Title
        if (title) {
            document.title = title
        }

        // Helper to update or create meta tags
        const updateMeta = (name, content, attribute = 'name') => {
            if (!content) return
            let element = document.querySelector(`meta[${attribute}="${name}"]`)
            if (!element) {
                element = document.createElement('meta')
                element.setAttribute(attribute, name)
                document.head.appendChild(element)
            }
            element.setAttribute('content', content)
        }

        // Helper to update canonical link
        const updateCanonical = (url) => {
            if (!url) return
            let element = document.querySelector('link[rel="canonical"]')
            if (!element) {
                element = document.createElement('link')
                element.setAttribute('rel', 'canonical')
                document.head.appendChild(element)
            }
            element.setAttribute('href', url)
        }

        // Helper to update JSON-LD
        const updateJsonLd = (data) => {
            if (!data) return
            const SCRIPT_ID = 'seo-json-ld'
            let element = document.getElementById(SCRIPT_ID)
            if (!element) {
                element = document.createElement('script')
                element.setAttribute('type', 'application/ld+json')
                element.setAttribute('id', SCRIPT_ID)
                document.head.appendChild(element)
            }
            element.textContent = JSON.stringify(data)
        }

        // Update Standard Meta Tags
        updateMeta('description', description)

        // Update Open Graph Tags
        updateMeta('og:title', title, 'property')
        updateMeta('og:description', description, 'property')
        updateMeta('og:type', type, 'property')
        updateMeta('og:url', canonical, 'property')
        updateMeta('og:image', image.startsWith('http') ? image : `https://studentoolss.com${image}`, 'property')
        updateMeta('og:site_name', 'StuDenTools', 'property')

        // Update Twitter Card Tags
        updateMeta('twitter:card', 'summary_large_image')
        updateMeta('twitter:title', title)
        updateMeta('twitter:description', description)
        updateMeta('twitter:image', image.startsWith('http') ? image : `https://studentoolss.com${image}`)

        // Update Canonical
        updateCanonical(canonical)

        // Update JSON-LD
        updateJsonLd(jsonLd)

        // Cleanup function (optional, but good for Single Page Apps)
        return () => {
            // Ideally we revert to defaults, but simpler to just let the next page overwrite.
            // However, cleaning up JSON-LD is good practice to avoid stale data.
            const jsonLdScript = document.getElementById('seo-json-ld')
            if (jsonLdScript) {
                jsonLdScript.textContent = ''
            }
        }
    }, [title, description, canonical, type, image, jsonLd])

    return null
}
