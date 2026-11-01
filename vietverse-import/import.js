/**
 * IMPORT DỮ LIỆU VIETVERSE VÀO PROJECT FIREBASE MỚI (vietverse-d483c)
 * ------------------------------------------------------------------
 * Cách dùng (chạy trên MÁY TÍNH của bạn, không chạy trên web):
 *   1. Cài Node.js (nodejs.org) nếu chưa có.
 *   2. Tạo 1 thư mục, bỏ file này (import.js) vào cùng với:
 *        - serviceAccountKey.json   (file key tải từ Firebase, đổi tên đúng như vậy)
 *        - realtime-db-backup.json
 *        - firestore-books-backup.json
 *        - firestore-provinces-backup.json
 *        - firestore-ar-items-backup.json
 *   3. Mở terminal/cmd tại thư mục đó, chạy:
 *        npm install firebase-admin
 *        node import.js
 *   4. Đợi thấy dòng "✅ XONG TOÀN BỘ" là hoàn tất.
 *
 * Script chỉ ĐỌC các file JSON kể trên, KHÔNG đụng vào project cũ.
 * Chạy lại nhiều lần cũng an toàn cho Firestore (ghi đè bằng đúng id cũ);
 * riêng Realtime Database thì thay thế toàn bộ node "/" mỗi lần chạy.
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// ─────────────────────────────────────────────────────────
// 1) CẤU HÌNH — sửa databaseURL nếu khu vực Realtime DB của bạn khác
// ─────────────────────────────────────────────────────────
const DATABASE_URL = 'https://vietverse-d483c-default-rtdb.asia-southeast1.firebasedatabase.app';
// Nếu khi tạo Realtime Database bạn chọn khu vực khác (vd: us-central1),
// vào Firebase Console > Realtime Database, copy đúng "Reference URL" dán vào trên.

const FILES = {
  realtime: 'realtime-db-backup.json',
  books: 'firestore-books-backup.json',
  provinces: 'firestore-provinces-backup.json',
  arItems: 'firestore-ar-items-backup.json',
};

// ─────────────────────────────────────────────────────────
// 2) KHỞI TẠO
// ─────────────────────────────────────────────────────────
function readJson(name) {
  const p = path.join(__dirname, name);
  if (!fs.existsSync(p)) {
    console.error(`❌ Không tìm thấy file: ${name} (phải để cùng thư mục với import.js)`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const serviceAccount = readJson('serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: DATABASE_URL,
});

const rtdb = admin.database();
const fsdb = admin.firestore();

// ─────────────────────────────────────────────────────────
// 3) NHẬP REALTIME DATABASE
// ─────────────────────────────────────────────────────────
async function importRealtimeDb() {
  const data = readJson(FILES.realtime);
  console.log(`⏳ Đang ghi Realtime Database (${Object.keys(data).length} nhóm dữ liệu)...`);
  await rtdb.ref('/').set(data);
  console.log('✅ Xong Realtime Database.\n');
}

// ─────────────────────────────────────────────────────────
// 4) NHẬP MỘT COLLECTION FIRESTORE
//    (mỗi document JSON có thể chứa {seconds, nanoseconds} do bản xuất cũ
//     lưu Timestamp dạng object thường — script tự đổi lại thành Timestamp thật)
// ─────────────────────────────────────────────────────────
function reviveTimestamps(value) {
  if (Array.isArray(value)) return value.map(reviveTimestamps);
  if (value && typeof value === 'object') {
    if (
      Object.keys(value).length === 2 &&
      typeof value.seconds === 'number' &&
      typeof value.nanoseconds === 'number'
    ) {
      return new admin.firestore.Timestamp(value.seconds, value.nanoseconds);
    }
    const out = {};
    for (const k of Object.keys(value)) out[k] = reviveTimestamps(value[k]);
    return out;
  }
  return value;
}

async function importCollection(fileKey, collectionName) {
  const data = readJson(FILES[fileKey]);
  const ids = Object.keys(data);
  console.log(`⏳ Đang ghi Firestore collection "${collectionName}" (${ids.length} tài liệu)...`);
  const batchSize = 400; // Firestore giới hạn 500 ghi/batch, chừa dư an toàn
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = fsdb.batch();
    ids.slice(i, i + batchSize).forEach((id) => {
      const ref = fsdb.collection(collectionName).doc(id);
      batch.set(ref, reviveTimestamps(data[id]));
    });
    await batch.commit();
  }
  console.log(`✅ Xong collection "${collectionName}".\n`);
}

// ─────────────────────────────────────────────────────────
// 5) CHẠY TUẦN TỰ
// ─────────────────────────────────────────────────────────
(async () => {
  try {
    await importRealtimeDb();
    await importCollection('books', 'books');
    await importCollection('provinces', 'provinces');
    await importCollection('arItems', 'ar_items');
    console.log('✅ XONG TOÀN BỘ — dữ liệu đã có trong project mới.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Có lỗi khi nhập dữ liệu:', err);
    process.exit(1);
  }
})();
