const Discord = require('discord.js');
const bot = new Discord.Client();

const mysql = require('mysql');

const fs = require('fs');
const ini = require('ini');
const Reminders = require('./reminder-queue.js');

const conf = ini.parse(fs.readFileSync('./config.ini', 'utf-8'));
const token = conf.discord.token;
const dbconf = conf.database;

const DEFAULT_LIMIT = 5;

let reminderQueue = new Reminders.Reminders();

let conn = mysql.createConnection({
	host: dbconf.host,
	user: dbconf.user,
	password: dbconf.password,
	database: dbconf.db
});

bot.login(token);

bot.on('ready', () => {
	console.log("Remind Bot is ready.");
	console.log("Connected to servers:" + bot.guilds.map(e => e.name).join());
});

conn.connect((err) => {
	if (err) throw err;
	console.log("Successfully connected to MySQL database!");
	console.log("Fetching reminders from database...");
	conn.query("SELECT * FROM Reminders;", (err, res, fld) => {
		if (err) throw err;
		for (let i = 0; i < res.length; i++) {
			let newRem = new Reminders.Reminder(res[i].time, res[i].user, res[i].context, res[i].reminder);
			reminderQueue.add(newRem);
		}
	});
});

bot.on('message', message => {
	let msg = message.toString();
	let cnl = message.channel;
	if (msg.charAt(0) === "$") {
		let cmd = msg.substr(1).split(" ");
		let op = cmd[0];
		switch (op) {
			// Simple direct message command
			case "msg":
				let receiver = cmd[1];
				let text = cmd[2];
				bot.fetchUser(receiver)
					.then(user => user.send(text))
					.catch(console.error);
				break;
			// Formats and echoes to the user the last n messages from the channel
			case "recall": {
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
			}
			case "remindme":
				if (cmd.length > 4 || cmd.legnth < 3) {
					cnl.send("Error> Usage: $remindme <#[S|M|H|D|W]> <# msgs to save ?> <comment>");
					break;
				}
				let dur = cmd[1];
				let limit = cmd.length === 4 ? cmd[2] : DEFAULT_LIMIT;
				let reminder = cmd.length === 4 ? cmd[3] : cmd[2];

				let durReg = /^([0-9]+)([A-Z])$/;
				let match = durReg.exec(dur);
				if (match === null) {
					cnl.send("Error> Invalid time interval specified. Expected format: <$[S|M|H|D|W]>");
					break;
				}
				let value = parseInt(match[1]);
				let type = match[2];
				let time = Math.round((new Date).getTime()/1000);

				time += (type === "S") ? value : 0;
				time += (type === "M") ? value * 60 : 0;
				time += (type === "H") ? value * 60 * 60 : 0;
				time += (type === "D") ? value * 60 * 60 * 24 : 0;
				time += (type === "W") ? value * 60 * 60 * 24 * 7 : 0;

				cnl.fetchMessages({limit: limit, before: message.id})
					.then(messages => {
						var context = messages.map((e) =>
							e.author.username
							+ " [" + e.createdTimestamp + "] "
							+ e.toString()).reverse().join('\n');
						let newRem = new Reminders.Reminder(message.author.id, time, context, reminder);
						reminderQueue.add(newRem);
						conn.query("INSERT INTO reminders (user, time, reminder, context) VALUES('" 
							+ message.author.id 	+ "','" 
							+ time 			+ "','" 
							+ reminder 		+ "','" 
							+ context		+ "');", 
							(err, res) => {
								if (err) throw err;
								console.log("Reminder sucessfully added.");
						});
					})
					.catch(console.error);	
				break;
		}
	}
});

function sleep(ms) {
	return new Promise(res => setTimeout(res, ms));
}

async function loop(){
	while (true) {
		console.log(reminderQueue);
		await sleep(3000);
	}
}

loop();
