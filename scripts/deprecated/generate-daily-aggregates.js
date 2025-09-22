const fs = require('fs');
const path = require('path');

async function generateDailyAggregates() {
  console.log('Starting daily data aggregation...');

  const results = [];
  const monthlyDir = path.join(__dirname, '../public/data/local_economy/monthly');

  // Process each month
  for (let month = 1; month <= 12; month++) {
    const monthStr = month.toString().padStart(2, '0');
    const filePath = path.join(monthlyDir, `2024-${monthStr}.json`);

    console.log(`Processing month ${monthStr}...`);

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // Group by date
      const dailyData = {};

      data.forEach(record => {
        const date = record['기준일자'];
        if (!dailyData[date]) {
          dailyData[date] = {
            date: date,
            dateCode: date.replace(/-/g, ''), // YYYYMMDD format
            totalSales: 0,
            tempSum: 0,
            tempCount: 0
          };
        }

        // Aggregate sales
        dailyData[date].totalSales += record['총매출액'] || 0;

        // Aggregate temperature
        if (record['일평균기온'] !== null && record['일평균기온'] !== undefined) {
          dailyData[date].tempSum += record['일평균기온'];
          dailyData[date].tempCount++;
        }
      });

      // Calculate averages and convert sales to 억원
      Object.values(dailyData).forEach(day => {
        results.push({
          date: day.date,
          dateCode: day.dateCode,
          avgTemperature: day.tempCount > 0 ?
            Math.round(day.tempSum / day.tempCount * 10) / 10 : // Round to 1 decimal
            null,
          totalSalesHundredMillion: Math.round(day.totalSales / 100000000) // Convert to 억원 and round
        });
      });

      console.log(`  - Processed ${Object.keys(dailyData).length} days`);

    } catch (error) {
      console.error(`Error processing month ${monthStr}:`, error.message);
    }
  }

  // Sort by date
  results.sort((a, b) => a.dateCode.localeCompare(b.dateCode));

  // Save as JSON
  const outputPath = path.join(__dirname, '../public/data/daily_aggregates.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

  console.log(`\nAggregation complete!`);
  console.log(`Total days processed: ${results.length}`);
  console.log(`Output saved to: ${outputPath}`);

  // Print sample data
  console.log('\nSample data (first 3 days):');
  results.slice(0, 3).forEach(day => {
    console.log(`  ${day.date}: ${day.avgTemperature}°C, ${day.totalSalesHundredMillion}억원`);
  });

  // Print statistics
  const totalSales = results.reduce((sum, day) => sum + day.totalSalesHundredMillion, 0);
  const avgDailySales = Math.round(totalSales / results.length);
  console.log(`\nStatistics:`);
  console.log(`  Average daily sales: ${avgDailySales}억원`);
  console.log(`  Total annual sales: ${totalSales.toLocaleString()}억원`);
}

// Run the aggregation
generateDailyAggregates().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});