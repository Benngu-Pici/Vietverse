# 1. Chọn môi trường gốc (Base Image) có sẵn Python
FROM python:3.10-slim

# 2. Đặt thư mục làm việc bên trong container
WORKDIR /app

# 3. Sao chép danh sách thư viện vào container trước để tận dụng bộ nhớ đệm (cache)
COPY requirements.txt /app/

# 4. Cài đặt các thư viện phụ thuộc
RUN pip install --no-cache-dir -r requirements.txt

# 5. Sao chép toàn bộ mã nguồn còn lại của dự án vào container
COPY . /app

# 6. Mở cổng mạng để container có thể nhận request từ bên ngoài
EXPOSE 7860

# 7. Lệnh mặc định sẽ chạy khi container khởi động
CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:7860", "app:app"]