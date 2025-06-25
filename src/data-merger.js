import fs from 'fs';
import { createWriteStream } from 'fs';

export class DataMerger {
  constructor() {
    this.outputFile = './MODEL_TRAINING_DATA.csv';
  }

  async mergeData(sequenceData, faostatData, mappingData) {
    console.log('Merging datasets...');
    
    // Create a comprehensive dataset for model training
    const mergedData = [];
    
    // Process sequence data with mapping information
    const mappingMap = this.createMappingMap(mappingData);
    
    sequenceData.forEach((seqRecord, index) => {
      const baseRecord = {
        // Sequence identifiers
        record_id: `record_${index + 1}`,
        data_type: 'genomic_sequence',
        sequence_id: seqRecord.sequence_id,
        source_file: seqRecord.source_file,
        
        // Sequence features
        sequence_length: seqRecord.sequence_length,
        gc_content: parseFloat(seqRecord.gc_content),
        a_count: seqRecord.a_count,
        t_count: seqRecord.t_count,
        g_count: seqRecord.g_count,
        c_count: seqRecord.c_count,
        n_count: seqRecord.n_count,
        quality_score_avg: parseFloat(seqRecord.quality_score_avg),
        sequence_complexity: seqRecord.sequence_complexity,
        has_ambiguous_bases: seqRecord.has_ambiguous_bases,
        
        // Mapping data (if available)
        sample_name: '',
        barcode: '',
        experiment_design: '',
        target_gene: '',
        platform: '',
        
        // FAOSTAT data placeholders
        area: '',
        item: '',
        element: '',
        year: '',
        value: '',
        unit: ''
      };

      // Try to match with mapping data
      const mappingMatch = this.findMappingMatch(seqRecord, mappingMap);
      if (mappingMatch) {
        baseRecord.sample_name = mappingMatch.sample_name || '';
        baseRecord.barcode = mappingMatch.barcode || '';
        baseRecord.experiment_design = mappingMatch.experiment_design_description || '';
        baseRecord.target_gene = mappingMatch.target_gene || '';
        baseRecord.platform = mappingMatch.platform || '';
      }

      mergedData.push(baseRecord);
    });

    // Add FAOSTAT data as separate records
    faostatData.forEach((faoRecord, index) => {
      const faoMergedRecord = {
        record_id: `fao_${index + 1}`,
        data_type: 'agricultural_statistics',
        sequence_id: '',
        source_file: 'FAOSTAT_data_en_6-23-2025.csv',
        
        // Sequence features (empty for FAOSTAT data)
        sequence_length: 0,
        gc_content: 0,
        a_count: 0,
        t_count: 0,
        g_count: 0,
        c_count: 0,
        n_count: 0,
        quality_score_avg: 0,
        sequence_complexity: 0,
        has_ambiguous_bases: 0,
        
        // Mapping data (empty for FAOSTAT)
        sample_name: '',
        barcode: '',
        experiment_design: '',
        target_gene: '',
        platform: '',
        
        // FAOSTAT data
        area: faoRecord.Area || '',
        item: faoRecord.Item || '',
        element: faoRecord.Element || '',
        year: faoRecord.Year || '',
        value: faoRecord.Value || '',
        unit: faoRecord.Unit || ''
      };

      mergedData.push(faoMergedRecord);
    });

    // Write merged data to CSV
    await this.writeCSV(mergedData);
    
    return mergedData;
  }

  createMappingMap(mappingData) {
    const map = new Map();
    mappingData.forEach(record => {
      if (record.sample_name) {
        map.set(record.sample_name, record);
      }
      if (record.barcode) {
        map.set(record.barcode, record);
      }
    });
    return map;
  }

  findMappingMatch(seqRecord, mappingMap) {
    // Try to match by various identifiers
    const identifiers = [
      seqRecord.sequence_id,
      seqRecord.header,
      seqRecord.source_file
    ];

    for (const id of identifiers) {
      if (id && mappingMap.has(id)) {
        return mappingMap.get(id);
      }
      
      // Try partial matches
      for (const [key, value] of mappingMap.entries()) {
        if (id && id.includes(key) || key.includes(id)) {
          return value;
        }
      }
    }
    
    return null;
  }

  async writeCSV(data) {
    return new Promise((resolve, reject) => {
      const writeStream = createWriteStream(this.outputFile);
      
      if (data.length === 0) {
        writeStream.end();
        resolve();
        return;
      }

      // Write headers
      const headers = Object.keys(data[0]);
      writeStream.write(headers.join(',') + '\n');

      // Write data rows
      data.forEach(row => {
        const values = headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        });
        writeStream.write(values.join(',') + '\n');
      });

      writeStream.end();
      
      writeStream.on('finish', () => {
        console.log(`\n✅ Merged data written to: ${this.outputFile}`);
        console.log(`📊 Total records: ${data.length}`);
        resolve();
      });

      writeStream.on('error', reject);
    });
  }

  generateDataSummary(data) {
    const summary = {
      total_records: data.length,
      sequence_records: data.filter(r => r.data_type === 'genomic_sequence').length,
      faostat_records: data.filter(r => r.data_type === 'agricultural_statistics').length,
      avg_sequence_length: 0,
      avg_gc_content: 0,
      unique_sources: new Set(data.map(r => r.source_file)).size
    };

    const seqRecords = data.filter(r => r.data_type === 'genomic_sequence');
    if (seqRecords.length > 0) {
      summary.avg_sequence_length = seqRecords.reduce((sum, r) => sum + r.sequence_length, 0) / seqRecords.length;
      summary.avg_gc_content = seqRecords.reduce((sum, r) => sum + r.gc_content, 0) / seqRecords.length;
    }

    return summary;
  }
}