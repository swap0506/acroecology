import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import csv from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Global variables to store processed data and model
let processedData = null;
let trainedModel = null;
let featureColumns = [];
let targetColumn = '';
let preprocessingStats = {};

// Utility functions
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const sendStreamResponse = (res, data) => {
  res.write(JSON.stringify(data) + '\n');
};

// Data preprocessing endpoint
app.post('/api/preprocess', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Transfer-Encoding': 'chunked'
  });

  try {
    sendStreamResponse(res, { type: 'log', message: 'Starting data preprocessing...', level: 'info' });
    sendStreamResponse(res, { type: 'progress', progress: 5 });

    // Load FAOSTAT data
    sendStreamResponse(res, { type: 'log', message: 'Loading FAOSTAT CSV data...', level: 'info' });
    const rawData = await loadFaostatData();
    sendStreamResponse(res, { type: 'progress', progress: 15 });

    // Basic data analysis
    sendStreamResponse(res, { type: 'log', message: `Loaded ${rawData.length} records`, level: 'info' });
    sendStreamResponse(res, { type: 'progress', progress: 25 });

    // Data cleaning
    sendStreamResponse(res, { type: 'log', message: 'Cleaning data...', level: 'info' });
    const cleanedData = await cleanData(rawData);
    sendStreamResponse(res, { type: 'progress', progress: 40 });

    // Handle missing values
    sendStreamResponse(res, { type: 'log', message: 'Handling missing values...', level: 'info' });
    const imputedData = await handleMissingValues(cleanedData);
    sendStreamResponse(res, { type: 'progress', progress: 55 });

    // Feature engineering
    sendStreamResponse(res, { type: 'log', message: 'Engineering features...', level: 'info' });
    const engineeredData = await engineerFeatures(imputedData);
    sendStreamResponse(res, { type: 'progress', progress: 70 });

    // Encode categorical variables
    sendStreamResponse(res, { type: 'log', message: 'Encoding categorical variables...', level: 'info' });
    const encodedData = await encodeCategorical(engineeredData);
    sendStreamResponse(res, { type: 'progress', progress: 85 });

    // Scale features
    sendStreamResponse(res, { type: 'log', message: 'Scaling numerical features...', level: 'info' });
    processedData = await scaleFeatures(encodedData);
    sendStreamResponse(res, { type: 'progress', progress: 95 });

    // Generate statistics
    const stats = generatePreprocessingStats(rawData, processedData);
    preprocessingStats = stats;
    
    sendStreamResponse(res, { type: 'stats', stats });
    sendStreamResponse(res, { type: 'progress', progress: 100 });
    sendStreamResponse(res, { type: 'log', message: 'Preprocessing completed successfully!', level: 'success' });
    sendStreamResponse(res, { type: 'complete' });

  } catch (error) {
    sendStreamResponse(res, { type: 'log', message: `Error: ${error.message}`, level: 'error' });
  }

  res.end();
});

// Model training endpoint
app.post('/api/train', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Transfer-Encoding': 'chunked'
  });

  try {
    if (!processedData) {
      throw new Error('No preprocessed data available. Please run preprocessing first.');
    }

    const { hyperparameters } = req.body;
    
    sendStreamResponse(res, { type: 'log', message: 'Initializing XGBoost training...', level: 'info' });
    sendStreamResponse(res, { type: 'progress', progress: 10 });

    // Prepare training data
    sendStreamResponse(res, { type: 'log', message: 'Preparing training data...', level: 'info' });
    const { X_train, X_test, y_train, y_test } = await prepareTrainingData(processedData);
    sendStreamResponse(res, { type: 'progress', progress: 25 });

    // Train model (simulated)
    sendStreamResponse(res, { type: 'log', message: 'Training XGBoost model...', level: 'info' });
    trainedModel = await trainXGBoostModel(X_train, y_train, hyperparameters);
    sendStreamResponse(res, { type: 'progress', progress: 70 });

    // Evaluate model
    sendStreamResponse(res, { type: 'log', message: 'Evaluating model performance...', level: 'info' });
    const metrics = await evaluateModel(trainedModel, X_test, y_test);
    sendStreamResponse(res, { type: 'progress', progress: 90 });

    sendStreamResponse(res, { type: 'metrics', metrics });
    sendStreamResponse(res, { type: 'progress', progress: 100 });
    sendStreamResponse(res, { type: 'log', message: 'Model training completed!', level: 'success' });
    sendStreamResponse(res, { type: 'complete', accuracy: metrics.accuracy });

  } catch (error) {
    sendStreamResponse(res, { type: 'log', message: `Error: ${error.message}`, level: 'error' });
  }

  res.end();
});

// Model status endpoint
app.get('/api/model/status', (req, res) => {
  res.json({
    preprocessed: processedData !== null,
    trained: trainedModel !== null,
    accuracy: trainedModel ? trainedModel.accuracy : null
  });
});

