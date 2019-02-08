module.exports = {
	/*
		Startup loading..
		Until the `progess` bar goes away
	*/
	startup: 'progress',

	/*
		Login verification
	*/
	rememberMe: 'input[name="rememberMe"]',

	/*
		QR Code location
	*/
	qrcode: 'img[alt]',

	/*
		Search bar input
	*/
	searchBar: '#side input[type="text"]',

	/*
		Delete search
	*/
	deleteSearch: '#side span[data-icon="x-alt"]',

	/*
		Chat selector
	*/
	chatSelectorFirst: '#pane-side span[title][dir]',

	/*
		Chat input
	*/
	chatInput: '#main > footer div.selectable-text[contenteditable]',

	/*
		Unread messages
	*/
	unreadMessage: '#pane-side .CxUIE',

	/*
		RECIVED MESSAGES
	*/
	recivedMessages: '.copyable-area .message-in .selectable-text',

	/*
		Header chat
	*/
	headerChat: '#main header',

	/*
		Information
		Name, phone, etc..
	*/
	userInfo: '.copyable-area span[dir="auto"] span'

};