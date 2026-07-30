# Stage 1: Build React Frontend static bundle
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend ./
ENV VITE_API_BASE_URL=/
RUN npm run build

# Stage 2: Production Python Runtime
FROM python:3.10-slim AS runtime
WORKDIR /app

# Install Astral uv for fast dependency resolution
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy backend dependencies
COPY backend/pyproject.toml backend/uv.lock* ./backend/
WORKDIR /app/backend
RUN uv sync --no-dev

# Copy backend application source
COPY backend /app/backend

# Copy built frontend dist from Stage 1 into /app/frontend/dist
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Expose HTTP port 8000
EXPOSE 8000
ENV PORT=8000

CMD ["uv", "run", "python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
