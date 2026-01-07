# Contributing to StuDenTools

Thank you for your interest in contributing to StuDenTools! This guide will help you get started.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/studentoolss.git
   cd studentoolss
   ```
3. Set up the development environment (see [README.md](README.md) for detailed instructions)

## Design Principles

**Minimal AI Usage**: This project follows a principle of minimal AI integration. Only add AI-powered features when they provide significant, clear value that cannot be reasonably achieved with traditional methods. AI should enhance the user experience meaningfully, not be added for novelty.

Current AI features:
- **Paraphraser** – Requires language understanding for academic tone conversion

When proposing new features, consider whether AI is truly necessary or if a simpler solution would suffice.

## Development Workflow

### Creating a Branch

Create a feature branch from `main`:

```bash
git checkout -b feature/your-feature-name
# or for bug fixes:
git checkout -b fix/bug-description
```

### Making Changes

**Backend (Python/FastAPI):**
- Follow PEP 8 style guidelines
- Add new modules in `backend/modules/`
- Register new routes in `backend/main.py`

**Frontend (React):**
- Create tool components in `frontend-react/src/tools/`
- Add reusable components in `frontend-react/src/components/`
- Follow existing component patterns and naming conventions

### Committing

Write clear, descriptive commit messages:

```bash
git commit -m "Add: new feature description"
git commit -m "Fix: bug description"
git commit -m "Update: what was changed"
```

## Submitting a Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Open a Pull Request against the `main` branch
3. Fill out the PR template with:
   - Description of changes
   - Related issue (if applicable)
   - Screenshots for UI changes

## Code Style

### Python
- Use meaningful variable and function names
- Keep functions focused and concise
- Use type hints where appropriate

### JavaScript/React
- Use functional components with hooks
- Keep components modular and reusable
- Use descriptive prop names

## Adding a New Tool

1. **Backend**: Create a new module in `backend/modules/`
2. **Backend**: Add routes in `backend/main.py`
3. **Frontend**: Create a tool component in `frontend-react/src/tools/`
4. **Frontend**: Add the tool to `App.jsx` routing
5. **Frontend**: Add the tool card to `ToolGrid.jsx`

## Reporting Issues

When reporting bugs, please include:
- Steps to reproduce
- Expected vs actual behavior
- Browser/OS information
- Screenshots if applicable

## Questions?

Feel free to open an issue for any questions about contributing.
