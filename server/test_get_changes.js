import { getChanges } from './src/models/allRequestsModel.js';

(async () => {
  try {
    const rows = await getChanges();
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
