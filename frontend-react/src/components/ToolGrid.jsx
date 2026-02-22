import { Link } from 'react-router-dom'

const tools = [
    { id: 'gpa', icon: '∑', title: 'GPA Calculator', desc: 'Calculate your GPA instantly' },
    { id: 'unit-converter', icon: '⇌', title: 'Unit Converter', desc: 'Convert all STEM units' },
    { id: 'pdf-to-word', icon: '□→', title: 'PDF to Word', desc: 'Convert PDF to editable DOCX' },
    { id: 'pdf-merge', icon: '⊞', title: 'Merge PDFs', desc: 'Combine multiple PDFs into one' },
    { id: 'pdf-split', icon: '⊟', title: 'Split PDF', desc: 'Extract pages from PDF' },
    { id: 'pdf-compress', icon: '⊡', title: 'Compress PDF', desc: 'Reduce PDF file size' },
    { id: 'images-to-pdf', icon: '▣', title: 'Images to PDF', desc: 'Convert images to PDF' },
    { id: 'paraphrase', icon: '¶', title: 'Paraphraser', desc: 'Rephrase that assignment you want to dub' },
    { id: 'citation', icon: '❝', title: 'Citation Generator', desc: 'Generate APA, IEEE, Harvard citations' },
    { id: 'timetable', icon: '▦', title: 'Timetable Maker', desc: 'Build your weekly class schedule' },
    { id: 'auto-timetable', icon: '◈', title: 'Auto Timetable', desc: 'Auto-generate your optimal schedule' },
    { id: 'image-converter', icon: '⟳', title: 'Image Converter', desc: 'Convert between PNG, JPG, WEBP, BMP' },
    { id: 'feedback', icon: '✎', title: 'Request a Tool', desc: 'Tell us what you need' },
]

export default function ToolGrid() {
    return (
        <div className="tool-grid">
            {tools.map(tool => (
                <Link
                    key={tool.id}
                    to={`/${tool.id}`}
                    className="tool-card"
                >
                    {tool.isNew && <span className="new-badge">NEW</span>}
                    <div className="tool-icon">{tool.icon}</div>
                    <h2 className="tool-title">{tool.title}</h2>
                    <p className="tool-desc">{tool.desc}</p>
                </Link>
            ))}
        </div>
    )
}
