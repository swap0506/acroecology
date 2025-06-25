import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
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
    console.log('Attempting to extract 7z file...');
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`7z file not found: ${filePath}`);
    }

    // Try different extraction methods
    const extractors = [
      { cmd: '7z', args: ['x', filePath, `-o${this.extractedDir}`, '-y'] },
      { cmd: 'p7zip', args: ['-d', filePath] },
      { cmd: '7za', args: ['x', filePath, `-o${this.extractedDir}`, '-y'] }
    ];

    for (const extractor of extractors) {
      try {
        console.log(`Trying ${extractor.cmd}...`);
        await this.runCommand(extractor.cmd, extractor.args);
        console.log('✅ 7z file extracted successfully');
        return;
      } catch (error) {
        console.log(`❌ ${extractor.cmd} failed: ${error.message}`);
        continue;
      }
    }

    // If all extractors fail, try using node-7z as fallback
    try {
      console.log('Trying node-7z as fallback...');
      await this.extractWithNode7z(filePath);
      console.log('✅ 7z file extracted with node-7z');
      return;
    } catch (error) {
      console.log(`❌ node-7z failed: ${error.message}`);
    }

    throw new Error('All extraction methods failed. Please ensure 7zip is installed or extract the file manually.');
  }

  async runCommand(command, args) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, { stdio: 'pipe' });
      
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log(data.toString().trim());
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to start command: ${error.message}`));
      });
    });
  }

  async extractWithNode7z(filePath) {
    // Dynamic import to handle the CommonJS module
    const { extractFull } = await import('node-7z').then(pkg => pkg.default || pkg);
    
    return new Promise((resolve, reject) => {
      const stream = extractFull(filePath, this.extractedDir, {
        $progress: true
      });

      stream.on('progress', (progress) => {
        console.log(`Extraction progress: ${progress.percent}%`);
      });

      stream.on('end', () => {
        resolve();
      });

      stream.on('error', (err) => {
        reject(new Error(`node-7z extraction failed: ${err.message}`));
      });
    });
  }

  async processFastqFiles() {
    console.log(`Scanning ${this.extractedDir} for FASTQ files...`);
    
    if (!fs.existsSync(this.extractedDir)) {
      console.log('⚠️  Extracted directory does not exist, creating it...');
      fs.mkdirSync(this.extractedDir, { recursive: true });
    }

    const fastqFiles = this.findFastqFiles(this.extractedDir);
    
    if (fastqFiles.length === 0) {
      console.log('⚠️  No FASTQ files found in extracted directory');
      console.log('📁 Directory contents:');
      try {
        const files = fs.readdirSync(this.extractedDir);
        files.forEach(file => {
          const filePath = path.join(this.extractedDir, file);
          const stats = fs.statSync(filePath);
          console.log(`   ${stats.isDirectory() ? '📁' : '📄'} ${file} (${stats.size} bytes)`);
        });
      } catch (error) {
        console.log('   Directory is empty or inaccessible');
      }
      return [];
    }

    console.log(`Found ${fastqFiles.length} FASTQ files:`);
    fastqFiles.forEach(file => console.log(`   📄 ${file}`));
    
    const allSequenceData = [];
    const parser = new FastqParser();

    for (const fastqFile of fastqFiles) {
      console.log(`\n🧬 Processing ${path.basename(fastqFile)}...`);
      try {
        const fileStats = fs.statSync(fastqFile);
        console.log(`   File size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);
        
        await parser.parseFile(fastqFile);
        const features = parser.extractFeatures();
        
        console.log(`   Extracted ${features.length} sequences`);
        
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
        console.error(`❌ Error processing ${fastqFile}:`, error.message);
      }
    }

    console.log(`\n✅ Total sequences processed: ${allSequenceData.length}`);
    return allSequenceData;
  }

  findFastqFiles(directory) {
    const fastqFiles = [];
    
    const scanDirectory = (dir) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
          // Recursively scan subdirectories
          scanDirectory(fullPath);
        } else if (stats.isFile()) {
          // Check if it's a FASTQ file
          const ext = path.extname(item).toLowerCase();
          const basename = path.basename(item).toLowerCase();
          
          if (ext === '.fastq' || ext === '.fq' || 
              basename.endsWith('.fastq.gz') || 
              basename.endsWith('.fq.gz') ||
              basename.includes('fastq')) {
            fastqFiles.push(fullPath);
          }
        }
      }
    };

    try {
      scanDirectory(directory);
    } catch (error) {
      console.error(`Error scanning directory ${directory}:`, error.message);
    }

    return fastqFiles;
  }

  async readFaostatData() {
    return new Promise((resolve, reject) => {
      const faostatData = [];
      const filePath = './FAOSTAT_data_en_6-23-2025.csv';
      
      if (!fs.existsSync(filePath)) {
        console.log('⚠️  FAOSTAT CSV file not found, skipping...');
        resolve([]);
        return;
      }

      console.log('📊 Reading FAOSTAT data...');
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
              console.log(`   Headers: ${headers.slice(0, 5).join(', ')}...`);
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
        console.log(`✅ Loaded ${faostatData.length} FAOSTAT records`);
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