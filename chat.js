const puppeteer = require('puppeteer');
const { createLogger, format, transports } = require('winston');
const selectors = require('./selectors');
const { timestamp, label, printf } = format;
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
/*
	Global vars
*/
let browser;
let page;
let logger;

let lastReadMessage = {phone: '', message: ''};

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
		headless: true,
		ignoreHTTPSErrors: true,
		userDataDir: "./robson_data",
		args: [
		'--disable-gpu',
		'--disable-dev-shm-usage',
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

async function sendMessageOnChat(message) {

	try {
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

      	await page.keyboard.press('Enter');
      	await page.keyboard.press('Enter');

	} catch (e) {
	    logger.log('error', e);
	}

} 


async function hasNewMessage(){
	return await page.$(selectors.unreadMessage) !== null;
}

async function readMessage(){
	try {
		await page.click(selectors.unreadMessage);
		/*
			Descobre de quem veio a mensagem
		*/
		await page.click(selectors.headerChat);

		var messages = await page.$$(selectors.recivedMessages);
		var message = await page.evaluate(el => el.innerHTML, messages[messages.length - 1]);
		//await page.waitFor(1000);
		var infos = await page.$$(selectors.userInfo);
		var phone = false;

		for(let target of infos){
		  const iHtml = await page.evaluate(el => el.innerHTML, target); 
		  if (iHtml.indexOf('+55 ') !== -1) {
		    phone = iHtml.split(' ').pop().replace('-', '');
		    break;
		  }
		}

		if(!phone){
			logger.log('error', 'Nao consegui localizar o telefone!');
			//await sendMessageOnChat('Não estou conseguindo localizar seu numero!');
			return false;
		}


		if(!message || message.length === 0){
			logger.log('error', 'Nao consegui localizar a mensagem!');
			//await sendMessageOnChat('Não entendi!');
			return false;
		}

		if(lastReadMessage.message !== message){
			lastReadMessage = {phone: phone, message: message};
			return lastReadMessage;
		} else {
			return false;
		}
	} catch(e) {
		logger.log('error', e);
		return false;
	}
	
}


function processCommand(message){

	var realMessage = message.toLowerCase();

	switch(realMessage){
		case "ping":
			return "pong";
		case "dado":
			return 'O dado deu: *' + Math.floor(Math.random() * 6) + '*';
		default:
			return `Não entendi o comando *${message}*`;
			break;
	}


}

/*
	MAIN LOOP
*/
async function brain() {
	/*
		Check if has messages to send
	*/
	while(await hasNewMessage()){
		var message = await readMessage();
		if(message !== false) {
			console.log(message);
			logger.log('info', 'Nova mensagem:');
			logger.log('info', message);
			var resposta = processCommand(message.message);
			logger.log('info', 'resposta:');
			logger.log('info', resposta);
			
			sendMessageOnChat(resposta);
		}
	}

	//ask();
	/*
		Check if has messages to process
	*/
	setTimeout(() => brain(), 50);
}



/*
	Starts things up
*/
ignite();

/*function ask(){
	rl.question('Para quem voce quer mandar mensagem?', (answer) => {
		rl.question('Qual a mensagem?', (msg) => {
		  sendMessage(answer, msg);
		  ask();
		});
	});
}*/
