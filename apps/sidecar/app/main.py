from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel, HttpUrl
import io
import httpx

app = FastAPI(title="Cymek Sidecar", version="0.1.0")


class ExtractResult(BaseModel):
    text: str
    metadata: dict


class UrlRequest(BaseModel):
    url: HttpUrl


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/extract/file", response_model=ExtractResult)
async def extract_file(file: UploadFile = File(...)):
    content = await file.read()
    filename = file.filename or "unknown"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    try:
        if ext == "pdf":
            import pdfplumber

            text_pages = []
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text() or ""
                    text_pages.append(page_text)
            text = "\n\n".join(text_pages)
            metadata = {"source": filename, "page_count": len(pdf.pages), "char_count": len(text)}
        elif ext in ("docx", "doc"):
            from docx import Document

            doc = Document(io.BytesIO(content))
            text = "\n".join(p.text for p in doc.paragraphs)
            metadata = {"source": filename, "page_count": len(doc.sections), "char_count": len(text)}
        else:
            text = content.decode("utf-8", errors="replace")
            metadata = {"source": filename, "page_count": 1, "char_count": len(text)}

        return ExtractResult(text=text, metadata=metadata)
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"Missing extraction library: {e.name}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/extract/url", response_model=ExtractResult)
async def extract_url(req: UrlRequest):
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(str(req.url))
            resp.raise_for_status()
            text = resp.text
            return ExtractResult(
                text=text,
                metadata={"source": str(req.url), "page_count": 1, "char_count": len(text)},
            )
    except httpx.HTTPError as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {e}")
