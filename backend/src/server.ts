import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';

// Security middleware
import { securityHeaders, additionalSecurityHeaders, configureCORS, staticFileHeaders, generateNonce } from './middleware/security.js';
import { globalRateLimiter, authRateLimiter } from './middleware/rateLimiter.js';

// Routes
import authRoutes from './routes/auth.routes';
import languageRoutes from './routes/language.routes';
import currencyRoutes from './routes/currency.routes';
import TenantTypeRoutes from './routes/tenantType.routes';
import subscriptionPlanRoutes from './routes/subscriptionPlan.routes';
import tenantRoutes from './routes/tenant.routes';
import permissionRoutes from './routes/permission.routes.js';
import tenantLanguageRoutes from './routes/tenantLanguage.routes.js';
import navigationMenuRoutes from './routes/navigationMenu.routes';
import adminUserRoutes from './routes/adminUser.routes';
import rolePermissionRoutes from './routes/rolePermission.routes';
import tenantAdminUserRoutes from './routes/tenantAdminUser.routes';
import storeRoutes from './routes/store.routes';
import tenantSettingRoutes from './routes/tenantSetting.routes';
import tenantBannerRoutes from './routes/tenantBanner.routes';
import tenantMenuCategoryRoutes from './routes/tenantMenuCategory.routes';
import tenantIngredientRoutes from './routes/tenantIngredient.routes';
import tenantAddonTypeRoutes from './routes/tenantAddonType.routes';
import tenantAddonRoutes from './routes/tenantAddon.routes';
import tenantOrderDestinationRoutes from './routes/tenantOrderDestination.routes';
import tenantMenuItemRoutes from './routes/tenantMenuItem.routes';
import tenantSeatingAreaRoutes from './routes/tenantSeatingArea.routes';
import tenantTableStructureRoutes from './routes/tenantTableStructure.routes';
import tenantWaiterRoutes from './routes/tenantWaiter.routes';
import tenantCustomerRoutes from './routes/tenantCustomer.routes';
import reservationRoutes from './routes/reservation.routes';
import tenantOrderSourceRoutes from './routes/tenantOrderSource.routes';
import tenantOrderTypeRoutes from './routes/tenantOrderType.routes';
import tenantOrderItemStatusRoutes from './routes/tenantOrderItemStatus.routes';
import tenantPaymentStatusRoutes from './routes/tenantPaymentStatus.routes';
import orderRoutes from './routes/order.routes';
import tenantPaymentTypeRoutes from './routes/tenantPaymentType.routes';
import transactionRoutes from './routes/transaction.routes';
import qrInvoiceTokenRoutes from './routes/qrInvoiceToken.routes';
import tenantSupplierRoutes from './routes/tenantSupplier.routes';
import tenantInventoryProductRoutes from './routes/tenantInventoryProduct.routes';
import supplierInvoiceRoutes from './routes/supplierInvoice.routes';
import stockIntakeRoutes from './routes/stockIntake.routes';
import addonTypeRoutes from './routes/addonType.routes';
import addonRoutes from './routes/addon.routes';
import orderSourceRoutes from './routes/orderSource.routes';
import orderTypeRoutes from './routes/orderType.routes';
import orderDestinationRoutes from './routes/orderDestination.routes';
import paymentTypeRoutes from './routes/paymentType.routes';
import orderItemStatusRoutes from './routes/orderItemStatus.routes';
import paymentStatusRoutes from './routes/paymentStatus.routes';
import ingredientRoutes from './routes/ingredient.routes';
import expenseCategoryRoutes from './routes/expenseCategory.routes';
import menuCategoryRoutes from './routes/menuCategory.routes';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'JWT_SECRET',
  'REFRESH_TOKEN_SECRET',
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Validate JWT secrets have sufficient length
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET must be at least 32 characters');
  process.exit(1);
}

