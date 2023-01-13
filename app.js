const { ActivityType, Client, Events, GatewayIntentBits, PresenceUpdateStatus } = require("discord.js");
const { token } = require("./config.json");

const client = new Client({
	intents: [GatewayIntentBits.Guilds]
});

const start = async () => {
	client.user.setPresence({
		afk: false,
		activities: [{
			name: "for errors during launch",
			type: ActivityType.Watching
		}],
		status: PresenceUpdateStatus.DoNotDisturb
	});

	client.user.setPresence({
		afk: true,
		activities: [{
			name: "commands",
			type: ActivityType.Listening
		}],
		status: PresenceUpdateStatus.Idle
	});

	console.info("Logged as " + client.user.tag);
};


client.once(Events.ClientReady,start);
client.login(token);

process.on("uncaughtException",(e) => {
	client.destroy();
	throw e;
});