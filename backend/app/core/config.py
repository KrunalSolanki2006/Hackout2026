import os
import urllib.parse

class Settings:
    PROJECT_NAME: str = "Industrial Emission Leak-Point Detector & Circular Alternative Recommender API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = ""
    
    # MongoDB settings
    MONGODB_URL: str = os.getenv(
        "MONGODB_URL",
        "mongodb+srv://TriBuild:TriBuild%40%40%40%40123456@hackoutproject.lmqct02.mongodb.net/?appName=HackoutProject"
    )
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "hackout_emission_db")
    
    # JWT Auth settings
    JWT_SECRET: str = os.getenv("JWT_SECRET", "hackout2026_super_secret_jwt_key_987654321")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Path settings
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    DATASETS_DIR: str = os.path.join(os.path.dirname(BASE_DIR), "datasets")
    ML_MODEL_PATH: str = os.path.join(os.path.dirname(BASE_DIR), "ml", "models", "recommender_v1.joblib")

    @property
    def sanitized_mongodb_url(self) -> str:
        url = self.MONGODB_URL
        if "TriBuild@@@@123456" in url:
            encoded_pass = urllib.parse.quote_plus("TriBuild@@@@123456")
            url = url.replace("TriBuild@@@@123456", encoded_pass)
        return url

settings = Settings()