if (process.env.REFRESH_TOKEN_SECRET && process.env.REFRESH_TOKEN_SECRET.length < 32) {
  console.error('❌ REFRESH_TOKEN_SECRET must be at least 32 characters');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3006;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Trust proxy (important for rate limiting and IP detection behind reverse proxy)
app.set('trust proxy', 1);

// ============================================
// SECURITY MIDDLEWARE (Apply first!)
// ============================================

// Generate CSP nonce for each request (must come before securityHeaders)
app.use(generateNonce);

// Security headers (uses nonce from previous middleware)
app.use(securityHeaders);
app.use(additionalSecurityHeaders);

// CORS with secure configuration
app.use(cors(configureCORS()));

// Global rate limiting
app.use(globalRateLimiter);

// ============================================
// BASIC MIDDLEWARE
// ============================================

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser for refresh token handling
app.use(cookieParser());

// Serve static files from public directory

app.use('/uploads', staticFileHeaders, express.static(path.join(__dirname, '../public/uploads')));

// Request logging (only in development)
if (NODE_ENV === 'development') {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ============================================
// HEALTH CHECK (Before rate limiting)
// ============================================

app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
});

// ============================================
// API ROUTES
// ============================================

// Auth routes (with strict rate limiting)
app.use('/api/auth', authRateLimiter, authRoutes);

// Admin routes (super admin only)
app.use('/api/admin', languageRoutes);
app.use('/api/admin', currencyRoutes);
app.use('/api/admin', TenantTypeRoutes);
app.use('/api/admin', subscriptionPlanRoutes);
app.use('/api/admin', tenantRoutes);
app.use('/api/admin', navigationMenuRoutes);
app.use('/api/admin', adminUserRoutes);
app.use('/api/admin', rolePermissionRoutes);
app.use('/api/admin', addonTypeRoutes);
app.use('/api/admin', addonRoutes);
app.use('/api/admin', orderSourceRoutes);
app.use('/api/admin', orderTypeRoutes);
app.use('/api/admin', orderDestinationRoutes);
app.use('/api/admin', paymentTypeRoutes);
app.use('/api/admin', orderItemStatusRoutes);
app.use('/api/admin', paymentStatusRoutes);
app.use('/api/admin', ingredientRoutes);
app.use('/api/admin', expenseCategoryRoutes);
app.use('/api/admin', menuCategoryRoutes);

// Tenant routes (tenant-specific, permission-based)
app.use('/api/tenant', permissionRoutes);
app.use('/api/tenant', tenantLanguageRoutes);
app.use('/api/tenant', tenantAdminUserRoutes);
app.use('/api/tenant', storeRoutes);
app.use('/api/tenant', tenantSettingRoutes);
app.use('/api/tenant', tenantBannerRoutes);
app.use('/api/tenant', tenantMenuCategoryRoutes);
app.use('/api/tenant', tenantIngredientRoutes);
app.use('/api/tenant', tenantAddonTypeRoutes);
app.use('/api/tenant', tenantAddonRoutes);
app.use('/api/tenant', tenantOrderDestinationRoutes);
app.use('/api/tenant', tenantMenuItemRoutes);
app.use('/api/tenant', tenantSeatingAreaRoutes);
app.use('/api/tenant', tenantTableStructureRoutes);
app.use('/api/tenant', tenantWaiterRoutes);
app.use('/api/tenant', tenantCustomerRoutes);
app.use('/api/tenant', reservationRoutes);
app.use('/api/tenant', tenantOrderSourceRoutes);
app.use('/api/tenant', tenantOrderTypeRoutes);
app.use('/api/tenant', tenantOrderItemStatusRoutes);
app.use('/api/tenant', tenantPaymentStatusRoutes);
app.use('/api/tenant', orderRoutes);
app.use('/api/tenant', tenantPaymentTypeRoutes);
app.use('/api/tenant', transactionRoutes);
app.use('/api/tenant', qrInvoiceTokenRoutes);
app.use('/api/tenant', tenantSupplierRoutes);
app.use('/api/tenant', tenantInventoryProductRoutes);
app.use('/api/tenant', supplierInvoiceRoutes);
app.use('/api/tenant', stockIntakeRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  
  // Don't leak error details in production
  const errorMessage = NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
  
  res.status(500).json({ error: errorMessage });
});

// ============================================
// START SERVER
// ============================================

const server = app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`📡 API: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log(`📁 Uploads: http://localhost:${PORT}/uploads`);
  
  if (NODE_ENV === 'production') {
    console.log('🔒 Running in PRODUCTION mode with enhanced security');
  } else {
    console.log('⚠️  Running in DEVELOPMENT mode');
  }
  
  console.log(`\n✅ Ready to accept requests!\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default app;