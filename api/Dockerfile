FROM python:3.11-alpine

WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

# Install Typst 0.14.2 musl binary (x86_64, correct for NAS)
RUN wget -qO /tmp/typst.tar.xz \
    https://github.com/typst/typst/releases/download/v0.14.2/typst-x86_64-unknown-linux-musl.tar.xz \
  && tar -xf /tmp/typst.tar.xz -C /tmp \
  && mv /tmp/typst-x86_64-unknown-linux-musl/typst /usr/local/bin/typst \
  && chmod +x /usr/local/bin/typst \
  && rm -rf /tmp/typst*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV TYPST_PATH=/usr/local/bin/typst
ENV RESUME_ROOT=/data/resume
ENV API_PORT=8001

EXPOSE 8001

CMD ["python", "main.py"]
