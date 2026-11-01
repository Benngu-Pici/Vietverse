"""
Chạy bộ test case Vietverse qua API AI (Flask local) và điền kết quả vào file Excel.

Cài đặt:   pip install pandas openpyxl requests
Chạy thử:  python test_ai.py bo_test.xlsx --limit 3
Chạy hết:  python test_ai.py bo_test.xlsx
Tùy chọn:  python test_ai.py vao.csv ra.xlsx --limit 10 --delay 2.5

File vào: .xlsx (khuyên dùng) hoặc .csv (UTF-8). Script tự tìm các cột:
  - "Câu hỏi gọi API"                -> câu hỏi gửi cho AI
  - "Đầu ra API (dán nguyên văn)"    -> script điền câu trả lời của AI vào đây
  - "Kết luận"                       -> script đổi "Chưa chạy" thành "Đã chạy" / "Lỗi gọi API"
Các cột chấm điểm (Chính xác, Đầy đủ, ...) giữ nguyên để bạn chấm tay.
"""

import argparse
import io
import re
import sys
import time
import unicodedata

import pandas as pd
import requests

API_URL = "http://localhost:3001/api/chat"
TIMEOUT_S = 60
MAX_RETRY = 3
SAVE_EVERY = 10


def norm(s):
    s = unicodedata.normalize("NFD", str(s).lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", s.replace("đ", "d")).strip()


def read_input(path):
    if path.lower().endswith((".xlsx", ".xlsm", ".xls")):
        return pd.read_excel(path, dtype=str).fillna("")
    raw = open(path, "rb").read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("cp1258", errors="replace")
        print("CẢNH BÁO: file CSV không phải UTF-8, đã đọc bằng cp1258.")
    first = text.splitlines()[0]
    sep = ";" if first.count(";") > first.count(",") else ","
    return pd.read_csv(io.StringIO(text), sep=sep, dtype=str, keep_default_na=False)


def find_col(df, keys, fallback_idx):
    for col in df.columns:
        if all(k in norm(col) for k in keys):
            return col
    return df.columns[fallback_idx] if fallback_idx < len(df.columns) else None


def looks_corrupted(questions):
    """Câu hỏi bị mất dấu tiếng Việt sẽ có dấu '?' nằm giữa chữ."""
    bad = sum(1 for q in questions if re.search(r"\w\?\w", q))
    return bad, len(questions)


def ask(question):
    last_err, secs = "", 0
    for attempt in range(1, MAX_RETRY + 1):
        t0 = time.time()
        try:
            res = requests.post(
                API_URL,
                json={"messages": [{"role": "user", "content": question}]},
                timeout=TIMEOUT_S,
            )
            secs = round(time.time() - t0, 2)
            if res.status_code == 429:
                last_err = "429 rate limit"
                time.sleep(30)
                continue
            data = res.json()
            if res.ok and data.get("reply"):
                return data["reply"].strip(), "", secs
            last_err = f"HTTP {res.status_code}: {data.get('error', 'không rõ lỗi')}"
        except Exception as e:  # noqa: BLE001
            secs = round(time.time() - t0, 2)
            last_err = f"{type(e).__name__}: {e}"
        time.sleep(3 * attempt)
    return "", last_err, secs


def save(df, path):
    with pd.ExcelWriter(path, engine="openpyxl") as w:
        df.to_excel(w, index=False, sheet_name="Kết quả")
        ws = w.sheets["Kết quả"]
        from openpyxl.styles import Alignment
        for col in ws.columns:
            letter = col[0].column_letter
            ws.column_dimensions[letter].width = 18
            for cell in col:
                cell.alignment = Alignment(wrap_text=True, vertical="top")
        ws.freeze_panes = "B2"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("output", nargs="?", default="results.xlsx")
    ap.add_argument("--limit", type=int, default=0, help="chỉ chạy N câu đầu để thử")
    ap.add_argument("--delay", type=float, default=2.5, help="giây nghỉ giữa các câu")
    ap.add_argument("--force", action="store_true", help="chạy dù file bị lỗi dấu")
    args = ap.parse_args()

    df = read_input(args.input)
    q_col = find_col(df, ["cau hoi", "api"], 4)
    out_col = find_col(df, ["dau ra", "api"], 11)
    kl_col = find_col(df, ["ket luan"], 18)

    questions = df[q_col].astype(str).tolist()
    bad, total = looks_corrupted(questions)
    if bad > total * 0.2 and not args.force:
        print(f"DỪNG: {bad}/{total} câu hỏi bị mất dấu tiếng Việt (chữ bị thay bằng '?').")
        print("Hãy xuất lại file bằng 'CSV UTF-8' hoặc dùng file .xlsx rồi chạy lại.")
        print("(Thêm --force nếu vẫn muốn chạy.)")
        sys.exit(1)

    for c in (out_col, kl_col):
        df[c] = df[c].astype(object)
    df["Thời gian (s)"] = pd.Series([""] * len(df), index=df.index, dtype=object)
    df["Lỗi gọi API"] = pd.Series([""] * len(df), index=df.index, dtype=object)

    todo = list(df.index)[: args.limit] if args.limit else list(df.index)
    print(f"Chạy {len(todo)}/{len(df)} câu | cột câu hỏi: '{q_col}' | cột đầu ra: '{out_col}'")

    for n, i in enumerate(todo, 1):
        q = str(df.at[i, q_col]).strip()
        if not q:
            continue
        reply, err, secs = ask(q)
        df.at[i, out_col] = reply
        df.at[i, "Thời gian (s)"] = secs
        df.at[i, "Lỗi gọi API"] = err
        if kl_col:
            df.at[i, kl_col] = "Lỗi gọi API" if err else "Đã chạy"
        print(f"[{n}/{len(todo)}] {'LỖI' if err else 'ok '} {secs:>5}s | {q[:60]}")
        if n % SAVE_EVERY == 0:
            save(df, args.output)
        time.sleep(args.delay)

    save(df, args.output)
    n_err = int((df["Lỗi gọi API"] != "").sum())
    print(f"\nXong! Đã ghi '{args.output}' ({n_err} câu lỗi).")


if __name__ == "__main__":
    main()
