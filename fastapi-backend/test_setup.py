"""
Test script to verify FastAPI backend setup
"""

import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Test if all modules can be imported successfully"""
    try:
        print("Testing imports...")
        
        # Test config
        from config import settings
        print("✓ Config imported successfully")
        
        # Test database
        from database import engine, get_db
        print("✓ Database module imported successfully")
        
        # Test models
        from models import User
        print("✓ Models imported successfully")
        
        # Test schemas
        from schemas import UserCreate, User, Token
        print("✓ Schemas imported successfully")
        
        # Test security
        from security import get_password_hash, verify_password, create_access_token
        print("✓ Security module imported successfully")
        
        # Test CRUD
        from crud import create_user, get_user_by_email, authenticate_user
        print("✓ CRUD module imported successfully")
        
        # Test FastAPI
        from fastapi import FastAPI
        print("✓ FastAPI imported successfully")
        
        print("\n🎉 All imports successful! The FastAPI backend is ready to use.")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def test_password_hashing():
    """Test password hashing functionality"""
    try:
        print("\nTesting password hashing...")
        
        from security import get_password_hash, verify_password
        
        password = "test_password_123"
        hashed = get_password_hash(password)
        
        print(f"Original password: {password}")
        print(f"Hashed password: {hashed}")
        
        # Verify the password
        is_valid = verify_password(password, hashed)
        print(f"Password verification: {'✓ Valid' if is_valid else '❌ Invalid'}")
        
        # Test with wrong password
        is_valid_wrong = verify_password("wrong_password", hashed)
        print(f"Wrong password verification: {'✓ Valid' if not is_valid_wrong else '❌ Should be invalid'}")
        
        return True
        
    except Exception as e:
        print(f"❌ Password hashing test failed: {e}")
        return False

def test_jwt_token():
    """Test JWT token creation"""
    try:
        print("\nTesting JWT token creation...")
        
        from security import create_access_token
        
        test_data = {"sub": "test@example.com"}
        token = create_access_token(data=test_data)
        
        print(f"Test data: {test_data}")
        print(f"Generated token: {token}")
        print("✓ JWT token created successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ JWT token test failed: {e}")
        return False

if __name__ == "__main__":
    print("FastAPI Backend Setup Test")
    print("=" * 40)
    
    success = True
    
    # Run all tests
    success &= test_imports()
    success &= test_password_hashing()
    success &= test_jwt_token()
    
    print("\n" + "=" * 40)
    if success:
        print("🎉 All tests passed! The FastAPI backend is ready to use.")
        print("\nNext steps:")
        print("1. Set up your PostgreSQL database")
        print("2. Update the .env file with your database credentials")
        print("3. Run 'python main.py' to start the server")
        print("4. Visit http://localhost:8000/docs for API documentation")
    else:
        print("❌ Some tests failed. Please check the error messages above.")
        sys.exit(1)