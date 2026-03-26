module.exports = async () => {
  const db = (global as any).__TEST_DB__;
  if (db) db.close();
};
