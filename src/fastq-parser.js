import fs from 'fs';
import { createReadStream, createWriteStream } from 'fs';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';

export class FastqParser {
  constructor() {
    this.sequences = [];
    this.currentEntry = {};
    this.lineCount = 0;
  }

  parseFastqLine(line) {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    const lineType = this.lineCount % 4;
    
    switch (lineType) {
      case 0: // Header line (starts with @)
        if (this.currentEntry.header) {
          this.sequences.push({ ...this.currentEntry });
        }
        this.currentEntry = {
          header: trimmedLine.substring(1), // Remove @ symbol
          sequence: '',
          plus: '',
          quality: ''
        };
        break;
      case 1: // Sequence line
        this.currentEntry.sequence = trimmedLine;
        break;
      case 2: // Plus line (starts with +)
        this.currentEntry.plus = trimmedLine;
        break;
      case 3: // Quality line
        this.currentEntry.quality = trimmedLine;
        break;
    }
    
    this.lineCount++;
  }

  async parseFile(filePath) {
    return new Promise((resolve, reject) => {
      const stream = createReadStream(filePath, { encoding: 'utf8' });
      let buffer = '';

      stream.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        lines.forEach(line => this.parseFastqLine(line));
      });

      stream.on('end', () => {
        if (buffer.trim()) {
          this.parseFastqLine(buffer);
        }
        if (this.currentEntry.header) {
          this.sequences.push(this.currentEntry);
        }
        resolve(this.sequences);
      });

      stream.on('error', reject);
    });
  }

  getSequenceStats(sequence) {
    const length = sequence.length;
    const gcCount = (sequence.match(/[GC]/g) || []).length;
    const gcContent = length > 0 ? (gcCount / length) * 100 : 0;
    
    const bases = { A: 0, T: 0, G: 0, C: 0, N: 0 };
    for (const base of sequence) {
      if (bases.hasOwnProperty(base)) {
        bases[base]++;
      } else {
        bases.N++;
      }
    }

    return {
      length,
      gc_content: gcContent.toFixed(2),
      a_count: bases.A,
      t_count: bases.T,
      g_count: bases.G,
      c_count: bases.C,
      n_count: bases.N
    };
  }

  extractFeatures() {
    return this.sequences.map((entry, index) => {
      const stats = this.getSequenceStats(entry.sequence);
      const headerParts = entry.header.split(' ');
      
      return {
        sequence_id: `seq_${index + 1}`,
        header: entry.header,
        sequence_length: stats.length,
        gc_content: stats.gc_content,
        a_count: stats.a_count,
        t_count: stats.t_count,
        g_count: stats.g_count,
        c_count: stats.c_count,
        n_count: stats.n_count,
        quality_score_avg: this.calculateAverageQuality(entry.quality),
        sequence_complexity: this.calculateComplexity(entry.sequence),
        has_ambiguous_bases: stats.n_count > 0 ? 1 : 0
      };
    });
  }

  calculateAverageQuality(qualityString) {
    if (!qualityString) return 0;
    
    let sum = 0;
    for (const char of qualityString) {
      // Convert ASCII to Phred quality score (assuming Phred+33 encoding)
      sum += char.charCodeAt(0) - 33;
    }
    return qualityString.length > 0 ? (sum / qualityString.length).toFixed(2) : 0;
  }

  calculateComplexity(sequence) {
    // Simple complexity measure: number of unique 3-mers
    const kmers = new Set();
    for (let i = 0; i <= sequence.length - 3; i++) {
      kmers.add(sequence.substring(i, i + 3));
    }
    return kmers.size;
  }
}