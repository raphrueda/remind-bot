const Discord = require('discord.js');
const bot = new Discord.Client();

const fs = require('fs');
const ini = require('ini');

const conf = ini.parse(fs.readFileSync('./config.ini', 'utf-8'));

let token = conf.discord.token;

bot.login(token);

bot.on('ready', () => console.log("I'm ready..."));

bot.on('message', message => {
	let msg = message.toString();
	let cnl = message.channel;
	if (msg.charAt(0) === "$") {
		let cmd = msg.substr(1).split(" ");
		let op = cmd[0];
		switch (op) {
			case "msg":
				let receiver = cmd[1];
				let text = cmd[2];
				bot.fetchUser(receiver)
					.then(user => user.send(text))
					.catch(console.error);
				break;
			case "recall":
				let limit = cmd[1];
				cnl.fetchMessages({limit: limit, before: message.id})
					.then(messages => {
						let recallMsg = messages.map((e) => 
							e.author.username 
							+ " [" + e.createdTimestamp + "]: " 
							+ e.toString()).reverse().join('\n');
						let primerMsg = "Recalling past "
							+ limit
							+ " messages from "
							+ message.guild.name
							+ "::"
							+ message.channel.name;
						message.author.send(primerMsg);
						message.author.send(recallMsg);
					})
					.catch(console.error);
				break;
			case "remindme":
				//TODO
				break;
		}
	}
});
