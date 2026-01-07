import os
import re
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import google.generativeai as genai
from dotenv import load_dotenv
from typing import Optional

load_dotenv()

router = APIRouter()


def get_api_key():
    return os.getenv("GEMINI_API_KEY", "")


DOI_PATTERN = r"^10\.\d{4,}/[^\s]+"
URL_PATTERN = r"^https?://"


class CitationRequest(BaseModel):
    input: str = Field(
        ...,
        min_length=3,
        max_length=500,
        description="DOI, URL, or paper title"
    )
    style: str = Field(
        default="apa",
        description="Citation style: apa, ieee, or harvard"
    )
    source_type: Optional[str] = Field(
        default=None,
        description="Source type: journal, website, or book (auto-detected if not provided)"
    )


class CitationResponse(BaseModel):
    citation: str
    detected_type: str
    input_type: str
    metadata: dict


def detect_input_type(input_text: str) -> str:
    """Detect if input is DOI, URL, or title."""
    input_text = input_text.strip()
    
    if input_text.startswith("doi:"):
        return "doi"
    if input_text.startswith("https://doi.org/") or input_text.startswith("http://doi.org/"):
        return "doi"
    if re.match(DOI_PATTERN, input_text):
        return "doi"
    
    if re.match(URL_PATTERN, input_text):
        return "url"
    
    return "title"


def extract_doi(input_text: str) -> str:
    """Extract clean DOI from various formats."""
    input_text = input_text.strip()
    
    if input_text.startswith("doi:"):
        return input_text[4:].strip()
    if input_text.startswith("https://doi.org/"):
        return input_text[16:]
    if input_text.startswith("http://doi.org/"):
        return input_text[15:]
    
    return input_text


async def fetch_crossref_by_doi(doi: str) -> dict:
    """Fetch metadata from CrossRef API using DOI."""
    url = f"https://api.crossref.org/works/{doi}"
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(url, headers={
            "User-Agent": "StuDenTools/1.0 (mailto:studentools@example.com)"
        })
        
        if response.status_code == 404:
            raise HTTPException(status_code=404, detail="DOI not found in CrossRef database")
        if response.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to fetch data from CrossRef")
        
        data = response.json()
        return data.get("message", {})


async def fetch_crossref_by_title(title: str) -> dict:
    """Search CrossRef API by paper title."""
    url = "https://api.crossref.org/works"
    params = {
        "query.title": title,
        "rows": 1,
        "select": "DOI,title,author,published-print,published-online,container-title,volume,issue,page,publisher,type"
    }
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(url, params=params, headers={
            "User-Agent": "StuDenTools/1.0 (mailto:studentools@example.com)"
        })
        
        if response.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to search CrossRef")
        
        data = response.json()
        items = data.get("message", {}).get("items", [])
        
        if not items:
            raise HTTPException(status_code=404, detail="No papers found matching that title")
        
        return items[0]


def parse_crossref_metadata(data: dict) -> dict:
    """Parse CrossRef response into standardized metadata."""
    authors = []
    for author in data.get("author", []):
        given = author.get("given", "")
        family = author.get("family", "")
        if family:
            authors.append({"given": given, "family": family})
    
    date_parts = None
    for date_field in ["published-print", "published-online", "created"]:
        if date_field in data and "date-parts" in data[date_field]:
            date_parts = data[date_field]["date-parts"][0]
            break
    
    year = date_parts[0] if date_parts and len(date_parts) > 0 else None
    month = date_parts[1] if date_parts and len(date_parts) > 1 else None
    day = date_parts[2] if date_parts and len(date_parts) > 2 else None
    
    title_list = data.get("title", [])
    title = title_list[0] if title_list else ""
    
    container_list = data.get("container-title", [])
    journal = container_list[0] if container_list else ""
    
    return {
        "title": title,
        "authors": authors,
        "year": year,
        "month": month,
        "day": day,
        "journal": journal,
        "volume": data.get("volume"),
        "issue": data.get("issue"),
        "pages": data.get("page"),
        "doi": data.get("DOI"),
        "publisher": data.get("publisher"),
        "type": data.get("type", "journal-article"),
        "url": f"https://doi.org/{data.get('DOI')}" if data.get("DOI") else None
    }


