from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.core.database import get_database
from app.core.auth import get_password_hash, verify_password, create_access_token, get_current_user
from app.schemas.schemas import UserRegister, UserLogin, UserResponse, Token

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_211_CREATED if hasattr(status, "HTTP_211_CREATED") else 201)
async def register_user(
    user_data: UserRegister,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    email = user_data.email.lower().strip()
    existing_user = await db.users.find_one({"email": email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error_code": "duplicate_user", "message": "User with this email already exists"}
        )

    user_doc = {
        "name": user_data.name.strip(),
        "email": email,
        "password_hash": get_password_hash(user_data.password),
        "role": user_data.role.lower(),
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    return UserResponse(
        id=user_id,
        name=user_doc["name"],
        email=user_doc["email"],
        role=user_doc["role"],
        created_at=user_doc["created_at"]
    )

@router.post("/login", response_model=Token)
async def login_user(
    credentials: UserLogin,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    email = credentials.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "invalid_credentials", "message": "Invalid email or password"}
        )

    user_id = str(user["_id"])
    access_token = create_access_token(data={"sub": user_id, "email": user["email"], "role": user.get("role", "operator")})

    user_resp = UserResponse(
        id=user_id,
        name=user["name"],
        email=user["email"],
        role=user.get("role", "operator"),
        created_at=user.get("created_at", datetime.utcnow())
    )

    return Token(access_token=access_token, token_type="bearer", user=user_resp)

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        role=current_user.get("role", "operator"),
        created_at=current_user.get("created_at", datetime.utcnow())
    )
