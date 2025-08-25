# FastAPI Attendance System Backend

This is a FastAPI backend for an attendance management system with user authentication.

## Features

- User registration and login
- JWT-based authentication
- PostgreSQL database integration
- CORS support for frontend integration
- Docker support for easy deployment

## Setup Instructions

### Option 1: Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fastapi-backend
   ```

2. **Run the setup script**
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

3. **Configure the environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Set up the database**
   - Make sure PostgreSQL is installed and running
   - Create a database named `attendance_db`
   - Update the `DATABASE_URL` in `.env` file

5. **Run the application**
   ```bash
   source venv/bin/activate
   python main.py
   ```

### Option 2: Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fastapi-backend
   ```

2. **Run with Docker Compose**
   ```bash
   docker-compose up --build
   ```

This will start both the PostgreSQL database and the FastAPI application.

## API Endpoints

### Authentication

- `POST /register` - Register a new user
- `POST /token` - Login and get access token
- `GET /users/me` - Get current user information (requires authentication)

### API Documentation

When the server is running, you can access:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI Schema**: http://localhost:8000/openapi.json

## Usage Examples

### Register a new user

```bash
curl -X POST "http://localhost:8000/register" \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com","password":"securepassword"}'
```

### Login and get token

```bash
curl -X POST "http://localhost:8000/token" \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com","password":"securepassword"}'
```

### Access protected endpoint

```bash
curl -X GET "http://localhost:8000/users/me" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Project Structure

```
fastapi-backend/
├── main.py                 # Main application file
├── config.py              # Configuration settings
├── database.py            # Database configuration
├── models.py              # SQLAlchemy models
├── schemas.py             # Pydantic schemas
├── crud.py                # CRUD operations
├── security.py            # Security utilities
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
├── setup.sh              # Setup script
├── Dockerfile            # Docker configuration
├── docker-compose.yml    # Docker Compose configuration
└── README.md             # This file
```

## Security Features

- **Password Hashing**: Uses bcrypt for secure password storage
- **JWT Authentication**: Stateless authentication with JWT tokens
- **CORS Protection**: Configured for frontend integration
- **Input Validation**: Pydantic schemas for request/response validation

## Database Schema

### Users Table
- `id`: Primary key
- `email`: Unique email address
- `hashed_password`: Bcrypt-hashed password
- `is_active`: User status (default: true)
- `created_at`: Account creation timestamp
- `updated_at`: Last update timestamp

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `SECRET_KEY` | JWT secret key | Required |
| `ALGORITHM` | JWT algorithm | HS256 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiration time | 30 |
| `HOST` | Server host | 0.0.0.0 |
| `PORT` | Server port | 8000 |
| `DEBUG` | Debug mode | True |

## Development

### Adding New Endpoints

1. Define new schemas in `schemas.py`
2. Add CRUD operations in `crud.py`
3. Create endpoints in `main.py`
4. Add authentication middleware where needed

### Running Tests

```bash
# Activate virtual environment
source venv/bin/activate

# Run tests (if you have test files)
pytest
```

## License

This project is licensed under the MIT License.