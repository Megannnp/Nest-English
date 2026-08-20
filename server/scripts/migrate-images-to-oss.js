/**
 * 迁移脚本：把数据库里的 base64 图片迁移到阿里云 OSS
 * 运行方式：node --env-file=.env scripts/migrate-images-to-oss.js
 */
import 'dotenv/config';
import OSS from 'ali-oss';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host:     process.env.MYSQL_HOST || 'localhost',
  user:     process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD,
  database: 'nest_db',
  charset:  'utf8mb4',
});

const client = new OSS({
  region:          process.env.OSS_REGION,
  accessKeyId:     process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket:          process.env.OSS_BUCKET,
});

async function migrate() {
  console.log('🚀 开始迁移图片到 OSS...\n');

  const [rows] = await pool.query(
    'SELECT id, image_data FROM writings WHERE image_data IS NOT NULL'
  );

  console.log(`📊 共找到 ${rows.length} 条有图片的记录\n`);

  let success = 0, skip = 0, fail = 0;

  for (const row of rows) {
    try {
      const imageData = JSON.parse(row.image_data);

      // 已经是 OSS URL 则跳过
      if (imageData.ossUrl) {
        console.log(`⏭️  跳过 ${row.id}（已是OSS）`);
        skip++;
        continue;
      }

      if (!imageData.base64 || !imageData.mediaType) {
        console.log(`⚠️  跳过 ${row.id}（格式异常）`);
        skip++;
        continue;
      }

      // 上传到 OSS
      const ext      = imageData.mediaType.split('/')[1] || 'jpg';
      const filename = `writings/${Date.now()}-${row.id}.${ext}`;
      const buffer   = Buffer.from(imageData.base64, 'base64');

      const result = await client.put(filename, buffer, {
        headers: { 'Content-Type': imageData.mediaType }
      });

      // 更新数据库
      const newImageData = JSON.stringify({
        ossUrl:    result.url,
        mediaType: imageData.mediaType,
      });

      await pool.query(
        'UPDATE writings SET image_data = ? WHERE id = ?',
        [newImageData, row.id]
      );

      console.log(`✅ ${row.id} → ${result.url}`);
      success++;

      // 避免请求太快
      await new Promise(r => setTimeout(r, 200));

    } catch (err) {
      console.error(`❌ ${row.id} 失败：${err.message}`);
      fail++;
    }
  }

  console.log(`\n📈 迁移完成！`);
  console.log(`   成功：${success} 条`);
  console.log(`   跳过：${skip} 条`);
  console.log(`   失败：${fail} 条`);

  // 迁移后数据库大小
  const [sizeRow] = await pool.query(
    'SELECT ROUND(SUM(LENGTH(image_data))/1024/1024, 2) as mb FROM writings'
  );
  console.log(`\n💾 迁移后数据库图片字段大小：${sizeRow[0].mb} MB`);

  await pool.end();
}

migrate().catch(err => {
  console.error('💥 迁移失败：', err.message);
  process.exit(1);
});