const { ActivityType, ApplicationCommandType, ApplicationCommandOptionType, Client, Events, GatewayIntentBits, PresenceUpdateStatus } = require("discord.js");
const { createAudioPlayer, createAudioResource, joinVoiceChannel } = require("@discordjs/voice");

const { createReadStream, createWriteStream, readFileSync } = require("fs");
const { get } = require("https");

const { token } = require("./config.json");

const client = new Client({
	intents: [GatewayIntentBits.Guilds,GatewayIntentBits.GuildVoiceStates]
});


class AudioPlayer {
	constructor () {
		this.connections = [];
		this.nextSongTimeout = null;
		this.player = createAudioPlayer();
		this.resource = null;
	};

	connect (channel) {
		const connection = joinVoiceChannel({
			adapterCreator: channel.guild.voiceAdapterCreator,
			channelId: channel.id,
			guildId: channel.guildId
		});

		connection.subscribe(this.player);
		this.connections.push(connection);
	};

	disconnect (channelId) {
		this.connections.find((connection) => connection.joinConfig.channelId == channelId).destroy();
	};

	play (song={},random=false) {
		if (this.nextSongTimeout) {
			clearTimeout(this.nextSongTimeout);
		}

		client.user.setActivity();

		get(`https://assets.wixonic.fr/songs/${song.url}.mp3`,(res) => {
			const stream = createWriteStream("./current.mp3");
			res.pipe(stream);

			res.on("end",async () => {
				this.player.play(createAudioResource(createReadStream("./current.mp3")));
				
				this.nextSongTimeout = setTimeout(() => {
					if (random) {
						this.random();
					} else {
						client.user.setActivity();
					}
				},song.duration);

				client.user.setActivity({
					name: `${song.name}, by ${song.artist}`,
					type: ActivityType.Listening
				});
			});
		});
	};

	random () {
		this.play(this.list[Math.floor(Math.random() * this.list.length)],true);
	};

	get list () {
		return JSON.parse(readFileSync("songs.json",{
			encoding: "utf-8"
		}));
	};
};

const AP = new AudioPlayer();

client.on(Events.InteractionCreate,(interaction) => {
	interaction.channel.isVoiceBased
	if (interaction.isCommand()) {
		switch (interaction.commandName) {
			case "radio":
				switch (interaction.options.getSubcommand()) {
					case "connect":
						if (interaction.options.getChannel("channel",true).isVoiceBased()) {
							if (AP.connections.length == 0) {
								AP.random();
							}

							AP.connect(interaction.options.getChannel("channel",true));

							interaction.reply({
								content: `Radio connected to <#${interaction.options.getChannel("channel",true).id}>`,
								ephemeral: true
							});
						} else {
							interaction.reply({
								content: `Unable to connect to <#${interaction.options.getChannel("channel",true).id}>`,
								ephemeral: true
							});
						}
						break;
					
					case "disconnect":
						if (interaction.options.getChannel("channel",true).isVoiceBased()) {
							AP.disconnect(interaction.options.getChannel("channel",true));

							interaction.reply({
								content: `Radio disconnected from <#${interaction.options.getChannel("channel",true).id}>`,
								ephemeral: true
							});
						} else {
							interaction.reply({
								content: `Unable to disconnect from <#${interaction.options.getChannel("channel",true).id}>`,
								ephemeral: true
							});
						}
						break;
				};
				break;
		}
	}
});

client.on(Events.ClientReady,async () => {
	client.user.setStatus(PresenceUpdateStatus.Online);

	client.application.commands.set([
		{
			description: "Play radio on a channel",
			name: "radio",
			options: [{
				description: "Connect to channel",
				name: "connect",
				options: [{
					description: "The voice channel to play radio",
					name: "channel",
					required: true,
					type: ApplicationCommandOptionType.Channel
				}],
				type: ApplicationCommandOptionType.Subcommand
			},{
				description: "Disconnect from channel",
				name: "disconnect",
				options: [{
					description: "The voice channel that was selected to play radio",
					name: "channel",
					required: true,
					type: ApplicationCommandOptionType.Channel
				}],
				type: ApplicationCommandOptionType.Subcommand
			}],
			type: ApplicationCommandType.ChatInput
		}
	]);

	console.info("Logged as " + client.user.tag);
});

client.login(token);


process.on("uncaughtException",(e) => {
	client.destroy();
	throw e;
});