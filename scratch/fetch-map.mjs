import fs from 'fs';
import https from 'https';

const url = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const dest = './client/public/countries-110m.json';

console.log(`Fetching topology from ${url}...`);

https.get(url, (res) => {
  if (res.statusCode !== 200) {
    console.error(`Request failed with status code ${res.statusCode}`);
    return;
  }

  const fileStream = fs.createWriteStream(dest);
  res.pipe(fileStream);

  fileStream.on('finish', () => {
    fileStream.close();
    console.log('Download completed successfully.');
  });
}).on('error', (err) => {
  console.error(`Error: ${err.message}`);
});
