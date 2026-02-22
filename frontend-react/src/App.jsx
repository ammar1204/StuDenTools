import { Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import SEO from './components/SEO'
import Header from './components/Layout/Header'
import Footer from './components/Layout/Footer'
import ToolGrid from './components/ToolGrid'
import ToolPage from './components/ToolPage'
import ToastContainer from './components/Toast/ToastContainer'

// Tool Components
import GPACalculator from './tools/GPACalculator'
import UnitConverter from './tools/UnitConverter'
import PDFToWord from './tools/PDFToWord'
import PDFMerge from './tools/PDFMerge'
import PDFSplit from './tools/PDFSplit'
import PDFCompress from './tools/PDFCompress'
import ImagesToPDF from './tools/ImagesToPDF'
import Paraphraser from './tools/Paraphraser'
import CitationGenerator from './tools/CitationGenerator'
import Feedback from './tools/Feedback'
import TimetableMaker from './tools/TimetableMaker'
import AutoTimetable from './tools/AutoTimetable'
import ImageConverter from './tools/ImageConverter'

const tools = [
  {
    id: 'gpa',
    icon: '∑',
    title: 'GPA Calculator',
    seoTitle: 'GPA Calculator (4.0 & 5.0 Scale) for University Students',
    seoDescription: 'Calculate your GPA on a 4.0 or 5.0 scale using multiple courses. Built for university students who want quick, accurate results.',
    component: GPACalculator
  },
  {
    id: 'unit-converter',
    icon: '⇌',
    title: 'Unit Converter',
    seoTitle: 'STEM Unit Converter — Engineering & Science Units',
    seoDescription: 'Convert common STEM units including length, mass, temperature, energy, time, and data. Designed for engineering and science students.',
    component: UnitConverter
  },
  {
    id: 'pdf-to-word',
    icon: '□→',
    title: 'PDF to Word',
    seoTitle: 'PDF to Word Converter — Free & Accurate for Students',
    seoDescription: 'Convert PDF files into editable Word documents quickly and accurately. Useful for assignments and coursework.',
    component: PDFToWord
  },
  {
    id: 'pdf-merge',
    icon: '⊞',
    title: 'Merge PDFs',
    seoTitle: 'Merge PDF Files Online — Simple Student PDF Tool',
    seoDescription: 'Combine multiple PDF files into one document in seconds. Simple and free PDF merging for students.',
    component: PDFMerge
  },
  {
    id: 'pdf-split',
    icon: '⊟',
    title: 'Split PDF',
    seoTitle: 'Split PDF Pages Online — Extract Pages Easily',
    seoDescription: 'Extract specific pages or page ranges from a PDF file. Perfect for submitting only required sections.',
    component: PDFSplit
  },
  {
    id: 'pdf-compress',
    icon: '⊡',
    title: 'Compress PDF',
    seoTitle: 'Compress PDF Online — Reduce File Size Without Quality Loss',
    seoDescription: 'Reduce PDF file size while maintaining quality. Ideal for email submissions and online portals.',
    component: PDFCompress
  },
  {
    id: 'images-to-pdf',
    icon: '▣',
    title: 'Images to PDF',
    seoTitle: 'Images to PDF Converter — JPG & PNG to PDF',
    seoDescription: 'Convert JPG, PNG, and other images into a single PDF file. Fast image-to-PDF conversion for students.',
    component: ImagesToPDF
  },
  {
    id: 'paraphrase',
    icon: '¶',
    title: 'Paraphraser',
    seoTitle: 'Academic Paraphraser for Students (Clear & Plagiarism-Safe)',
    seoDescription: 'Rewrite academic text for clarity and proper tone. Helps students improve writing without changing meaning.',
    component: Paraphraser
  },
  {
    id: 'citation',
    icon: '❝',
    title: 'Citation Generator',
    seoTitle: 'Citation Generator for Students (APA, IEEE, Harvard)',
    seoDescription: 'Generate accurate APA, IEEE, and Harvard citations from DOI, URL, or title. Ideal for assignments, final-year projects, and research.',
    component: CitationGenerator
  },
  {
    id: 'timetable',
    icon: '▦',
    title: 'Timetable Maker',
    seoTitle: 'Timetable Maker for Students — Weekly Class Schedule Builder',
    seoDescription: 'Create and organize your weekly class timetable. Add courses, detect conflicts, and visualize your schedule.',
    component: TimetableMaker
  },
  {
    id: 'auto-timetable',
    icon: '◈',
    title: 'Auto Timetable',
    seoTitle: 'Auto Timetable Generator — Smart Schedule Builder',
    seoDescription: 'Automatically generate your optimal class timetable. Set constraints and preferences, and get a conflict-free schedule in seconds.',
    component: AutoTimetable
  },
  {
    id: 'image-converter',
    icon: '⟳',
    title: 'Image Converter',
    seoTitle: 'Image Format Converter — PNG, JPG, WEBP, BMP',
    seoDescription: 'Convert images between PNG, JPG, WEBP, and BMP formats. Fast, free image conversion for students.',
    component: ImageConverter
  },
  {
    id: 'feedback',
    icon: '✎',
    title: 'Request a Tool',
    seoTitle: 'Request a Tool or Give Feedback — Student Toolbox',
    seoDescription: 'Suggest new student tools or send feedback to help improve the platform. Built with students in mind.',
    component: Feedback
  },
]

function HomePage() {
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "StuDenTools",
    "url": "https://studentoolss.com/",
    "description": "A collection of useful tools for students."
  }

  return (
    <>
      <SEO
        title="Student Tools for GPA, Citations, PDFs & Coursework"
        description="Free student utilities for GPA calculation, citation generation, PDF tools, unit conversion, and daily academic work. No sign-up, no clutter."
        canonical="https://studentoolss.com/"
        jsonLd={websiteJsonLd}
      />
      <Header />
      <main className="main">
        <div className="container">
          <ToolGrid />
        </div>
      </main>
      <Footer />
    </>
  )
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        {tools.map(tool => (
          <Route
            key={tool.id}
            path={`/${tool.id}`}
            element={
              <ToolPage
                icon={tool.icon}
                title={tool.title}
                seoTitle={tool.seoTitle}
                seoDescription={tool.seoDescription}
                path={`/${tool.id}`}
              >
                <tool.component />
              </ToolPage>
            }
          />
        ))}
      </Routes>
      <ToastContainer />
      <Analytics />
    </>
  )
}

export default App
