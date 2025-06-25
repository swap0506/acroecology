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
    let extractionSuccessful = false;
    
    try {
      await extractor.extract7zFile('./FASTQ.7z');
      extractionSuccessful = true;
    } catch (error) {
      console.log('⚠️  7z extraction failed:', error.message);
      console.log('🔍 Checking if files are already extracted...');
    }

    // Step 2: Process FASTQ files
    console.log('\n🧬 Step 2: Processing FASTQ files...');
    const sequenceData = await extractor.processFastqFiles();
    
    if (sequenceData.length === 0) {
      console.log('\n❌ No FASTQ data found!');
      console.log('📋 Possible solutions:');
      console.log('   1. Install 7zip: sudo apt-get install p7zip-full (Linux) or brew install p7zip (Mac)');
      console.log('   2. Manually extract FASTQ.7z to ./extracted_data/ folder');
      console.log('   3. Check if FASTQ.7z file is corrupted');
      console.log('\n⚠️  Continuing with FAOSTAT data only...');
    } else {
      console.log(`✅ Processed ${sequenceData.length} sequences`);
    }

    // Step 3: Read FAOSTAT data
    console.log('\n📊 Step 3: Reading FAOSTAT data...');
    const faostatData = await extractor.readFaostatData();
    console.log(`✅ Loaded ${faostatData.length} FAOSTAT records`);

    // Step 4: Parse mapping file
    console.log('\n🗺️  Step 4: Parsing mapping file...');
    const mappingData = await mappingParser.parseMappingFile('./mapping_files/2097_mapping_file.txt');
    console.log(`✅ Loaded ${mappingData.length} mapping records`);

    // Check if we have any data to process
    if (sequenceData.length === 0 && faostatData.length === 0) {
      throw new Error('No data found to process. Please check your input files.');
    }

    // Step 5: Merge all data
    console.log('\n🔄 Step 5: Merging datasets...');
    const mergedData = await merger.mergeData(sequenceData, faostatData, mappingData);

    // Step 6: Generate summary
    console.log('\n📈 Step 6: Generating summary...');
    const summary = merger.generateDataSummary(mergedData);
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 DATA PROCESSING SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Records: ${summary.total_records.toLocaleString()}`);
    console.log(`Genomic Sequences: ${summary.sequence_records.toLocaleString()}`);
    console.log(`FAOSTAT Records: ${summary.faostat_records.toLocaleString()}`);
    
    if (summary.sequence_records > 0) {
      console.log(`Average Sequence Length: ${summary.avg_sequence_length.toFixed(2)} bp`);
      console.log(`Average GC Content: ${summary.avg_gc_content.toFixed(2)}%`);
    }
    
    console.log(`Unique Source Files: ${summary.unique_sources}`);
    console.log('='.repeat(60));

    // Create a detailed summary file
    await createSummaryFile(summary, mergedData);

    console.log('\n✅ Data processing completed successfully!');
    console.log(`📄 Training data saved to: MODEL_TRAINING_DATA.csv`);
    console.log(`📋 Summary saved to: data_summary.json`);

    // Provide extraction guidance if needed
    if (sequenceData.length === 0) {
      console.log('\n💡 To get FASTQ data in your training set:');
      console.log('   1. Install 7zip and run the script again');
      console.log('   2. Or manually extract FASTQ.7z to ./extracted_data/');
      console.log('   3. Then run: npm start');
    }

  } catch (error) {
    console.error('\n❌ Error during data processing:', error);
    console.error('Stack trace:', error.stack);
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
    sequence_stats: data.length > 0 ? {
      min_length: Math.min(...data.filter(r => r.sequence_length > 0).map(r => r.sequence_length)) || 0,
      max_length: Math.max(...data.filter(r => r.sequence_length > 0).map(r => r.sequence_length)) || 0,
      avg_quality: data.filter(r => r.quality_score_avg > 0).reduce((sum, r) => sum + r.quality_score_avg, 0) / data.filter(r => r.quality_score_avg > 0).length || 0
    } : {
      min_length: 0,
      max_length: 0,
      avg_quality: 0
    },
    file_info: {
      output_file: 'MODEL_TRAINING_DATA.csv',
      columns: data.length > 0 ? Object.keys(data[0]) : [],
      estimated_size_mb: (JSON.stringify(data).length / (1024 * 1024)).toFixed(2)
    },
    extraction_status: {
      fastq_extracted: data.filter(r => r.data_type === 'genomic_sequence').length > 0,
      faostat_loaded: data.filter(r => r.data_type === 'agricultural_statistics').length > 0
    }
  };

  await import('fs').then(fs => {
    fs.writeFileSync('./data_summary.json', JSON.stringify(detailedSummary, null, 2));
  });
}

// Run the process
processAllData();