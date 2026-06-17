"""Integration tests for sidecar extraction endpoints (PDF, TXT, DOCX, URL)."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestTxtExtraction:
    def test_extracts_text_and_metadata(self, sample_txt_bytes, sample_txt_filename):
        res = client.post(
            "/extract/file",
            files={"file": (sample_txt_filename, sample_txt_bytes, "text/plain")},
        )
        assert res.status_code == 200
        data = res.json()
        assert "Cymek" in data["text"]
        assert data["metadata"]["source"] == sample_txt_filename
        assert data["metadata"]["char_count"] > 50
        assert data["metadata"]["page_count"] == 1

    def test_metadata_char_count_matches_text_length(self, long_txt_bytes, long_txt_filename):
        res = client.post(
            "/extract/file",
            files={"file": (long_txt_filename, long_txt_bytes, "text/plain")},
        )
        assert res.status_code == 200
        data = res.json()
        expected_len = len(long_txt_bytes.decode("utf-8"))
        assert data["metadata"]["char_count"] == expected_len
        assert len(data["text"]) == expected_len


class TestPdfExtraction:
    def test_extracts_text_and_metadata(self, sample_pdf_bytes, sample_pdf_filename):
        res = client.post(
            "/extract/file",
            files={"file": (sample_pdf_filename, sample_pdf_bytes, "application/pdf")},
        )
        assert res.status_code == 200
        data = res.json()
        assert "Cymek" in data["text"]
        assert data["metadata"]["source"] == sample_pdf_filename
        assert data["metadata"]["page_count"] >= 1
        assert data["metadata"]["char_count"] > 0

    def test_multiline_pdf_produces_text(self):
        """PDF with multiple lines/newline-separated content extracts correctly."""
        from tests.conftest import _generate_minimal_pdf

        pdf_bytes = _generate_minimal_pdf("Line one.\nLine two.\nLine three.")
        res = client.post(
            "/extract/file",
            files={"file": ("multi.pdf", pdf_bytes, "application/pdf")},
        )
        assert res.status_code == 200
        data = res.json()
        assert "Line one" in data["text"] or "Line two" in data["text"]


class TestDocxExtraction:
    def test_extracts_text_and_metadata(self, sample_docx_bytes, sample_docx_filename):
        res = client.post(
            "/extract/file",
            files={"file": (sample_docx_filename, sample_docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        )
        assert res.status_code == 200
        data = res.json()
        assert "Cymek" in data["text"]
        assert data["metadata"]["source"] == sample_docx_filename
        assert data["metadata"]["char_count"] > 0

    def test_preserves_multiple_paragraphs(self, sample_docx_bytes):
        res = client.post(
            "/extract/file",
            files={"file": ("test.docx", sample_docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        )
        data = res.json()
        assert "multiple paragraphs" in data["text"].lower()


class TestUrlExtraction:
    def test_returns_error_for_unreachable_url(self):
        res = client.post(
            "/extract/url",
            json={"url": "http://localhost:1/nonexistent"},
        )
        assert res.status_code == 400

    def test_validates_url_format(self):
        res = client.post(
            "/extract/url",
            json={"url": "not-a-url"},
        )
        assert res.status_code == 422


class TestGeneralBehavior:
    def test_health_returns_ok(self):
        res = client.get("/health")
        assert res.status_code == 200
        assert res.json() == {"status": "ok"}

    def test_unsupported_file_extension_falls_back_to_text(self):
        content = b"Just some text content"
        res = client.post(
            "/extract/file",
            files={"file": ("data.csv", content, "text/csv")},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["text"] == "Just some text content"
        assert data["metadata"]["char_count"] == len(content)

    def test_empty_file_returns_empty_text(self):
        res = client.post(
            "/extract/file",
            files={"file": ("empty.txt", b"", "text/plain")},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["text"] == ""
        assert data["metadata"]["char_count"] == 0