async def extract_url_metadata(url: str, api_key: str) -> dict:
    """Use Gemini to extract citation metadata from a URL."""
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is required for URL citation extraction"
        )
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    prompt = f"""Extract citation metadata from this URL for academic citation purposes.

URL: {url}

Return a JSON object with these fields (use null for unknown values):
{{
    "title": "page or article title",
    "authors": [{{"given": "First", "family": "Last"}}],
    "year": 2024,
    "month": 1,
    "day": 15,
    "site_name": "website name",
    "publisher": "organization name",
    "url": "{url}",
    "access_date": "2026-01-03",
    "type": "website"
}}

Return ONLY the JSON object, no other text."""

    response = model.generate_content(prompt)
    response.resolve()
    
    try:
        import json
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        
        metadata = json.loads(text.strip())
        metadata["type"] = "website"
        return metadata
    except (json.JSONDecodeError, AttributeError):
        return {
            "title": url,
            "authors": [],
            "year": 2026,
            "month": 1,
            "day": 3,
            "site_name": url.split("/")[2] if "/" in url else url,
            "url": url,
            "access_date": "2026-01-03",
            "type": "website"
        }


def format_citation_apa(metadata: dict) -> str:
    """Format citation in APA 7th edition style."""
    parts = []
    
    # Authors
    authors = metadata.get("authors", [])
    if authors:
        author_strings = []
        for i, author in enumerate(authors):
            family = author.get("family", "")
            given = author.get("given", "")
            if family:
                initials = "".join([n[0] + "." for n in given.split() if n]) if given else ""
                author_strings.append(f"{family}, {initials}".strip(", "))
        
        if len(author_strings) == 1:
            parts.append(author_strings[0])
        elif len(author_strings) == 2:
            parts.append(f"{author_strings[0]} & {author_strings[1]}")
        elif len(author_strings) > 2:
            parts.append(", ".join(author_strings[:-1]) + f", & {author_strings[-1]}")
    
    # Year
    year = metadata.get("year")
    if year:
        parts.append(f"({year}).")
    else:
        parts.append("(n.d.).")
    
    # Title
    title = metadata.get("title", "")
    if title:
        if metadata.get("type") == "website":
            parts.append(f"{title}.")
        else:
            parts.append(f"{title}.")

    journal = metadata.get("journal")
    if journal:
        journal_part = f"*{journal}*"
        volume = metadata.get("volume")
        issue = metadata.get("issue")
        if volume:
            journal_part += f", *{volume}*"
            if issue:
                journal_part += f"({issue})"
        pages = metadata.get("pages")
        if pages:
            journal_part += f", {pages}"
        parts.append(journal_part + ".")

    site_name = metadata.get("site_name")
    if site_name and metadata.get("type") == "website":
        parts.append(f"*{site_name}*.")

    doi = metadata.get("doi")
    url = metadata.get("url")
    if doi:
        parts.append(f"https://doi.org/{doi}")
    elif url and metadata.get("type") == "website":
        access_date = metadata.get("access_date", "")
        if access_date:
            parts.append(f"Retrieved {access_date}, from {url}")
        else:
            parts.append(url)
    
    return " ".join(parts)


def format_citation_ieee(metadata: dict) -> str:
    """Format citation in IEEE style."""
    parts = []

    authors = metadata.get("authors", [])
    if authors:
        author_strings = []
        for author in authors:
            family = author.get("family", "")
            given = author.get("given", "")
            if family:
                initials = " ".join([n[0] + "." for n in given.split() if n]) if given else ""
                author_strings.append(f"{initials} {family}".strip())
        
        if len(author_strings) <= 3:
            parts.append(", ".join(author_strings))
        else:
            parts.append(", ".join(author_strings[:3]) + " et al.")

    title = metadata.get("title", "")
    if title:
        if metadata.get("type") == "website":
            parts.append(f'"{title},"')
        else:
            parts.append(f'"{title},"')
    
    # Journal in italics
    journal = metadata.get("journal")
    if journal:
        journal_part = f"*{journal}*"
        parts.append(journal_part + ",")

    volume = metadata.get("volume")
    pages = metadata.get("pages")
    if volume:
        vol_str = f"vol. {volume}"
        issue = metadata.get("issue")
        if issue:
            vol_str += f", no. {issue}"
        if pages:
            vol_str += f", pp. {pages}"
        year = metadata.get("year")
        if year:
            vol_str += f", {year}"
        parts.append(vol_str + ".")
    elif metadata.get("year"):
        parts.append(f"{metadata.get('year')}.")
    
    # DOI
    doi = metadata.get("doi")
    if doi:
        parts.append(f"doi: {doi}.")

    url = metadata.get("url")
    if not doi and url and metadata.get("type") == "website":
        site = metadata.get("site_name", "")
        if site:
            parts.append(f"*{site}*.")
        access_date = metadata.get("access_date", "")
        parts.append(f"[Online]. Available: {url}")
        if access_date:
            parts.append(f"[Accessed: {access_date}].")
    
    return " ".join(parts)


