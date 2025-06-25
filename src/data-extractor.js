import fs from 'fs';
import path from 'path';
import { extractFull } from 'node-7z';
import { FastqParser } from './fastq-parser.js';

export class DataExtractor {
  constructor() {
    this.extractedDir = './extracted_data';
    this.outputDir = './processed_data';
  }

  async ensureDirectories() {
    if (!fs.existsSync(this.extractedDir)) {
      fs.mkdirSync(this.extractedDir, { recursive: true });
    }
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async extract7zFile(filePath) {
    return new Promise((resolve, reject) => {
      console.log('Extracting 7z file...');
      
      const stream = extractFull(filePath, this.extractedDir, {
        $progress: true
      });

      stream.on('progress', (progress) => {
        console.log(`Extraction progress: ${progress.percent}%`);
      });

      stream.on('end', () => {
        console.log('7z file extracted successfully');
        resolve();
      });

      stream.on('error', (err) => {
        console.error('Extraction error:', err.message);
        reject(new Error(`Failed to extract 7z file: ${err.message}`));
      });
    });
  }

  async processFastqFiles() {
    const fastqFiles = [];
    const extractedFiles = fs.readdirSync(this.extractedDir);
    
    for (const file of extractedFiles) {
      if (file.endsWith('.fastq') || file.endsWith('.fastq.gz') || file.endsWith('.fq')) {
        fastqFiles.push(path.join(this.extractedDir, file));
      }
    }

    console.log(`Found ${fastqFiles.length} FASTQ files`);
    
    const allSequenceData = [];
    const parser = new FastqParser();

    for (const fastqFile of fastqFiles) {
      console.log(`Processing ${fastqFile}...`);
      try {
        await parser.parseFile(fastqFile);
        const features = parser.extractFeatures();
        
        // Add file source information
        features.forEach(feature => {
          feature.source_file = path.basename(fastqFile);
        });
        
        allSequenceData.push(...features);
        
        // Reset parser for next file
        parser.sequences = [];
        parser.currentEntry = {};
        parser.lineCount = 0;
        
      } catch (error) {
        console.error(`Error processing ${fastqFile}:`, error.message);
      }
    }

    return allSequenceData;
  }

  async readFaostatData() {
    return new Promise((resolve, reject) => {
      const faostatData = [];
      const filePath = './FAOSTAT_data_en_6-23-2025.csv';
      
      if (!fs.existsSync(filePath)) {
        console.log('FAOSTAT CSV file not found, skipping...');
        resolve([]);
        return;
      }

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
            const values = this.parseCSVLine(line);
            
            if (lineCount === 0) {
              headers = values;
            } else if (headers) {
              const row = {};
              headers.forEach((header, index) => {
                row[header] = values[index] || '';
              });
              faostatData.push(row);
            }
            lineCount++;
          }
        });
      });

      stream.on('end', () => {
        if (buffer.trim()) {
          const values = this.parseCSVLine(buffer);
          if (headers && values.length > 0) {
            const row = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            faostatData.push(row);
          }
        }
        console.log(`Loaded ${faostatData.length} FAOSTAT records`);
        resolve(faostatData);
      });

      stream.on('error', reject);
    });
  }

  parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  }
}