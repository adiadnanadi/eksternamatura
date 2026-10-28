#!/usr/bin/env python3
"""Merge cover.pdf + kviz.pdf -> kviz-matematika.pdf (normalized to A4)."""
from pypdf import PdfReader, PdfWriter

A4_W, A4_H = 595.28, 841.89

def normalize_page_to_a4(page):
    box = page.mediabox
    w, h = float(box.width), float(box.height)
    if abs(w - A4_W) > 0.5 or abs(h - A4_H) > 0.5:
        page.scale_to(A4_W, A4_H)
    return page

writer = PdfWriter()
# normalize cover (px-based) to exact A4 before appending
cover_reader = PdfReader("/home/z/my-project/work/quiz/build/cover.pdf")
cover_page = normalize_page_to_a4(cover_reader.pages[0])
tmp_writer = PdfWriter()
tmp_writer.add_page(cover_page)
with open("/home/z/my-project/work/quiz/build/cover_a4.pdf", "wb") as f:
    tmp_writer.write(f)

# append() preserves link annotations (clickable TOC) and bookmarks
writer.append("/home/z/my-project/work/quiz/build/cover_a4.pdf")
writer.append("/home/z/my-project/work/quiz/build/kviz.pdf")

out = "/home/z/my-project/work/quiz/build/kviz-matematika.pdf"
with open(out, "wb") as f:
    writer.write(f)
print("merged ->", out, "pages:", len(writer.pages))

# Rebuild PDF outline (bookmarks): body toc shifted by +1 cover page
import fitz
body = fitz.open("/home/z/my-project/work/quiz/build/kviz.pdf")
body_toc = body.get_toc()  # [[level, title, page(1-based)], ...]
final = fitz.open(out)
new_toc = [[lvl, title, page + 1] for lvl, title, page in body_toc]
final.set_toc(new_toc)
final.saveIncr()
print("outline entries written:", len(new_toc))
