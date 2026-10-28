#!/usr/bin/env python3
"""Detailed inspection of the quiz Excel file."""
import openpyxl

wb = openpyxl.load_workbook('/home/z/my-project/upload/osnovnaSkolaPitanja.xlsx', data_only=True)

for name in ['BosanskiJezik', 'engleski jezik', 'Matematika']:
    ws = wb[name]
    print(f'===== {name} =====')
    # find last non-empty row in column A
    last = 0
    for r in range(1, ws.max_row + 1):
        v = ws.cell(row=r, column=1).value
        if v is not None and str(v).strip():
            last = r
    print('last non-empty row col A:', last)
    # print first 3 and last 2 data rows fully
    def show(r):
        vals = []
        for c in range(1, 9):
            v = ws.cell(row=r, column=c).value
            if v is None:
                vals.append(None)
            else:
                vals.append(str(v)[:60])
        print(f'row {r}:', vals)
    for r in list(range(1, 5)) + list(range(last - 1, last + 1)):
        show(r)
    # count rows where column A non-empty after header
    n = sum(1 for r in range(2, last + 1) if ws.cell(row=r, column=1).value and str(ws.cell(row=r, column=1).value).strip())
    print('question rows count:', n)
    print()

# check empty/None in option columns for bosanski
for name in ['BosanskiJezik', 'engleski jezik']:
    ws = wb[name]
    empty_opts = []
    for r in range(2, 1000):
        q = ws.cell(row=r, column=1).value
        if not q or not str(q).strip():
            continue
        missing = [c for c in range(2, 6) if not ws.cell(row=r, column=c).value or not str(ws.cell(row=c-0, column=c).value).strip()]
        if missing:
            empty_opts.append((r, missing))
    print(name, 'rows with empty options:', empty_opts[:20], 'total:', len(empty_opts))
