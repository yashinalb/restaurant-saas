BATCH 5: Two-Factor Authentication (2FA) 🔐
Time: ~45-60 mins (This is the big one!)
Prompt for Claude Code:
Implement TOTP-based 2FA for admin users:

1. Database migration:
   ALTER TABLE admin_users ADD COLUMN totp_secret VARCHAR(255) NULL;
   ALTER TABLE admin_users ADD COLUMN totp_enabled TINYINT(1) DEFAULT 0;
   ALTER TABLE admin_users ADD COLUMN backup_codes JSON NULL;

2. Install dependencies (if not installed):
   npm install otplib qrcode

3. Create /backend/src/services/twoFactorService.ts:
   - generateSecret() - Create TOTP secret
   - generateQRCode() - QR code for Google Authenticator
   - verifyToken(secret, token) - Validate 6-digit code
   - generateBackupCodes() - Create 10 backup codes
   - verifyBackupCode(codes, code) - Validate backup code

4. Create endpoints in /backend/src/controllers/twoFactorController.ts:
   POST /api/auth/2fa/setup - Start 2FA enrollment
   POST /api/auth/2fa/verify - Complete enrollment
   POST /api/auth/2fa/disable - Disable 2FA
   POST /api/auth/2fa/backup-codes - Regenerate backup codes

5. Update login flow in authController.ts:
   - Check if user has 2FA enabled
   - If yes, require 2FA token before issuing access token
   - Add intermediate state: "2fa_required"

6. Require 2FA for all super admins (enforce in code)

7. Add routes to /backend/src/routes/authRoutes.ts

Show me all the code files and explain the flow.