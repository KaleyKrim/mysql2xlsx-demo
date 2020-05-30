require('dotenv').config();
const mysql = require('mysql2/promise');
const excel = require('exceljs');

function filterRowsByShippingSpeed(rowsToFilter, shippingSpeed) {
	return rowsToFilter.filter(row => row["shipping_speed"] == shippingSpeed);
}

const COMMON_COLUMNS = [
	{ header: "Start Weight", key: "start_weight" },
	{ header: "End Weight", key: "end_weight" },
];

const SHEET_NAMES_BY_SHIPPING_SPEED = {
	standard: "Domestic Standard Rates",
	expedited: "Domestic Expedited Rates",
	nextDay: "Domestic Next Day Rates",
	intlEconomy: "International Economy Rates",
	intlExpedited: "International Expedited Rates",
};

function getColumns(zones) {
	return [
		...COMMON_COLUMNS,
		...zones.map(zone => ({ header: `Zone ${zone}`, key: zone }))
	]
};

function getRows(singleSheetData) {
	const startWeights = Array.from(new Set(singleSheetData.map(record => record["start_weight"]))).sort((a, b) => a - b);
	const rows = [];
	startWeights.forEach(startWeight => {
		const dataForAllZones = singleSheetData.filter(data => data["start_weight"] == startWeight);
		const zoneRows = {};
		for (const data of dataForAllZones) {
			zoneRows[data["zone"]] = data["rate"];
		}

		const row = {
			start_weight: startWeight,
			end_weight: dataForAllZones[0]["end_weight"],
			...zoneRows,
		};

		rows.push(row);
	});
	return rows;
}

(async () => {
	try {
		const conn = await mysql.createConnection({
			host: process.env.DB_HOST,
			user: process.env.DB_USER,
			password: process.env.DB_PASSWORD,
			database: process.env.DB_NAME,
		});

		const specifiedClientId = process.argv[2] ? parseInt(process.argv[2]) : 1240;
		const rows = (await conn.execute('SELECT * FROM `rates` WHERE `client_id` = ?', [specifiedClientId]))[0];
		const domesticRecords = rows.filter(row => row["locale"] == "domestic");
		const internationalRecords = rows.filter(row => row["locale"] == "international");

		// filter data by shipping speed (sheet)
		const domesticStandard = filterRowsByShippingSpeed(domesticRecords, "standard");
		const domesticExpedited = filterRowsByShippingSpeed(domesticRecords, "expedited");
		const domesticNextDay = filterRowsByShippingSpeed(domesticRecords, "nextDay");

		const intlEconomy = filterRowsByShippingSpeed(internationalRecords, "intlEconomy");
		const intlExpedited = filterRowsByShippingSpeed(internationalRecords, "intlExpedited");

		// get a set of all zones
		const domesticZones = Array.from(new Set(domesticRecords.map(row => row["zone"]))).sort();
		const intlZones = Array.from(new Set(internationalRecords.map(row => row["zone"]))).sort();

		const domesticColumns = getColumns(domesticZones);
		const intlColumns = getColumns(intlZones);

		// loop through data by worksheet, create xlsx file
		const workbook = new excel.Workbook();
		for (const singleSheetData of [ domesticStandard, domesticExpedited, domesticNextDay, intlEconomy, intlExpedited ]) {
			const worksheetName = SHEET_NAMES_BY_SHIPPING_SPEED[singleSheetData[0]["shipping_speed"]];
			const worksheet = workbook.addWorksheet(worksheetName);
			worksheet.columns = singleSheetData[0]["locale"] == "domestic" ? domesticColumns : intlColumns;
			const rows = getRows(singleSheetData);
			worksheet.addRows(rows);
		}

		const fileName = `./output/client-${specifiedClientId}-rates.xlsx`;
		await workbook.xlsx.writeFile(fileName);
		console.log(`Finished writing data for client ${specifiedClientId} to ${fileName}`);
	} catch (e) {
		console.error("mysql2xlsx conversion failed:", e);
	} finally {
		process.exit();
	}

})();
