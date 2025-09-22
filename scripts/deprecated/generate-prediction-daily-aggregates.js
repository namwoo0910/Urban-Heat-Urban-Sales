const fs = require('fs');
const path = require('path');

async function generatePredictionDailyAggregates() {
  console.log('Starting prediction daily data aggregation...');

  const results = [];
  const predictionFile = path.join(__dirname, '../public/data/prediction/2024-07_simulated_modified.json');

  console.log('Processing July prediction data...');

  try {
    const data = JSON.parse(fs.readFileSync(predictionFile, 'utf8'));

    // Group by date
    const dailyData = {};

    data.forEach(record => {
      const date = record['기준일자'];
      if (!dailyData[date]) {
        dailyData[date] = {
          date: date,
          dateCode: date.replace(/-/g, ''), // YYYYMMDD format
          tempSum: 0,
          tempCount: 0,
          totalSales: 0,
          totalSalesT5: 0,
          totalSalesT10: 0,
          totalSalesT15: 0,
          totalSalesT20: 0
        };
      }

      // Aggregate temperature
      if (record['일평균기온'] !== null && record['일평균기온'] !== undefined) {
        dailyData[date].tempSum += record['일평균기온'];
        dailyData[date].tempCount++;
      }

      // Aggregate actual sales
      dailyData[date].totalSales += record['총매출액'] || 0;

      // Aggregate prediction sales for each temperature scenario
      dailyData[date].totalSalesT5 += record['총매출액_(T=5)'] || 0;
      dailyData[date].totalSalesT10 += record['총매출액_(T=10)'] || 0;
      dailyData[date].totalSalesT15 += record['총매출액_(T=15)'] || 0;
      dailyData[date].totalSalesT20 += record['총매출액_(T=20)'] || 0;
    });

    // Calculate averages and format results
    Object.values(dailyData).forEach(day => {
      const baseTemp = day.tempCount > 0 ?
        Math.round(day.tempSum / day.tempCount * 10) / 10 : // Round to 1 decimal
        null;

      results.push({
        date: day.date,
        dateCode: day.dateCode,
        avgTemperature: baseTemp,
        totalSalesHundredMillion: Math.round(day.totalSales / 100000000), // Actual sales in 억원
        scenarios: {
          t050: {
            temperature: baseTemp !== null ? Math.round((baseTemp + 5) * 10) / 10 : null,
            salesHundredMillion: Math.round(day.totalSalesT5 / 100000000)
          },
          t100: {
            temperature: baseTemp !== null ? Math.round((baseTemp + 10) * 10) / 10 : null,
            salesHundredMillion: Math.round(day.totalSalesT10 / 100000000)
          },
          t150: {
            temperature: baseTemp !== null ? Math.round((baseTemp + 15) * 10) / 10 : null,
            salesHundredMillion: Math.round(day.totalSalesT15 / 100000000)
          },
          t200: {
            temperature: baseTemp !== null ? Math.round((baseTemp + 20) * 10) / 10 : null,
            salesHundredMillion: Math.round(day.totalSalesT20 / 100000000)
          }
        }
      });
    });

    console.log(`  - Processed ${Object.keys(dailyData).length} days`);

  } catch (error) {
    console.error('Error processing prediction data:', error.message);
    process.exit(1);
  }

  // Sort by date
  results.sort((a, b) => a.dateCode.localeCompare(b.dateCode));

  // Save as JSON
  const outputPath = path.join(__dirname, '../public/data/prediction_daily_aggregates.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

  console.log(`\nAggregation complete!`);
  console.log(`Total days processed: ${results.length}`);
  console.log(`Output saved to: ${outputPath}`);

  // Print sample data
  console.log('\nSample data (first 3 days):');
  results.slice(0, 3).forEach(day => {
    console.log(`\n  ${day.date}:`);
    console.log(`    Base: ${day.avgTemperature}°C, ${day.totalSalesHundredMillion}억원`);
    console.log(`    T+5:  ${day.scenarios.t050.temperature}°C, ${day.scenarios.t050.salesHundredMillion}억원`);
    console.log(`    T+10: ${day.scenarios.t100.temperature}°C, ${day.scenarios.t100.salesHundredMillion}억원`);
    console.log(`    T+15: ${day.scenarios.t150.temperature}°C, ${day.scenarios.t150.salesHundredMillion}억원`);
    console.log(`    T+20: ${day.scenarios.t200.temperature}°C, ${day.scenarios.t200.salesHundredMillion}억원`);
  });

  // Print statistics
  const avgActual = Math.round(results.reduce((sum, day) => sum + day.totalSalesHundredMillion, 0) / results.length);
  const avgT5 = Math.round(results.reduce((sum, day) => sum + day.scenarios.t050.salesHundredMillion, 0) / results.length);
  const avgT10 = Math.round(results.reduce((sum, day) => sum + day.scenarios.t100.salesHundredMillion, 0) / results.length);
  const avgT15 = Math.round(results.reduce((sum, day) => sum + day.scenarios.t150.salesHundredMillion, 0) / results.length);
  const avgT20 = Math.round(results.reduce((sum, day) => sum + day.scenarios.t200.salesHundredMillion, 0) / results.length);

  console.log(`\nAverage Daily Sales by Scenario:`);
  console.log(`  Actual:     ${avgActual}억원`);
  console.log(`  T+5°C:      ${avgT5}억원 (${Math.round((avgT5 - avgActual) / avgActual * 100)}% change)`);
  console.log(`  T+10°C:     ${avgT10}억원 (${Math.round((avgT10 - avgActual) / avgActual * 100)}% change)`);
  console.log(`  T+15°C:     ${avgT15}억원 (${Math.round((avgT15 - avgActual) / avgActual * 100)}% change)`);
  console.log(`  T+20°C:     ${avgT20}억원 (${Math.round((avgT20 - avgActual) / avgActual * 100)}% change)`);
}

// Run the aggregation
generatePredictionDailyAggregates().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});