def format_citation_harvard(metadata: dict) -> str:
    """Format citation in Harvard style."""
    parts = []
    
    # Authors
    authors = metadata.get("authors", [])
    if authors:
        author_strings = []
        for author in authors:
            family = author.get("family", "")
            given = author.get("given", "")
            if family:
                initials = "".join([n[0] + "." for n in given.split() if n]) if given else ""
                author_strings.append(f"{family}, {initials}".strip(", "))
        
        if len(author_strings) == 1:
            parts.append(author_strings[0])
        elif len(author_strings) == 2:
            parts.append(f"{author_strings[0]} and {author_strings[1]}")
        elif len(author_strings) > 2:
            parts.append(f"{author_strings[0]} et al.")
    
    # Year
    year = metadata.get("year")
    if year:
        parts.append(f"({year})")
    else:
        parts.append("(n.d.)")
    
    # Title
    title = metadata.get("title", "")
    if title:
        parts.append(f"'{title}',")
    
    # Journal in italics
    journal = metadata.get("journal")
    if journal:
        journal_part = f"*{journal}*"
        volume = metadata.get("volume")
        issue = metadata.get("issue")
        if volume:
            journal_part += f", {volume}"
            if issue:
                journal_part += f"({issue})"
        pages = metadata.get("pages")
        if pages:
            journal_part += f", pp. {pages}"
        parts.append(journal_part + ".")

    if metadata.get("type") == "website":
        site_name = metadata.get("site_name")
        if site_name:
            parts.append(f"*{site_name}*.")
        url = metadata.get("url")
        access_date = metadata.get("access_date")
        if url:
            parts.append(f"Available at: {url}")
            if access_date:
                parts.append(f"(Accessed: {access_date}).")
    
    # DOI
    doi = metadata.get("doi")
    if doi and metadata.get("type") != "website":
        parts.append(f"doi: {doi}.")
    
    return " ".join(parts)


def format_citation(metadata: dict, style: str) -> str:
    """Format metadata into citation based on style."""
    style = style.lower()
    
    if style == "apa":
        return format_citation_apa(metadata)
    elif style == "ieee":
        return format_citation_ieee(metadata)
    elif style == "harvard":
        return format_citation_harvard(metadata)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported citation style: {style}")


@router.post("/api/citation", response_model=CitationResponse)
async def generate_citation(request: CitationRequest):
    """
    Generate a formatted citation from DOI, URL, or paper title.
    
    - DOI: Uses CrossRef API for metadata
    - URL: Uses AI to extract metadata from page
    - Title: Searches CrossRef for matching papers
    
    Supported styles: APA, IEEE, Harvard
    """

    valid_styles = ["apa", "ieee", "harvard"]
    style = request.style.lower()
    if style not in valid_styles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid style. Must be one of: {', '.join(valid_styles)}"
        )

    input_type = detect_input_type(request.input)
    
    try:
        if input_type == "doi":
            doi = extract_doi(request.input)
            raw_data = await fetch_crossref_by_doi(doi)
            metadata = parse_crossref_metadata(raw_data)
            detected_type = metadata.get("type", "journal-article")
            
        elif input_type == "url":
            api_key = get_api_key()
            metadata = await extract_url_metadata(request.input, api_key)
            detected_type = "website"
            
        else:  # title search
            raw_data = await fetch_crossref_by_title(request.input)
            metadata = parse_crossref_metadata(raw_data)
            detected_type = metadata.get("type", "journal-article")

        if request.source_type:
            detected_type = request.source_type
            metadata["type"] = request.source_type

        citation = format_citation(metadata, style)
        
        return CitationResponse(
            citation=citation,
            detected_type=detected_type,
            input_type=input_type,
            metadata=metadata
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate citation: {str(e)}"
        )