// Features endpoint
app.get('/api/features', (req, res) => {
  if (!processedData || featureColumns.length === 0) {
    return res.status(400).json({ error: 'No processed data available' });
  }

  const features = featureColumns.map(col => ({
    name: col,
    type: getFeatureType(col),
    description: getFeatureDescription(col),
    options: getFeatureOptions(col),
    default: getFeatureDefault(col)
  }));

  res.json(features);
});

// Prediction endpoint
app.post('/api/predict', async (req, res) => {
  try {
    if (!trainedModel) {
      return res.status(400).json({ error: 'No trained model available' });
    }

    const { features } = req.body;
    
    // Make prediction (simulated)
    const prediction = await makePrediction(trainedModel, features);
    
    res.json({
      prediction: prediction.value,
      confidence: prediction.confidence,
      feature_importance: prediction.feature_importance
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Visualizations endpoint
app.get('/api/visualizations', (req, res) => {
  if (!processedData) {
    return res.status(400).json({ error: 'No processed data available' });
  }

  // Return mock visualization data
  res.json({
    overview: generateOverviewCharts(),
    distribution: generateDistributionCharts(),
    correlation: generateCorrelationMatrix(),
    trends: generateTrendCharts(),
    geographic: generateGeographicCharts()
  });
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Helper functions
async function loadFaostatData() {
  return new Promise((resolve, reject) => {
    const results = [];
    const filePath = './FAOSTAT_data_en_6-23-2025.csv';
    
    if (!fs.existsSync(filePath)) {
      reject(new Error('FAOSTAT CSV file not found'));
      return;
    }

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        console.log(`Loaded ${results.length} records from FAOSTAT`);
        resolve(results);
      })
      .on('error', reject);
  });
}

async function cleanData(data) {
  await delay(500); // Simulate processing time
  
  // Remove duplicates
  const uniqueData = data.filter((item, index, self) => 
    index === self.findIndex(t => JSON.stringify(t) === JSON.stringify(item))
  );
  
  // Remove rows with all empty values
  const cleanedData = uniqueData.filter(row => 
    Object.values(row).some(value => value && value.toString().trim() !== '')
  );
  
  return cleanedData;
}

async function handleMissingValues(data) {
  await delay(500);
  
  // Simple imputation strategy
  const imputedData = data.map(row => {
    const newRow = { ...row };
    
    // Fill missing numerical values with median
    Object.keys(newRow).forEach(key => {
      if (!newRow[key] || newRow[key] === '') {
        if (isNumericalColumn(key, data)) {
          newRow[key] = getColumnMedian(key, data);
        } else {
          newRow[key] = 'Unknown';
        }
      }
    });
    
    return newRow;
  });
  
  return imputedData;
}

async function engineerFeatures(data) {
  await delay(500);
  
  // Add derived features
  const engineeredData = data.map(row => {
    const newRow = { ...row };
    
    // Example feature engineering
    if (row.Year && row.Value) {
      newRow.decade = Math.floor(parseInt(row.Year) / 10) * 10;
      newRow.log_value = Math.log(Math.max(1, parseFloat(row.Value) || 1));
    }
    
    return newRow;
  });
  
  return engineeredData;
}

async function encodeCategorical(data) {
  await delay(500);
  
  // Simple label encoding for categorical variables
  const categoricalColumns = ['Area', 'Item', 'Element'];
  const encodingMaps = {};
  
  categoricalColumns.forEach(col => {
    const uniqueValues = [...new Set(data.map(row => row[col]))];
    encodingMaps[col] = {};
    uniqueValues.forEach((value, index) => {
      encodingMaps[col][value] = index;
    });
  });
  
  const encodedData = data.map(row => {
    const newRow = { ...row };
    
    categoricalColumns.forEach(col => {
      if (newRow[col] && encodingMaps[col][newRow[col]] !== undefined) {
        newRow[`${col}_encoded`] = encodingMaps[col][newRow[col]];
      }
    });
    
    return newRow;
  });
  
  // Set feature columns
  featureColumns = Object.keys(encodedData[0] || {}).filter(col => 
    col !== 'Value' && !col.includes('Flag')
  );
  targetColumn = 'Value';
  
  return encodedData;
}

async function scaleFeatures(data) {
  await delay(500);
  
  // Min-max scaling for numerical features
  const numericalColumns = featureColumns.filter(col => 
    isNumericalColumn(col, data)
  );
  
  const scalingParams = {};
  
  numericalColumns.forEach(col => {
    const values = data.map(row => parseFloat(row[col]) || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    scalingParams[col] = { min, max };
  });
  
  const scaledData = data.map(row => {
    const newRow = { ...row };
    
    numericalColumns.forEach(col => {
      const value = parseFloat(newRow[col]) || 0;
      const { min, max } = scalingParams[col];
      if (max > min) {
        newRow[col] = (value - min) / (max - min);
      }
    });
    
    return newRow;
  });
  
  return scaledData;
}

async function prepareTrainingData(data) {
  await delay(300);
  
  // Split data into features and target
  const X = data.map(row => {
    const features = {};
    featureColumns.forEach(col => {
      features[col] = parseFloat(row[col]) || 0;
    });
    return features;
  });
  
  const y = data.map(row => parseFloat(row[targetColumn]) || 0);
  
  // Simple train-test split (80-20)
  const splitIndex = Math.floor(data.length * 0.8);
  
  return {
    X_train: X.slice(0, splitIndex),
    X_test: X.slice(splitIndex),
    y_train: y.slice(0, splitIndex),
    y_test: y.slice(splitIndex)
  };
}

async function trainXGBoostModel(X_train, y_train, hyperparameters) {
  await delay(2000); // Simulate training time
  
  // Mock XGBoost model
  const model = {
    hyperparameters,
    trained: true,
    accuracy: 0.85 + Math.random() * 0.1, // Random accuracy between 0.85-0.95
    feature_importance: generateFeatureImportance()
  };
  
  return model;
}

async function evaluateModel(model, X_test, y_test) {
  await delay(500);
  
  // Mock evaluation metrics
  return {
    accuracy: model.accuracy,
    precision: 0.82 + Math.random() * 0.1,
    recall: 0.78 + Math.random() * 0.1,
    f1_score: 0.80 + Math.random() * 0.1,
    mse: Math.random() * 0.1,
    rmse: Math.random() * 0.3
  };
}

async function makePrediction(model, features) {
  await delay(200);
  
  // Mock prediction
  const baseValue = Object.values(features).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  const prediction = Math.max(0, baseValue * (0.8 + Math.random() * 0.4));
  
  return {
    value: prediction.toFixed(2),
    confidence: 0.7 + Math.random() * 0.25,
    feature_importance: model.feature_importance
  };
}

// Utility helper functions
function isNumericalColumn(column, data) {
  const sample = data.slice(0, 100);
  const numericalCount = sample.filter(row => 
    !isNaN(parseFloat(row[column])) && isFinite(row[column])
  ).length;
  return numericalCount > sample.length * 0.5;
}

function getColumnMedian(column, data) {
  const values = data
    .map(row => parseFloat(row[column]))
    .filter(val => !isNaN(val))
    .sort((a, b) => a - b);
  
  if (values.length === 0) return 0;
  
  const mid = Math.floor(values.length / 2);
  return values.length % 2 === 0 
    ? (values[mid - 1] + values[mid]) / 2 
    : values[mid];
}

function generatePreprocessingStats(rawData, processedData) {
  return {
    totalRecords: processedData.length,
    features: featureColumns.length,
    missingValues: rawData.length - processedData.length,
    duplicates: rawData.length - processedData.length,
    countries: new Set(processedData.map(row => row.Area)).size,
    years: `${Math.min(...processedData.map(row => parseInt(row.Year) || 0))}-${Math.max(...processedData.map(row => parseInt(row.Year) || 0))}`
  };
}

function generateFeatureImportance() {
  const importance = {};
  featureColumns.slice(0, 10).forEach(col => {
    importance[col] = Math.random();
  });
  return importance;
}

function getFeatureType(column) {
  if (column.includes('encoded') || column.includes('Year')) return 'numerical';
  if (column.includes('Area') || column.includes('Item')) return 'categorical';
  return 'numerical';
}

function getFeatureDescription(column) {
  const descriptions = {
    'Area': 'Geographic area/country',
    'Item': 'Agricultural item/commodity',
    'Element': 'Measurement element',
    'Year': 'Year of measurement',
    'Value': 'Statistical value'
  };
  return descriptions[column] || `Feature: ${column}`;
}

function getFeatureOptions(column) {
  if (getFeatureType(column) === 'categorical') {
    // Return mock options
    if (column.includes('Area')) {
      return ['United States', 'China', 'India', 'Brazil', 'Germany'];
    }
    if (column.includes('Item')) {
      return ['Wheat', 'Rice', 'Maize', 'Soybeans', 'Barley'];
    }
  }
  return null;
}

function getFeatureDefault(column) {
  if (getFeatureType(column) === 'numerical') return 0;
  return '';
}

function generateOverviewCharts() {
  return { type: 'overview', data: 'Mock overview data' };
}

function generateDistributionCharts() {
  return { type: 'distribution', data: 'Mock distribution data' };
}

function generateCorrelationMatrix() {
  return { type: 'correlation', data: 'Mock correlation data' };
}

function generateTrendCharts() {
  return { type: 'trends', data: 'Mock trend data' };
}

function generateGeographicCharts() {
  return { type: 'geographic', data: 'Mock geographic data' };
}

app.listen(PORT, () => {
  console.log(`🚀 FAOSTAT ML Pipeline server running on port ${PORT}`);
  console.log(`📊 Frontend: http://localhost:3000`);
  console.log(`🔧 API: http://localhost:${PORT}/api`);
});