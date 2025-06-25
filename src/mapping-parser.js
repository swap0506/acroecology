import fs from 'fs';

export class MappingParser {
  async parseMappingFile(filePath) {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(filePath)) {
        console.log('Mapping file not found, skipping...');
        resolve([]);
        return;
      }

      const mappingData = [];
      const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
      let buffer = '';
      let headers = null;
      let lineCount = 0;

      stream.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop();

        lines.forEach(line => {
          if (line.trim()) {
            const values = line.split('\t');
            
            if (lineCount === 0) {
              headers = values;
            } else if (headers) {
              const row = {};
              headers.forEach((header, index) => {
                row[header] = values[index] || '';
              });
              mappingData.push(row);
            }
            lineCount++;
          }
        });
      });

      stream.on('end', () => {
        if (buffer.trim()) {
          const values = buffer.split('\t');
          if (headers && values.length > 0) {
            const row = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            mappingData.push(row);
          }
        }
        console.log(`Loaded ${mappingData.length} mapping records`);
        resolve(mappingData);
      });

      stream.on('error', reject);
    });
  }
}