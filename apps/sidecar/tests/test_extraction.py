"""Placeholder extraction tests — will be expanded when extraction logic is implemented."""

from pathlib import Path

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_sample_txt_fixture_exists():
    path = FIXTURES_DIR / "sample.txt"
    assert path.exists(), "sample.txt fixture not found"
    text = path.read_text()
    assert len(text) > 50, "fixture file is too short"
    assert "Cymek" in text, "fixture lacks expected content"
