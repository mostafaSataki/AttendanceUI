# Project Management API Documentation

## Overview
This API provides endpoints for managing projects, lists, and cards in a project management system. All endpoints require authentication using JWT tokens.

## Base URL
```
http://localhost:3000/api
```

## Authentication
All protected endpoints require a JWT token. The token can be provided in two ways:
1. **HTTP-only Cookie**: Set automatically after login
2. **Authorization Header**: `Authorization: Bearer <token>`

## Response Format
All responses follow this format:
```json
{
  "message": "Success message",
  "data": {},
  "error": null
}
```

Error responses:
```json
{
  "error": "Error message"
}
```

---

## Authentication Endpoints

### Register User
**POST** `/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**Response (201 Created):**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "createdAt": "string"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields or invalid password length
- `409 Conflict`: User with email or username already exists
- `500 Internal Server Error`: Server error

---

### Login User
**POST** `/auth/login`

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "string",
    "username": "string",
    "email": "string"
  },
  "token": "string"
}
```

**Error Responses:**
- `400 Bad Request`: Missing email or password
- `401 Unauthorized`: Invalid credentials
- `500 Internal Server Error`: Server error

---

## User Endpoints

### Get User Profile
**GET** `/users/profile`

Get current user's profile information.

**Response (200 OK):**
```json
{
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "name": "string",
    "createdAt": "string"
  }
}
```

**Error Responses:**
- `400 Bad Request`: User ID is required
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

---

## Project Endpoints

### Get All Projects
**GET** `/projects`

Get all projects for the authenticated user.

**Response (200 OK):**
```json
{
  "projects": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "createdAt": "string",
      "updatedAt": "string",
      "owner": {
        "id": "string",
        "username": "string",
        "email": "string"
      },
      "lists": [
        {
          "id": "string",
          "title": "string",
          "position": "number",
          "createdAt": "string",
          "updatedAt": "string",
          "cards": [
            {
              "id": "string",
              "title": "string",
              "description": "string",
              "position": "number",
              "createdAt": "string",
              "updatedAt": "string"
            }
          ]
        }
      ]
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request`: User ID is required
- `500 Internal Server Error`: Server error

---

### Create Project
**POST** `/projects`

Create a new project.

**Request Body:**
```json
{
  "name": "string",
  "description": "string (optional)"
}
```

**Response (201 Created):**
```json
{
  "message": "Project created successfully",
  "project": {
    "id": "string",
    "name": "string",
    "description": "string",
    "createdAt": "string",
    "updatedAt": "string",
    "owner": {
      "id": "string",
      "username": "string",
      "email": "string"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request`: Project name is required
- `500 Internal Server Error`: Server error

---

### Get Project by ID
**GET** `/projects/:id`

Get a specific project by ID.

**Response (200 OK):**
```json
{
  "project": {
    "id": "string",
    "name": "string",
    "description": "string",
    "createdAt": "string",
    "updatedAt": "string",
    "owner": {
      "id": "string",
      "username": "string",
      "email": "string"
    },
    "lists": [
      {
        "id": "string",
        "title": "string",
        "position": "number",
        "createdAt": "string",
        "updatedAt": "string",
        "cards": [
          {
            "id": "string",
            "title": "string",
            "description": "string",
            "position": "number",
            "createdAt": "string",
            "updatedAt": "string"
          }
        ]
      }
    ]
  }
}
```

**Error Responses:**
- `400 Bad Request`: User ID is required
- `404 Not Found`: Project not found or access denied
- `500 Internal Server Error`: Server error

---

### Update Project
**PUT** `/projects/:id`

Update a project's information.

**Request Body:**
```json
{
  "name": "string",
  "description": "string (optional)"
}
```

**Response (200 OK):**
```json
{
  "message": "Project updated successfully",
  "project": {
    "id": "string",
    "name": "string",
    "description": "string",
    "createdAt": "string",
    "updatedAt": "string",
    "owner": {
      "id": "string",
      "username": "string",
      "email": "string"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request`: User ID is required or project name is required
- `404 Not Found`: Project not found or access denied
- `500 Internal Server Error`: Server error

---

### Delete Project
**DELETE** `/projects/:id`

Delete a project and all its associated lists and cards.

**Response (200 OK):**
```json
{
  "message": "Project deleted successfully"
}
```

**Error Responses:**
- `400 Bad Request`: User ID is required
- `404 Not Found`: Project not found or access denied
- `500 Internal Server Error`: Server error

---

## List Endpoints

### Get Project Lists
**GET** `/projects/:projectId/lists`

Get all lists for a specific project.

**Response (200 OK):**
```json
{
  "lists": [
    {
      "id": "string",
      "title": "string",
      "position": "number",
      "createdAt": "string",
      "updatedAt": "string",
      "cards": [
        {
          "id": "string",
          "title": "string",
          "description": "string",
          "position": "number",
          "createdAt": "string",
          "updatedAt": "string"
        }
      ]
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request`: User ID is required
- `404 Not Found`: Project not found or access denied
- `500 Internal Server Error`: Server error

---

### Create Project List
**POST** `/projects/:projectId/lists`

Create a new list in a specific project.

**Request Body:**
```json
{
  "title": "string"
}
```

