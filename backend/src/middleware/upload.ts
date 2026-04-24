import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseUploadDir = path.join(__dirname, '../../public/uploads');

if (!fs.existsSync(baseUploadDir)) {
  fs.mkdirSync(baseUploadDir, { recursive: true });
}

type TenantUploadType = 'banners' | 'menu_items' | 'menu_categories' | 'logos';

function getTenantDirectory(tenantId: number, type: TenantUploadType): string {
  const dirName = `${tenantId}_${type}`;
  const dirPath = path.join(baseUploadDir, dirName);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

const imageFileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowed = /jpeg|jpg|png|gif|webp|svg/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype);
  if (extOk && mimeOk) cb(null, true);
  else cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp, svg)'));
};

const tenantBannerStorage = multer.diskStorage({
  destination: (req: any, _file, cb) => {
    const tenantId = req.tenant?.id;
    if (!tenantId) return cb(new Error('Tenant context required'), '');
    cb(null, getTenantDirectory(Number(tenantId), 'banners'));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '');
    cb(null, `${base || 'banner'}-${uniqueSuffix}${ext}`);
  },
});

const bannerUpload = multer({
  storage: tenantBannerStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const uploadBannerImage = bannerUpload.single('image');
export const uploadBannerMobileImage = bannerUpload.single('mobile_image');

export function deleteUploadedFile(imageUrl: string, expectedTenantFolder: string): boolean {
  if (!imageUrl || !imageUrl.startsWith('/uploads/')) return false;
  const relative = imageUrl.replace('/uploads/', '');
  if (!relative.startsWith(expectedTenantFolder + '/')) return false;
  const filePath = path.join(baseUploadDir, relative);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}
