# StuDenTools

A collection of free productivity tools built for students. Features GPA calculator, PDF tools, academic paraphraser, citation generator, timetable makers, and more.

Many tools run **entirely in your browser** — no server upload needed, instant results, and works offline.

## Features

### Client-Side (runs in your browser)
- **GPA Calculator** – Calculate GPA on 4.0 or 5.0 scale
- **Image Converter** – Convert between PNG, JPG, and WebP formats
- **Images to PDF** – Combine multiple images into a single PDF
- **PDF Merge** – Combine multiple PDFs into one document
- **PDF Split** – Extract page ranges from a PDF
- **Timetable Maker** – Create and visualize weekly class schedules
- **Unit Converter** – Convert common STEM units

### Server-Side
- **PDF Compress** – Reduce PDF file size (hybrid: client validates, server compresses)
- **PDF to Word** – Convert PDF to editable Word document
- **Academic Paraphraser** – Rewrite text in formal academic tone (AI-powered)
- **Citation Generator** – Generate APA, IEEE, Harvard citations from DOI, URL, or title
- **Auto Timetable** – AI-powered schedule generation

## Tech Stack

**Backend:**
- Python 3.10+
- FastAPI
- OpenRouter AI (for paraphrasing & citations)
- PyPDF2, pdf2docx

**Frontend:**
- React 19 (Vite)
- Vanilla CSS
- [pdf-lib](https://pdf-lib.js.org/) – client-side PDF merge/split
- [jsPDF](https://github.com/parallax/jsPDF) – client-side image-to-PDF
- Canvas API – client-side image format conversion
- Vercel Analytics

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env
# Edit .env with your API keys

# Start the server
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

### Frontend Setup

```bash
cd frontend-react

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Environment Variables

Create a `.env` file in the `backend` directory:

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key for paraphrasing | Yes (for paraphraser) |
| `RESEND_API_KEY` | Resend API key for email notifications | No |
| `MAIL_TO` | Email address for feedback notifications | No |

## Architecture

Tools are split between **client-side** (browser) and **server-side** processing:

| Tool | Processing | Library | Max Size |
|------|-----------|---------|----------|
| GPA Calculator | Client | JS math | — |
| Image Converter | Client | Canvas API | 100MB |
| Images to PDF | Client | jsPDF | 200MB |
| PDF Merge | Client | pdf-lib | 200MB |
| PDF Split | Client | pdf-lib | 200MB |
| PDF Compress | Server | PyPDF2 | 100MB |
| PDF to Word | Server | pdf2docx | 10MB |
| Paraphraser | Server | OpenRouter AI | — |
| Citation Generator | Server | CrossRef + AI | — |

## Project Structure

```
StuDenTools/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── modules/             # Server-side tool handlers
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Environment template
├── frontend-react/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── tools/           # Tool pages (client + server)
│   │   ├── services/api.js  # API helpers & size limits
│   │   ├── App.jsx          # Main app with routing
│   │   └── index.css        # Global styles
│   └── package.json         # Node dependencies
└── README.md
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/)
- Frontend powered by [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- AI features powered by [Google Gemini](https://ai.google.dev/)