import { DataExtractor } from './data-extractor.js';
import { DataMerger } from './data-merger.js';
import { MappingParser } from './mapping-parser.js';

async function processAllData() {
  console.log('🚀 Starting data extraction and merging process...\n');
  
  try {
    const extractor = new DataExtractor();
    const merger = new DataMerger();
    const mappingParser = new MappingParser();

    // Ensure directories exist
    await extractor.ensureDirectories();

    // Step 1: Extract FASTQ data from 7z file
    console.log('📦 Step 1: Extracting FASTQ.7z...');
    try {
      await extractor.extract7zFile('./FASTQ.7z');
    } catch (error) {
      console.log('⚠️  7z extraction failed, checking for pre-extracted files...');
      console.log('Error:', error.message);
    }

    // Step 2: Process FASTQ files
    console.log('\n🧬 Step 2: Processing FASTQ files...');
    const sequenceData = await extractor.processFastqFiles();
    console.log(`✅ Processed ${sequenceData.length} sequences`);

    // Step 3: Read FAOSTAT data
    console.log('\n📊 Step 3: Reading FAOSTAT data...');
    const faostatData = await extractor.readFaostatData();
    console.log(`✅ Loaded ${faostatData.length} FAOSTAT records`);

    // Step 4: Parse mapping file
    console.log('\n🗺️  Step 4: Parsing mapping file...');
    const mappingData = await mappingParser.parseMappingFile('./mapping_files/2097_mapping_file.txt');
    console.log(`✅ Loaded ${mappingData.length} mapping records`);

    // Step 5: Merge all data
    console.log('\n🔄 Step 5: Merging datasets...');
    const mergedData = await merger.mergeData(sequenceData, faostatData, mappingData);

    // Step 6: Generate summary
    console.log('\n📈 Step 6: Generating summary...');
    const summary = merger.generateDataSummary(mergedData);
    
    console.log('\n' + '='.repeat(50));
    console.log('📋 DATA PROCESSING SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Records: ${summary.total_records}`);
    console.log(`Genomic Sequences: ${summary.sequence_records}`);
    console.log(`FAOSTAT Records: ${summary.faostat_records}`);
    console.log(`Average Sequence Length: ${summary.avg_sequence_length.toFixed(2)} bp`);
    console.log(`Average GC Content: ${summary.avg_gc_content.toFixed(2)}%`);
    console.log(`Unique Source Files: ${summary.unique_sources}`);
    console.log('='.repeat(50));

    // Create a detailed summary file
    await createSummaryFile(summary, mergedData);

    console.log('\n✅ Data processing completed successfully!');
    console.log(`📄 Training data saved to: MODEL_TRAINING_DATA.csv`);
    console.log(`📋 Summary saved to: data_summary.json`);

  } catch (error) {
    console.error('\n❌ Error during data processing:', error);
    process.exit(1);
  }
}

async function createSummaryFile(summary, data) {
  const detailedSummary = {
    ...summary,
    processing_timestamp: new Date().toISOString(),
    data_types: {
      genomic_sequence: data.filter(r => r.data_type === 'genomic_sequence').length,
      agricultural_statistics: data.filter(r => r.data_type === 'agricultural_statistics').length
    },
    sequence_stats: {
      min_length: Math.min(...data.filter(r => r.sequence_length > 0).map(r => r.sequence_length)),
      max_length: Math.max(...data.filter(r => r.sequence_length > 0).map(r => r.sequence_length)),
      avg_quality: data.filter(r => r.quality_score_avg > 0).reduce((sum, r) => sum + r.quality_score_avg, 0) / data.filter(r => r.quality_score_avg > 0).length || 0
    },
    file_info: {
      output_file: 'MODEL_TRAINING_DATA.csv',
      columns: Object.keys(data[0] || {}),
      estimated_size_mb: (JSON.stringify(data).length / (1024 * 1024)).toFixed(2)
    }
  };

  await import('fs').then(fs => {
    fs.writeFileSync('./data_summary.json', JSON.stringify(detailedSummary, null, 2));
  });
}

// Run the process
processAllData();