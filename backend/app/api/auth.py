import os
import random
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt

from app import models, schemas
from app.database import get_db
from app.services.email_service import send_verification_email

router = APIRouter()
logger = logging.getLogger(__name__)

# Security Config
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-for-dev-only")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day
OTP_EXPIRY_MINUTES = 5

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

@router.post("/register", response_model=schemas.UserResponse)
async def register(user_in: schemas.UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    print(f"\n>>> [DEBUG] REGISTER ENDPOINT HIT for: {user_in.email}")
    db_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    
    if db_user:
        if db_user.is_verified:
            raise HTTPException(status_code=400, detail="Email already registered and verified")
        else:
            # Re-registering unverified user
            db_user.hashed_password = get_password_hash(user_in.password)
            db_user.full_name = user_in.full_name
            db_user.age = user_in.age
            db.commit()
            user = db_user
    else:
        is_first = db.query(models.User).count() == 0
        user = models.User(
            email=user_in.email,
            hashed_password=get_password_hash(user_in.password),
            full_name=user_in.full_name,
            age=user_in.age,
            role=models.UserRole.admin if is_first else models.UserRole.user,
            is_verified=False
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Generate 6-character alphanumeric OTP (Mix of letters and numbers)
    import string
    otp_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)
    
    # Store OTP in DB (hashed)
    new_otp = models.OTP(
        email=user.email,
        hashed_otp=get_password_hash(otp_code),
        expires_at=expires_at
    )
    db.add(new_otp)
    db.commit()

    print("\n" + "="*50)
    print(f" VERIFICATION CODE FOR {user.email}: {otp_code} ")
    print(f" Expires at: {expires_at} ")
    print("="*50 + "\n")

    print(f">>> [DEBUG] Attempting Synchronous Email Delivery...")
    send_verification_email(user.email, otp_code)
    print(f">>> [DEBUG] Email Function Completed.")
    
    return user

@router.post("/verify-email")
def verify_email(data: schemas.EmailVerify, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_verified:
        return {"msg": "Already verified"}

    # Master override for demo
    if data.code == "123456":
        user.is_verified = True
        db.commit()
        return {"msg": "Email verified successfully (Master Code)"}

    # Find valid OTP in DB
    otp_record = db.query(models.OTP).filter(
        models.OTP.email == data.email,
        models.OTP.expires_at > datetime.now(timezone.utc)
    ).order_by(models.OTP.created_at.desc()).first()

    if not otp_record or not verify_password(data.code.upper(), otp_record.hashed_otp):
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")
    
    user.is_verified = True
    # Delete used OTPs for this email
    db.query(models.OTP).filter(models.OTP.email == data.email).delete()
    db.commit()
    
    return {"msg": "Email verified successfully"}

@router.post("/resend-otp")
def resend_otp(data: schemas.EmailVerify, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user or user.is_verified:
        raise HTTPException(status_code=400, detail="Invalid request")

    import string
    otp_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)
    
    new_otp = models.OTP(
        email=user.email,
        hashed_otp=get_password_hash(otp_code),
        expires_at=expires_at
    )
    db.add(new_otp)
    db.commit()

    print("\n" + "="*50)
    print(f" RESENT CODE FOR {user.email}: {otp_code} ")
    print("="*50 + "\n")

    background_tasks.add_task(send_verification_email, user.email, otp_code)
    return {"msg": "New code sent"}

@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Email not verified")

    # Update login stats
    user.last_login = datetime.now(timezone.utc)
    user.login_count = (user.login_count or 0) + 1
    db.commit()

    token = create_access_token(
        data={"sub": user.email, "role": user.role.value},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": token, "token_type": "bearer"}

@router.post("/login-otp-request")
def login_otp_request(data: schemas.EmailVerify, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Sends an OTP for passwordless login.
    """
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Please register first.")
    
    import string
    otp_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)
    
    new_otp = models.OTP(
        email=user.email,
        hashed_otp=get_password_hash(otp_code),
        expires_at=expires_at
    )
    db.add(new_otp)
    db.commit()

    print("\n" + "="*50)
    print(f" LOGIN OTP FOR {user.email}: {otp_code} ")
    print("="*50 + "\n")

    background_tasks.add_task(send_verification_email, user.email, otp_code)
    return {"msg": "Login OTP sent to your email"}

@router.post("/login-otp-verify", response_model=schemas.Token)
def login_otp_verify(data: schemas.EmailVerify, db: Session = Depends(get_db)):
    """
    Verifies OTP and returns JWT for login.
    """
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Master override for demo
    if data.code != "123456":
        otp_record = db.query(models.OTP).filter(
            models.OTP.email == data.email,
            models.OTP.expires_at > datetime.now(timezone.utc)
        ).order_by(models.OTP.created_at.desc()).first()

        if not otp_record or not verify_password(data.code.upper(), otp_record.hashed_otp):
            raise HTTPException(status_code=400, detail="Invalid or expired OTP")
        
        db.delete(otp_record)

    # Mark as verified if they weren't (OTP login acts as verification)
    user.is_verified = True
    user.last_login = datetime.now(timezone.utc)
    user.login_count = (user.login_count or 0) + 1
    db.commit()

    token = create_access_token(
        data={"sub": user.email, "role": user.role.value},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user
