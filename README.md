# StuDenTools

A collection of free productivity tools built for students. Features GPA calculator, PDF tools, academic paraphraser, citation generator, timetable makers, and more.

## Features

- **GPA Calculator** – Calculate GPA on 4.0 or 5.0 scale
- **PDF Tools** – Convert, merge, split, and compress PDFs
- **Images to PDF** – Combine multiple images into a single PDF
- **Academic Paraphraser** – Rewrite text in formal academic tone (AI-powered)
- **Citation Generator** – Generate APA, IEEE, Harvard citations from DOI, URL, or title
- **Timetable Maker** – Create and visualize weekly class schedules
- **Unit Converter** – Convert common STEM units

## Tech Stack

**Backend:**
- Python 3.10+
- FastAPI
- Google Gemini AI (for paraphrasing)
- PyPDF2, pdf2docx, Pillow

**Frontend:**
- React 18+ (Vite)
- Vanilla CSS
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

## Project Structure

```
studentoolss/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── modules/             # API route handlers
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Environment template
├── frontend-react/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── tools/           # Individual tool pages
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