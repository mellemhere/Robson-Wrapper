const puppeteer = require('puppeteer');
const { createLogger, format, transports } = require('winston');
const selectors = require('./selectors');
const { timestamp, label, printf } = format;
/*
	Global vars
*/
let browser;
let page;
let logger;

/*
	Logger format
*/
const myFormat = printf(({ level, message, label, timestamp }) => {
  return `${level}: ${message}`;
});

/*
	State functions
*/
async function checkLoginStatus() {
	logger.log('info', 'Checking login status..');

	const exists = !!(await page.$(selectors.rememberMe));

	if (exists) {
		logger.log('info', 'Not logged! Getting QRCode!');
		await page.waitForSelector(selectors.qrcode);

		const data = await page.$eval(selectors.qrcode, el => el.getAttribute('src'));

		/*
			Save QRCode to disk
		*/
		var base64Data = data.replace(/^data:image\/png;base64,/, "");
		require("fs").writeFile("qrcode.png", base64Data, 'base64', (err) => {
			if(err){
				logger.log('error', 'Opening browser');
			}
		});
		logger.log('info', 'Please scan `qrcode.png`...');

		/*
			Whatsapp refreshes its QR code every 20 seconds
		*/
		setTimeout(checkLoginStatus, 2000);
	} else {
		logger.log('info', 'Ok to go = )!');
		brain();
	}
}

async function ignite() {

	/*
		Setup logger
	*/
	logger = createLogger({
	  format: myFormat,
	  transports: [
	    new transports.Console(),
	    new transports.File({ filename: 'logfile.log' })
	  ]
	});

	/*
		Setup puppeteer
	*/
	logger.log('info', 'Starting puppeteer!');
	browser = await puppeteer.launch({
		headless: false,
		ignoreHTTPSErrors: true,
		userDataDir: "./robson_data",
		args: [
		'--disable-gpu',
		'--disable-infobars',
		'--window-position=0,0',
		'--ignore-certificate-errors',
		'--ignore-certificate-errors-spki-list',
		'--enable-features=NetworkService',
		'--disable-setuid-sandbox',
		'--no-sandbox'
		]
	});

	logger.log('info', 'Opening browser');
	page = await browser.newPage();
	const override = Object.assign(page.viewport(), {width: 1366});
	await page.setViewport(override);

	logger.log('info', 'Opening whatsapp web...');
	await page.goto('https://web.whatsapp.com', {waitUntil: 'networkidle2'});
	logger.log('info', 'Waiting to load...');
	await page.waitFor((item) => {
		return !document.querySelector(item);
	}, {}, selectors.startup);

	/*
		
	*/
	checkLoginStatus();
	
}


function sendMessage(phoneNumber, message) {
	return new Promise(async (resolve, reject) => {
		logger.log('info', `Sending '${message}' to ${phoneNumber}`);
		await page.type(selectors.searchBar, phoneNumber);

		try {
	    	await page.waitForSelector(selectors.chatSelectorFirst);
	    	await page.waitFor(1000);
	    	await page.click(selectors.chatSelectorFirst);

			/*
				Lets type the message
			*/
			await page.click(selectors.chatInput);
			let parts = message.split('\n');

	      	for (var i = 0; i < parts.length; i++) {
		        await page.keyboard.down('Shift');
		        await page.keyboard.press('Enter');
		        await page.keyboard.up('Shift');

		        await page.keyboard.type(parts[i]);
	      	}

	      	//Send
	      	await page.keyboard.press('Enter');

	      	resolve();
		} catch (e) {
			await page.waitForSelector(selectors.deleteSearch);
			await page.click(selectors.deleteSearch);
		    logger.log('error', e);
		    reject();
		}
	});
} 

/*
	MAIN LOOP
*/
async function brain() {
	/*
		Check if has messages to send
	*/

	/*
		Check if has messages to process
	*/
}



/*
	Starts things up
*/
ignite();