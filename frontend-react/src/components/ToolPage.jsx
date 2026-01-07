import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function ToolPage({ icon, title, seoTitle, seoDescription, children }) {
    useEffect(() => {
        // Set page title
        document.title = seoTitle || title

        // Set meta description
        let metaDescription = document.querySelector('meta[name="description"]')
        const originalDescription = metaDescription?.getAttribute('content') || ''

        if (seoDescription && metaDescription) {
            metaDescription.setAttribute('content', seoDescription)
        }

        return () => {
            document.title = 'Student Tools for GPA, Citations, PDFs & Coursework'
            if (metaDescription) {
                metaDescription.setAttribute('content', 'Free student utilities for GPA calculation, citation generation, PDF tools, unit conversion, and daily academic work. No sign-up, no clutter.')
            }
        }
    }, [seoTitle, seoDescription, title])

    return (
        <div className="tool-page">
            <div className="tool-page-header">
                <Link to="/" className="back-button">← Back</Link>
            </div>
            <div className="tool-page-content">
                <div className="tool-page-title">
                    <span className="tool-icon">{icon}</span>
                    <h1>{title}</h1>
                </div>
                {children}
            </div>
        </div>
    )
}
