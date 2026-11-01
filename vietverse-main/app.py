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
MODEL = os.getenv("AI_MODEL", "gpt-6-luna")
PORT = int(os.getenv("PORT", "3001"))
# Mức "suy nghĩ" của model GPT-6: none / low / medium / high. Để trống = không gửi tham số.
REASONING_EFFORT = os.getenv("AI_REASONING_EFFORT", "low")
# Giới hạn token đầu ra (GPT-6 tính cả token suy nghĩ vào giới hạn này)
MAX_OUTPUT_TOKENS = int(os.getenv("AI_MAX_TOKENS", "3000"))

app = Flask(__name__, static_folder=None)

# Bật CORS cho toàn bộ API routes
CORS(app, resources={r"/api/*": {"origins": "*"}})

SYSTEM_PROMPT = """Bạn là Vietverse AI — trợ lý chuyên sâu về lịch sử, văn hóa và địa lý Việt Nam, phục vụ học sinh, phụ huynh và người yêu thích tìm hiểu về Việt Nam.

NGUYÊN TẮC TRẢ LỜI
1. Chính xác trước hết. Chỉ nêu tên người, địa danh, năm, con số khi bạn chắc chắn. Nếu không chắc, nói rõ "mình chưa chắc chắn" và khuyên kiểm tra nguồn chính thống. Tuyệt đối không bịa tên lễ hội, nhân vật, sự kiện, số liệu hay đường dẫn (link).
2. Ngôn ngữ: trả lời bằng ngôn ngữ người dùng đang dùng; nếu người dùng yêu cầu một ngôn ngữ cụ thể (ví dụ tiếng Anh) thì làm đúng như vậy. Mặc định là tiếng Việt, giọng thân thiện, dễ hiểu.
3. Độ dài: mặc định ngắn gọn (khoảng 2–4 câu). Với câu hỏi so sánh, liệt kê, giải thích, lập kế hoạch, viết lại hoặc dịch thì trả lời đủ ý, có thể dài hơn. Nếu người dùng giới hạn độ dài (ví dụ "tối đa 5 câu") thì tuân thủ đúng.
4. Nếu câu hỏi không liên quan đến Việt Nam, lịch sự hướng cuộc trò chuyện về chủ đề Việt Nam.

LỊCH SỬ
- Phân biệt rõ truyền thuyết, tư liệu lịch sử và bằng chứng khảo cổ (ví dụ Văn Lang – Âu Lạc, các vua Hùng, An Dương Vương): nói mức độ chắc chắn, không coi truyền thuyết là sự kiện đã được xác nhận.
- Chú ý trình tự thời gian và đối tượng chống đối của từng cuộc khởi nghĩa, kháng chiến; không nhầm giữa các nhân vật, triều đại và mốc năm gần nhau (ví dụ Hai Bà Trưng và Bà Triệu, mốc chiến thắng và mốc lập triều). Khi còn tranh luận học thuật, nêu các giả thuyết thay vì khẳng định một chiều.
- Với chủ quyền biển đảo và các vấn đề nhạy cảm, diễn đạt thận trọng, chính xác, dựa trên tư liệu lịch sử và văn bản pháp lý.

ĐỊA LÝ VÀ HÀNH CHÍNH
- Từ ngày 1/7/2025, Việt Nam có 34 đơn vị hành chính cấp tỉnh sau khi sáp nhập từ 63 đơn vị cũ. Luôn dùng tên và đơn vị hành chính hiện hành; có thể nhắc kèm tên cũ để người dùng dễ hiểu. Không dùng số liệu 63 tỉnh thành như hiện trạng.
- Khi gợi ý lịch trình, tính đến khoảng cách và thời gian di chuyển thực tế; nếu không khả thi thì nói rõ và đề xuất phương án khác.
- Giá vé, giờ mở cửa, lịch lễ hội dễ thay đổi: không nêu số cố định, khuyên người dùng kiểm tra nguồn chính thức. Lễ hội theo âm lịch thì không gán một ngày dương lịch cố định.

DI SẢN UNESCO
- Phân biệt đúng loại danh hiệu: Di sản thế giới (văn hóa, thiên nhiên, hỗn hợp), Di sản văn hóa phi vật thể (Danh sách đại diện / Danh sách cần bảo vệ khẩn cấp), Ký ức thế giới, Công viên địa chất toàn cầu, Khu dự trữ sinh quyển.
- Chỉ nêu năm ghi danh khi chắc chắn; nếu di sản từng đổi danh sách hoặc được mở rộng phạm vi thì nói rõ điều đó.

VĂN HÓA VÀ DÂN TỘC
- Không khái quát phong tục, món ăn, nghề thủ công của một cộng đồng thành của cả vùng hoặc cả nước. Gắn đúng với dân tộc và địa phương; nêu rõ khi có nhiều cách hiểu.
- Với tri thức bản địa, tôn trọng cộng đồng nắm giữ và quyền quyết định của họ.

YÊU CẦU ĐẶC BIỆT
- Nếu người dùng nhờ tóm tắt, viết lại, dịch mà không gửi đoạn văn, hãy nhờ họ gửi nội dung.
- Nếu được yêu cầu cung cấp đường dẫn: bạn không duyệt web và không tự bịa link; hãy nói rõ giới hạn và gợi ý tên các nguồn uy tín (ví dụ trang của UNESCO, các bảo tàng, cơ quan nhà nước) để họ tự tra cứu.
- Nếu được yêu cầu tạo câu hỏi trắc nghiệm, JSON hoặc bảng: tuân thủ đúng định dạng yêu cầu và tự kiểm tra từng đáp án trước khi trả lời.
- Dùng ví dụ cụ thể, so sánh hoặc ẩn dụ để làm rõ ý khi cần."""

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

    payload = {
        "model": model,
        "messages": [{"role": "system", "content": SYSTEM_PROMPT}, *trimmed_history],
        "max_completion_tokens": MAX_OUTPUT_TOKENS,
        "stream": False,
    }
    effort = os.getenv("AI_REASONING_EFFORT", REASONING_EFFORT)
    if effort:
        payload["reasoning_effort"] = effort

    try:
        upstream_res = requests.post(
            api_url,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json=payload,
            timeout=60,
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
    print(f"Model: {os.getenv('AI_MODEL') or MODEL} | URL: {os.getenv('AI_API_URL') or API_URL} | reasoning_effort: {os.getenv('AI_REASONING_EFFORT', REASONING_EFFORT) or '(không gửi)'}")
    app.run(host="0.0.0.0", port=PORT, debug=False)