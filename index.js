import fetch from 'node-fetch';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import dotenv from 'dotenv';
import express from 'express'; // Import express for web server
import { printWatermark } from './src/watermark.js'; // Import the watermark function
import { createUrlEmbed } from './src/embedMessage.js'; // Import the embed creation function
import pingCommand from './src/pingCommand.js'; // Import the ping command

dotenv.config();

// Example usage of the printWatermark function
printWatermark(process.env.API_TOKEN);

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
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
    // Set the bot's status
    client.user.setPresence({
        status: 'online', // Can be 'online', 'idle', 'dnd' (Do Not Disturb), or 'invisible'
        activities: [{ name: 'Monitoring URLs', type: 'WATCHING' }]
    });
});

// Function to mask the API token
function maskToken(token) {
    if (!token) return 'No token provided';
    const firstPart = token.substring(0, 2);
    const lastPart = token.substring(token.length - 2);
    return `${firstPart}*****${lastPart}`;
}

client.on('messageCreate', async (message) => {
    // Check if the message is not sent by a bot
    if (message.author.bot) return;

    if (message.content.startsWith(PREFIX)) {
        const args = message.content.slice(PREFIX.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        if (command === 'ping') {
            await pingCommand(message);
        }
    }

    // Check if the message is in the specific channel and is not sent by a bot
    if (message.channel.id === SHORTEN_CHANNEL_ID) {
        const urlRegex = /(https?:\/\/[^\s]+)/g; // Regex to find URLs in the message
        const urls = message.content.match(urlRegex);

        if (urls) {
            for (const url of urls) {
                try {
                    // Shorten the URL with VN Shortener
                    const apiUrl = `https://vnshortener.com/api?api=${process.env.API_TOKEN}&url=${encodeURIComponent(url)}&format=text`;
                    const response = await fetch(apiUrl);
                    if (!response.ok) throw new Error(`API request failed with status ${response.status}`);

                    const responseText = await response.text();
                    const shortUrl = responseText.trim();
                    if (!shortUrl.startsWith('http')) {
                        throw new Error('Shortened URL is invalid or not received correctly.');
                    }

                    // Extract domain from the original URL
                    const urlObj = new URL(url);
                    const domain = urlObj.hostname;

                    // Create and send an embed message with the original long URL, shortened URL, and the source
                    const embed = createUrlEmbed(url, shortUrl, domain);
                    await message.reply({ embeds: [embed] });

                } catch (error) {
                    console.error('Error:', error);
                }
            }
        }
    }
});

client.login(BOT_TOKEN);
