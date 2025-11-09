# config.py
import os
from dotenv import load_dotenv

# Disable LangSmith telemetry to prevent "Failed to send telemetry event" errors
os.environ["LANGCHAIN_TRACING_V2"] = "false"
os.environ["LANGCHAIN_ENDPOINT"] = ""

# Disable ChromaDB telemetry (PostHog) to prevent telemetry errors
os.environ["ANONYMIZED_TELEMETRY"] = "False"

load_dotenv()

# Environment Variables
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
VECTOR_DIR = os.getenv("VECTOR_DIR", "./chroma_db")
POLICY_MODEL_PATH = os.getenv("POLICY_MODEL_PATH", "./models/policy_model.pkl")
TEMPERATURE = float(os.getenv("TEMPERATURE", "0.1"))
PORT = int(os.getenv("PORT", "8001"))

# CORS Configuration - restrict to specific origins for security
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS if origin.strip()]

if not GEMINI_API_KEY:
    raise RuntimeError("Set GEMINI_API_KEY in .env")

