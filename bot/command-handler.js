exports.sendDM = (bot, to, msg) => {
	//TODO : validation
	bot.fetchUser(to)
		.then(user => user.send(msg))
		.catch(console.error);
}
