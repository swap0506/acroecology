# Data Extraction and Merger for Model Training

This project extracts and merges data from FASTQ.7z and FAOSTAT CSV files to create a comprehensive dataset for machine learning model training.

## Features

- **FASTQ Data Extraction**: Extracts and processes genomic sequence data from compressed FASTQ files
- **FAOSTAT Data Processing**: Reads and processes agricultural statistics data
- **Mapping File Integration**: Incorporates sample mapping information
- **Data Merging**: Combines all datasets into a single CSV file optimized for model training
- **Feature Engineering**: Calculates sequence statistics, GC content, quality scores, and complexity metrics

## Output

The main output file `MODEL_TRAINING_DATA.csv` contains:

### Genomic Sequence Features:
- `sequence_id`: Unique sequence identifier
- `sequence_length`: Length of the DNA sequence
- `gc_content`: GC content percentage
- `a_count`, `t_count`, `g_count`, `c_count`: Base counts
- `quality_score_avg`: Average quality score
- `sequence_complexity`: Sequence complexity measure
- `has_ambiguous_bases`: Binary indicator for ambiguous bases

### Agricultural Data Features:
- `area`: Geographic area
- `item`: Agricultural item/crop
- `element`: Measured element
- `year`: Year of measurement
- `value`: Statistical value
- `unit`: Unit of measurement

### Metadata:
- `record_id`: Unique record identifier
- `data_type`: Type of data (genomic_sequence or agricultural_statistics)
- `source_file`: Original source file
- Sample mapping information when available

## Usage

```bash
# Install dependencies
npm install

# Process all data
npm run process

# Or run individual steps
npm run extract  # Extract FASTQ data only
npm run merge    # Merge data only
```

## File Structure

```
├── src/
│   ├── process-all.js      # Main processing script
│   ├── data-extractor.js   # FASTQ and FAOSTAT extraction
│   ├── fastq-parser.js     # FASTQ file parsing
│   ├── data-merger.js      # Data merging and CSV output
│   └── mapping-parser.js   # Mapping file processing
├── extracted_data/         # Temporary extraction directory
├── processed_data/         # Processed data directory
├── MODEL_TRAINING_DATA.csv # Final training dataset
└── data_summary.json       # Processing summary
```

## Requirements

- Node.js 16+
- 7zip or p7zip for archive extraction
- Sufficient disk space for extracted FASTQ files

## Data Quality

The merger includes data validation and quality checks:
- Sequence length validation
- Quality score calculation
- GC content analysis
- Complexity scoring
- Missing data handling

## Model Training Ready

The output CSV is structured for immediate use in machine learning pipelines with:
- Consistent column naming
- Proper data types
- Feature scaling preparation
- Missing value indicators
- Categorical encoding ready fields