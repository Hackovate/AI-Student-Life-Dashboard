# Security Documentation

This document outlines the security measures implemented in the Momentum AI Student Dashboard application.

## Security Features

### 1. Authentication & Authorization

- **JWT Tokens**: All API endpoints (except registration/login) require JWT authentication
- **Token Validation**: JWT_SECRET is required and validated at startup - no fallback values
- **Password Security**: Passwords are hashed using bcrypt with 10 rounds
- **Token Expiry**: JWT tokens expire after 7 days (configurable via JWT_EXPIRES_IN)

### 2. Rate Limiting

- **Authentication Endpoints**: Limited to 5 requests per 15 minutes per IP
- **API Endpoints**: Limited to 100 requests per 15 minutes per IP
- **Protection**: Prevents brute force attacks and API abuse

### 3. CORS Configuration

- **Backend**: Restricted to CLIENT_URL (required in production)
- **AI Service**: Restricted to ALLOWED_ORIGINS environment variable
- **Default**: Development allows localhost:3000 and localhost:5173

### 4. WebSocket Security

- **Authentication Required**: WebSocket connections require JWT token verification
- **Token Validation**: Tokens are verified against JWT_SECRET before connection
- **User Isolation**: Users can only connect to their own WebSocket streams

### 5. Input Validation

- **Request Size Limits**: 10MB limit on request bodies to prevent DoS attacks
- **Express Validator**: All inputs are validated using express-validator
- **SQL Injection Protection**: Prisma ORM prevents SQL injection attacks

### 6. Security Headers

- **Helmet.js**: Implements security headers including:
  - Content Security Policy (CSP)
  - X-Content-Type-Options
  - X-Frame-Options
  - X-XSS-Protection
  - Strict-Transport-Security (in production)

### 7. Error Handling

- **Production Mode**: Stack traces are not exposed in production
- **Generic Messages**: Error messages don't reveal internal implementation details
- **Logging**: Errors are logged server-side without exposing sensitive data

### 8. Environment Variables

- **Required in Production**: 
  - `JWT_SECRET` - Must be set (no fallback)
  - `CLIENT_URL` - Must be set in production
  - `DATABASE_URL` - Must be set in production
- **Validation**: Application exits if required variables are missing in production

### 9. Health Check Endpoints

- **Minimal Information**: Health checks don't expose sensitive information
- **Model Names**: Only exposed in development mode

## Environment Variables

### Backend (.env)

```env
# Required
JWT_SECRET=your-secret-key-here  # MUST be set, no fallback
DATABASE_URL=postgresql://...     # Required in production
CLIENT_URL=http://localhost:3000  # Required in production

# Optional
PORT=5000
JWT_EXPIRES_IN=7d
NODE_ENV=production
```

### AI Service (.env)

```env
# Required
GEMINI_API_KEY=your-api-key-here

# Optional
GEMINI_MODEL=gemini-2.5-flash
PORT=8001
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
JWT_SECRET=your-secret-key-here  # Must match backend JWT_SECRET for WebSocket auth
ENVIRONMENT=production
```

## Deployment Checklist

Before deploying to production:

1. ✅ Set strong `JWT_SECRET` (minimum 32 characters, random)
2. ✅ Set `CLIENT_URL` to your production frontend URL
3. ✅ Set `DATABASE_URL` to your production database
4. ✅ Set `NODE_ENV=production`
5. ✅ Set `ALLOWED_ORIGINS` in AI service to production URLs
6. ✅ Set `JWT_SECRET` in AI service (must match backend)
7. ✅ Verify `.env` files are not committed to git
8. ✅ Enable HTTPS for all services
9. ✅ Configure firewall rules
10. ✅ Set up monitoring and logging

## Security Best Practices

1. **Never commit `.env` files** - They are in `.gitignore`
2. **Use strong secrets** - Generate random strings for JWT_SECRET
3. **Rotate secrets regularly** - Change JWT_SECRET periodically
4. **Monitor rate limits** - Watch for unusual traffic patterns
5. **Keep dependencies updated** - Regularly update npm/pip packages
6. **Use HTTPS** - Always use HTTPS in production
7. **Regular backups** - Backup database regularly
8. **Access logs** - Monitor access logs for suspicious activity

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:
- Do not create public GitHub issues for security vulnerabilities
- Contact the maintainers directly
- Allow time for the issue to be addressed before public disclosure

## Updates

This document is updated as security measures are added or modified.

Last updated: 2024

