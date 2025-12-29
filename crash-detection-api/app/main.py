from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from app.config import get_settings
from app.services.database import connect_to_mongo, close_mongo_connection
from app.services.crash_detector import CrashDetector
from app.routes import crash_detection

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    logger.info("Starting Crash Detection API...")

    # Connect to MongoDB
    await connect_to_mongo()

    # Initialize crash detector
    try:
        detector = CrashDetector(model_path=settings.model_path)
        crash_detection.set_crash_detector(detector)
        logger.info("Crash detector initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize crash detector: {e}")
        raise

    logger.info(f"{settings.app_name} v{settings.version} started successfully")

    yield

    # Shutdown
    logger.info("Shutting down...")
    await close_mongo_connection()


app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="Real-time crash detection API using ML autoencoder model",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this based on your frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(crash_detection.router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": f"{settings.app_name} is running",
        "version": settings.version,
        "endpoints": {
            "crash_detection": "/api/crash-detection/detect",
            "health": "/api/crash-detection/health",
            "events": "/api/crash-detection/events",
            "docs": "/docs",
            "redoc": "/redoc"
        }
    }


@app.get("/health")
async def health():
    """General health check"""
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.version
    }
