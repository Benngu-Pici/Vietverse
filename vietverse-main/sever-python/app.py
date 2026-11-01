import os
import sys

# Đảm bảo thư mục gốc được đưa vào sys.path để import app.py từ root
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from app import app, PORT

if __name__ == "__main__":
    print(f"Vietverse Flask backend đang chạy tại http://0.0.0.0:{PORT}")
    app.run(host="0.0.0.0", port=PORT, debug=False)