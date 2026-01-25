import { Link } from 'react-router-dom'
import SEO from './SEO'

export default function ToolPage({ icon, title, seoTitle, seoDescription, path, children }) {
    const canonicalUrl = `https://studentoolss.com${path}`

    // Construct JSON-LD for the software application/tool
    const toolJsonLd = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": seoTitle || title,
        "description": seoDescription,
        "applicationCategory": "EducationalApplication",
        "operatingSystem": "Any",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        }
    }


    return (
        <div className="tool-page">
            <SEO
                title={seoTitle || title}
                description={seoDescription}
                canonical={canonicalUrl}
                jsonLd={toolJsonLd}
            />
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
