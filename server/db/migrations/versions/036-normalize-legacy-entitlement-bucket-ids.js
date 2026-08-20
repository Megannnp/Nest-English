/**
 * Migration 036: normalize legacy entitlement bucket ids created by migration 030.
 */
export default {
  version: '036',
  name: 'normalize-legacy-entitlement-bucket-ids',
  async up({ pool }) {
    await pool.query(`
      UPDATE entitlement_buckets AS bucket
      LEFT JOIN entitlement_buckets AS existing_id
        ON existing_id.id = CONCAT('legacy_', LEFT(SHA2(CONCAT(bucket.user_id, ':', bucket.unit), 256), 32))
      LEFT JOIN entitlement_buckets AS existing_source
        ON existing_source.user_id = bucket.user_id
       AND existing_source.unit = bucket.unit
       AND existing_source.source_type = 'legacy_balance'
       AND existing_source.source_id = CONCAT('legacy:', LEFT(SHA2(CONCAT(bucket.user_id, ':', bucket.unit), 256), 32))
      SET
        bucket.id = CONCAT('legacy_', LEFT(SHA2(CONCAT(bucket.user_id, ':', bucket.unit), 256), 32)),
        bucket.source_id = CONCAT('legacy:', LEFT(SHA2(CONCAT(bucket.user_id, ':', bucket.unit), 256), 32))
      WHERE bucket.source_type = 'legacy_balance'
        AND bucket.id = CONCAT('legacy_', LEFT(SHA2(CONCAT(bucket.user_id, ':', bucket.unit), 256), 32))
        AND bucket.source_id = CONCAT('legacy:', LEFT(SHA2(CONCAT(bucket.user_id, ':', bucket.unit), 256), 32))
        AND existing_id.id IS NULL
        AND existing_source.id IS NULL
    `);
  },
};
