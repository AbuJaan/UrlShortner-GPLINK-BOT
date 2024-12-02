import fetch from 'node-fetch';
import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import express from 'express'; // Import express for web server
import { printWatermark } from './src/watermark.js'; // Import the watermark function
import { createUrlEmbed } from './src/embedMessage.js'; // Import the embed creation function
import pingCommand from './src/pingCommand.js'; // Import the ping command

dotenv.config();

printWatermark(process.env.API_TOKEN);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const SHORTEN_CHANNEL_ID = process.env.SHORTEN_CHANNEL_ID; // Channel ID where the bot listens for messages to shorten
const PREFIX = 'u!'; // Prefix for commands
const BOT_TOKEN = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 3000; // Port for the web server

const app = express();
app.get('/', (req, res) => res.send('Bot is running'));

// Start the web server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

client.once('ready', () => {
    console.log('Bot is online');
    client.user.setPresence({
        status: 'online',
        activities: [{ name: 'Monitoring URLs', type: 'WATCHING' }],
    });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith(PREFIX)) {
        const args = message.content.slice(PREFIX.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        if (command === 'ping') {
            await pingCommand(message);
        }
    }

    if (message.channel.id === SHORTEN_CHANNEL_ID) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = message.content.match(urlRegex);

        if (urls) {
            for (const url of urls) {
                try {
                    // Try to shorten with a unique alias
                    const uniqueAlias = `alias_${Date.now()}`;
                    const apiUrl = `https://api.gplinks.com/api?api=${process.env.API_TOKEN}&url=${encodeURIComponent(url)}&alias=${uniqueAlias}`;
                    const response = await fetch(apiUrl);
                    const responseData = await response.json();

                    if (responseData.status === 'error' && responseData.message.includes('Alias already exists')) {
                        // Retry without an alias
                        const fallbackUrl = `https://api.gplinks.com/api?api=${process.env.API_TOKEN}&url=${encodeURIComponent(url)}`;
                        const fallbackResponse = await fetch(fallbackUrl);
                        const fallbackData = await fallbackResponse.json();

                        if (fallbackData.status === 'error') throw new Error(fallbackData.message);

                        const shortUrl = fallbackData.shortenedUrl;
                        const urlObj = new URL(url);
                        const domain = urlObj.hostname;

                        const embed = createUrlEmbed(url, shortUrl, domain);
                        await message.reply({ embeds: [embed] });
                    } else if (responseData.status === 'error') {
                        throw new Error(responseData.message);
                    } else {
                        const shortUrl = responseData.shortenedUrl;
                        const urlObj = new URL(url);
                        const domain = urlObj.hostname;

                        const embed = createUrlEmbed(url, shortUrl, domain);
                        await message.reply({ embeds: [embed] });
                    }
                } catch (error) {
                    console.error('Error:', error.message);
                }
            }
        }
    }
});

client.login(BOT_TOKEN);