**Response (201 Created):**
```json
{
  "message": "List created successfully",
  "list": {
    "id": "string",
    "title": "string",
    "position": "number",
    "createdAt": "string",
    "updatedAt": "string",
    "cards": []
  }
}
```

**Error Responses:**
- `400 Bad Request`: User ID is required or list title is required
- `404 Not Found`: Project not found or access denied
- `500 Internal Server Error`: Server error

---

### Update List
**PUT** `/lists/:id`

Update a list's information.

**Request Body:**
```json
{
  "title": "string",
  "position": "number (optional)"
}
```

**Response (200 OK):**
```json
{
  "message": "List updated successfully",
  "list": {
    "id": "string",
    "title": "string",
    "position": "number",
    "createdAt": "string",
    "updatedAt": "string",
    "cards": []
  }
}
```

**Error Responses:**
- `400 Bad Request`: User ID is required or list title is required
- `404 Not Found`: List not found or access denied
- `500 Internal Server Error`: Server error

---

### Delete List
**DELETE** `/lists/:id`

Delete a list and all its associated cards.

**Response (200 OK):**
```json
{
  "message": "List deleted successfully"
}
```

**Error Responses:**
- `400 Bad Request`: User ID is required
- `404 Not Found`: List not found or access denied
- `500 Internal Server Error`: Server error

---

## Card Endpoints

### Get List Cards
**GET** `/lists/:listId/cards`

Get all cards for a specific list.

**Response (200 OK):**
```json
{
  "cards": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "position": "number",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request`: User ID is required
- `404 Not Found`: List not found or access denied
- `500 Internal Server Error`: Server error

---

### Create List Card
**POST** `/lists/:listId/cards`

Create a new card in a specific list.

**Request Body:**
```json
{
  "title": "string",
  "description": "string (optional)"
}
```

**Response (201 Created):**
```json
{
  "message": "Card created successfully",
  "card": {
    "id": "string",
    "title": "string",
    "description": "string",
    "position": "number",
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

**Error Responses:**
- `400 Bad Request`: User ID is required or card title is required
- `404 Not Found`: List not found or access denied
- `500 Internal Server Error`: Server error

---

### Get Card Details
**GET** `/cards/:cardId/details`

Get detailed information about a specific card.

**Response (200 OK):**
```json
{
  "card": {
    "id": "string",
    "title": "string",
    "description": "string",
    "position": "number",
    "createdAt": "string",
    "updatedAt": "string",
    "list": {
      "id": "string",
      "title": "string",
      "position": "number",
      "project": {
        "id": "string",
        "name": "string",
        "description": "string"
      }
    }
  }
}
```

**Error Responses:**
- `400 Bad Request`: User ID is required
- `404 Not Found`: Card not found or access denied
- `500 Internal Server Error`: Server error

---

### Update Card
**PUT** `/cards/:id`

Update a card's information.

**Request Body:**
```json
{
  "title": "string",
  "description": "string (optional)",
  "position": "number (optional)",
  "listId": "string (optional)"
}
```

**Response (200 OK):**
```json
{
  "message": "Card updated successfully",
  "card": {
    "id": "string",
    "title": "string",
    "description": "string",
    "position": "number",
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

**Error Responses:**
- `400 Bad Request`: User ID is required or card title is required
- `404 Not Found`: Card not found or access denied
- `500 Internal Server Error`: Server error

---

### Delete Card
**DELETE** `/cards/:id`

Delete a card.

**Response (200 OK):**
```json
{
  "message": "Card deleted successfully"
}
```

**Error Responses:**
- `400 Bad Request`: User ID is required
- `404 Not Found`: Card not found or access denied
- `500 Internal Server Error`: Server error

---

### Move Card
**PUT** `/cards/:cardId/move`

Move a card to a different list and/or position.

**Request Body:**
```json
{
  "newListId": "string",
  "position": "number (optional)"
}
```

**Response (200 OK):**
```json
{
  "message": "Card moved successfully",
  "card": {
    "id": "string",
    "title": "string",
    "description": "string",
    "position": "number",
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

**Error Responses:**
- `400 Bad Request`: User ID is required or new list ID is required
- `404 Not Found`: Card or target list not found or access denied
- `500 Internal Server Error`: Server error

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid request data |
| 401 | Unauthorized - Authentication required |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 500 | Internal Server Error - Server error |

---

## Usage Examples

### JavaScript/TypeScript Example
```javascript
// Register user
const register = async () => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: 'john_doe',
      email: 'john@example.com',
      password: 'password123'
    })
  });
  return await response.json();
};

// Login user
const login = async () => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'john@example.com',
      password: 'password123'
    })
  });
  return await response.json();
};

// Create project
const createProject = async (token) => {
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'My Project',
      description: 'A sample project'
    })
  });
  return await response.json();
};

// Move card
const moveCard = async (token, cardId, newListId, position) => {
  const response = await fetch(`/api/cards/${cardId}/move`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      newListId: newListId,
      position: position
    })
  });
  return await response.json();
};
```

### cURL Examples
```bash
# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"john_doe","email":"john@example.com","password":"password123"}'

# Login user
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'

# Create project
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"My Project","description":"A sample project"}'

# Move card
curl -X PUT http://localhost:3000/api/cards/CARD_ID/move \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"newListId":"NEW_LIST_ID","position":0}'
```