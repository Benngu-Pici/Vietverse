import os
import time
from collections import defaultdict, deque

import requests
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

# Thư mục gốc của project
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

# Nạp file .env từ root hoặc sever-python nếu có
load_dotenv(os.path.join(ROOT_DIR, ".env"))
load_dotenv(os.path.join(ROOT_DIR, "sever-python", ".env"))

API_KEY = os.getenv("AI_API_KEY")
API_URL = os.getenv("AI_API_URL", "https://api.openai.com/v1/chat/completions")
MODEL = os.getenv("AI_MODEL", "gpt-4o-mini")
PORT = int(os.getenv("PORT", "3001"))

app = Flask(__name__, static_folder=None)

# Bật CORS cho toàn bộ API routes
CORS(app, resources={r"/api/*": {"origins": "*"}})

SYSTEM_PROMPT = """Bạn là Vietverse AI — một trợ lý thông minh chuyên sâu về lịch sử, văn hóa và địa lý Việt Nam.
Nhiệm vụ của bạn:
- Giải thích các sự kiện lịch sử Việt Nam một cách chính xác, sinh động và dễ hiểu.
- Chia sẻ kiến thức về văn hóa, phong tục, lễ hội, ẩm thực, nghệ thuật dân gian của các vùng miền Việt Nam.
- Mô tả địa lý, danh lam thắng cảnh, di sản thế giới và các địa điểm đặc sắc trên khắp Việt Nam.
- Luôn trả lời bằng tiếng Việt, thân thiện, nhiệt tình và chính xác.
- Nếu câu hỏi không liên quan đến Việt Nam, hãy lịch sự hướng cuộc trò chuyện về chủ đề Việt Nam.

Hãy trả lời 1 cách ngắn gọn, dễ hiểu, tốt nhất là ngắn dưới 50 từ, trừ khi câu hỏi yêu cầu giải thích chi tiết. Sử dụng ví dụ cụ thể, so sánh hoặc ẩn dụ để làm rõ ý nếu cần."""

RATE_LIMIT_WINDOW_S = 60
RATE_LIMIT_MAX = 30
_request_log = defaultdict(deque)


def is_rate_limited(ip: str) -> bool:
    now = time.time()
    log = _request_log[ip]
    while log and now - log[0] > RATE_LIMIT_WINDOW_S:
        log.popleft()
    log.append(now)
    return len(log) > RATE_LIMIT_MAX


# ---------------------------------------------------------------------
# BACKEND API ROUTES
# ---------------------------------------------------------------------
@app.get("/api/health")
def health():
    return jsonify(status="ok", ok=True)


@app.route("/api/chat", methods=["POST", "OPTIONS"])
def chat():
    if request.method == "OPTIONS":
        return "", 200

    api_key = os.getenv("AI_API_KEY") or API_KEY
    api_url = os.getenv("AI_API_URL") or API_URL
    model = os.getenv("AI_MODEL") or MODEL

    if not api_key:
        return jsonify(error="Server chưa cấu hình AI_API_KEY trong biến môi trường."), 500

    forwarded = request.headers.get("X-Forwarded-For")
    ip = forwarded.split(",")[0].strip() if forwarded else request.remote_addr

    if is_rate_limited(ip):
        return jsonify(error="Bạn gửi quá nhiều yêu cầu, thử lại sau ít phút."), 429

    body = request.get_json(silent=True) or {}
    messages = body.get("messages")
    if not isinstance(messages, list) or len(messages) == 0:
        return jsonify(error='Thiếu trường "messages" hợp lệ.'), 400

    trimmed_history = messages[-10:]

    try:
        upstream_res = requests.post(
            api_url,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json={
                "model": model,
                "messages": [{"role": "system", "content": SYSTEM_PROMPT}, *trimmed_history],
                "max_tokens": 1500,
                "stream": False,
            },
            timeout=40,
        )
    except requests.RequestException as e:
        return jsonify(error=f"Không thể kết nối tới nhà cung cấp AI: {e}"), 502

    data = upstream_res.json() if upstream_res.content else None

    if not upstream_res.ok:
        upstream_msg = (
            data.get("error", {}).get("message")
            if data and isinstance(data, dict)
            else f"Lỗi HTTP {upstream_res.status_code} từ nhà cung cấp AI."
        )
        return jsonify(error=upstream_msg), upstream_res.status_code

    # Bóc tách JSON linh hoạt (OpenAI, Gemini, Custom API)
    reply = None
    if data and isinstance(data, dict):
        if "choices" in data and len(data["choices"]) > 0:
            reply = data["choices"][0].get("message", {}).get("content")
        elif "candidates" in data and len(data["candidates"]) > 0:
            reply = data["candidates"][0].get("content", {}).get("parts", [{}])[0].get("text")

    if not reply:
        return jsonify(error="Phản hồi từ nhà cung cấp AI không đúng định dạng."), 502

    return jsonify(reply=reply)


# ---------------------------------------------------------------------
# FRONTEND ROUTES & STATIC FILES
# ---------------------------------------------------------------------
@app.route("/")
def index():
    return send_from_directory(ROOT_DIR, "index.html")


@app.route("/<path:path>")
def serve_file_or_page(path):
    target_path = os.path.join(ROOT_DIR, path)
    if os.path.isfile(target_path):
        return send_from_directory(ROOT_DIR, path)

    # Hỗ trợ truy cập đường dẫn gọn (ví dụ: /explore -> explore.html)
    html_file = f"{path}.html"
    html_path = os.path.join(ROOT_DIR, html_file)
    if os.path.isfile(html_path):
        return send_from_directory(ROOT_DIR, html_file)

    return jsonify(error="Not Found"), 404


if __name__ == "__main__":
    print(f"Vietverse Flask backend đang chạy tại http://0.0.0.0:{PORT}")
    app.run(host="0.0.0.0", port=PORT, debug=False)
