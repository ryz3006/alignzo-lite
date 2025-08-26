# Redis Environment Variables Setup Guide

## 🚀 **Redis Integration Overview**

This guide explains how to configure Redis environment variables for the Alignzo Lite application's Kanban board caching system. Redis is used to improve performance by caching frequently accessed data with intelligent data management and automatic fallback to the database.

---

## 🔧 **Required Environment Variables**

### **Redis Connection Variables**

These variables are used to connect to your Redis instance. The application checks for both variables to provide flexibility:

```bash
# Primary Redis connection URL
STORAGE_REDIS_URL=redis://username:password@host:port

# Alternative Redis connection URL (fallback)
STORAGE_URL=redis://username:password@host:port
```

### **Variable Details**

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `STORAGE_REDIS_URL` | String | Yes | Primary Redis connection URL |
| `STORAGE_URL` | String | No | Alternative Redis connection URL |

---

## 🌍 **Environment Configuration**

### **Local Development (.env.local)**

Create or update your `.env.local` file:

```env
# Redis Configuration
STORAGE_REDIS_URL=redis://localhost:6379
STORAGE_URL=redis://localhost:6379
```

### **Vercel Deployment**

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

```bash
Name: STORAGE_REDIS_URL
Value: redis://username:password@host:port
Environments: ☑ Production ☑ Preview ☑ Development

Name: STORAGE_URL
Value: redis://username:password@host:port
Environments: ☑ Production ☑ Preview ☑ Development
```

### **GitHub Actions (if applicable)**

Add to your GitHub repository secrets:

```bash
STORAGE_REDIS_URL=redis://username:password@host:port
STORAGE_URL=redis://username:password@host:port
```

---

## 🔗 **Redis Connection URL Format**

### **Standard Format**
```
redis://[username:password@]host[:port][/database]
```

### **Examples**

#### **Local Redis (no authentication)**
```bash
STORAGE_REDIS_URL=redis://localhost:6379
```

#### **Redis Cloud with authentication**
```bash
STORAGE_REDIS_URL=redis://username:password@redis-12345.c123.us-east-1-1.ec2.cloud.redislabs.com:12345
```

#### **Vercel Redis (Upstash)**
```bash
STORAGE_REDIS_URL=redis://default:password@redis-12345.upstash.io:12345
```

#### **Redis Enterprise**
```bash
STORAGE_REDIS_URL=redis://username:password@cluster.redis-enterprise.com:12345
```

---

## 🛡️ **Security Considerations**

### **Server-Side Only**
- These variables are **server-side only** (no `NEXT_PUBLIC_` prefix)
- They are **never exposed** to the browser
- Store as **secrets** in production environments

### **Connection Security**
- Use **TLS/SSL** connections when available
- Implement **strong passwords** for Redis authentication
- Consider **VPC/private networking** for production deployments

### **Access Control**
- Limit Redis access to your application servers only
- Use **firewall rules** to restrict connections
- Implement **Redis ACLs** if supported by your provider

---

## 🔍 **Verification Steps**

### **1. Test Redis Connection**

After setting the variables, test the connection:

```bash
# Check if Redis is accessible
curl http://localhost:3000/api/redis/status
```

Expected response:
```json
{
  "health": {
    "status": "healthy",
    "message": "Redis connection successful"
  },
  "memory": {
    "used_memory": "2.5MB",
    "used_memory_peak": "3.1MB"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### **2. Check Console Logs**

Look for Redis-related logs in your application:

```bash
# Expected console output
✅ Redis connected successfully
🔄 Fetching Kanban board from Redis...
✅ Redis cache hit - data retrieved from cache
```

### **3. Monitor Performance**

Check the Kanban board for:
- Redis status indicator (Connected/Fallback)
- Faster data loading times
- Console logs showing data source

---

## 🚨 **Troubleshooting**

### **Issue: "Redis connection failed"**

**Possible Causes:**
- Invalid connection URL
- Network connectivity issues
- Authentication failure
- Redis service not running

**Solutions:**
1. Verify connection URL format
2. Check network connectivity
3. Validate credentials
4. Ensure Redis service is running

### **Issue: "Falling back to database"**

**Possible Causes:**
- Redis connection timeout
- Redis memory limit reached
- Redis service unavailable

**Solutions:**
1. Check Redis service status
2. Monitor Redis memory usage
3. Verify connection settings
4. Check for Redis errors in logs

### **Issue: "Environment variable not found"**

**Solutions:**
1. Verify variable names are correct
2. Check environment variable scope
3. Restart application after adding variables
4. Ensure variables are set in correct environment

---

## 📊 **Performance Monitoring**

### **Redis Memory Usage**
The application automatically manages Redis memory:
- **20MB limit** enforced
- **Automatic data compression**
- **TTL-based expiration**
- **Intelligent cache invalidation**

### **Cache Performance Metrics**
Monitor these indicators:
- Cache hit/miss ratios
- Response times
- Memory utilization
- Connection status

---

## 🔄 **Fallback Mechanism**

### **Automatic Database Fallback**
If Redis is unavailable, the application automatically:
1. Attempts Redis connection
2. Falls back to database if Redis fails
3. Logs the data source (Redis/Database)
4. Continues normal operation

### **Graceful Degradation**
- No service interruption
- Performance may be slower
- All functionality remains available
- Clear logging of fallback events

---

## 📋 **Complete Setup Checklist**

### **Environment Variables**
- [ ] `STORAGE_REDIS_URL` set correctly
- [ ] `STORAGE_URL` set as backup (optional)
- [ ] Variables added to all environments
- [ ] Variables stored as secrets in production

### **Redis Service**
- [ ] Redis instance is running
- [ ] Connection URL is valid
- [ ] Authentication credentials are correct
- [ ] Network connectivity is established

### **Application Integration**
- [ ] Redis package installed (`npm install redis`)
- [ ] Application deployed with new variables
- [ ] Redis status endpoint accessible
- [ ] Console logs show Redis connection

### **Testing**
- [ ] Redis connection test passes
- [ ] Kanban board loads with Redis
- [ ] Cache invalidation works correctly
- [ ] Fallback to database works when Redis is down

---

## 🎯 **Next Steps**

1. **Set up Redis instance** (Vercel Redis, Upstash, Redis Cloud, etc.)
2. **Configure environment variables** in your deployment platform
3. **Deploy the application** with Redis integration
4. **Test the Kanban board** performance improvements
5. **Monitor Redis usage** and optimize as needed

---

## 📞 **Support**

If you encounter issues with Redis setup:

1. Check the [Redis Integration Documentation](./REDIS_KANBAN_INTEGRATION.md)
2. Verify environment variables are set correctly
3. Test Redis connection independently
4. Review application logs for specific error messages
5. Ensure Redis service is running and accessible

For additional help, refer to your Redis provider's documentation or contact their support team.
