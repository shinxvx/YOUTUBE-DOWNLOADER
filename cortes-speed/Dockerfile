FROM denoland/deno:bin AS deno
FROM python:3.12-slim
# ffmpeg (corte, legenda ASS com libass, vídeo em pé), deno (desafios JS do YouTube no yt-dlp), OpenCV (rosto), faster-whisper (reserva da Groq)
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg curl fonts-dejavu-core && rm -rf /var/lib/apt/lists/* \
 && pip install --no-cache-dir fastapi "uvicorn[standard]" requests numpy opencv-python-headless faster-whisper \
      "yt-dlp[default]" bgutil-ytdlp-pot-provider \
 && useradd -u 1000 -m cortes
COPY --from=deno /deno /usr/local/bin/deno
# fontes das legendas e detector de rosto (YuNet, OpenCV Zoo)
RUN mkdir -p /app/fontes /app/modelos \
 && curl -fsSL -o /app/fontes/Anton-Regular.ttf https://github.com/google/fonts/raw/main/ofl/anton/Anton-Regular.ttf \
 && curl -fsSL -o /app/fontes/Montserrat-ExtraBold.ttf https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-ExtraBold.ttf \
 && curl -fsSL -o /app/modelos/face_detection_yunet_2023mar.onnx https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx \
 && python -c "import cv2; d=cv2.FaceDetectorYN.create('/app/modelos/face_detection_yunet_2023mar.onnx','',(320,240)); print('yunet ok')"
ENV PYTHONUNBUFFERED=1 HOME=/data HF_HOME=/data/hf
WORKDIR /app
COPY app/ .
RUN cp /app/fontes/Anton-Regular.ttf /app/public/fonts/ 2>/dev/null || true
USER cortes
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "4110", "--proxy-headers", "--forwarded-allow-ips", "*", "--timeout-keep-alive", "30"]
