import fetch from "node-fetch";
import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import express from "express"; // Import express for web server
import { createUrlEmbed } from "./src/embedMessage.js"; // Import the embed creation function
import pingCommand from "./src/pingCommand.js"; // Import the ping command

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});
const SHORTEN_CHANNEL_ID = process.env.SHORTEN_CHANNEL_ID; // Channel ID where the bot listens for messages to shorten
const PREFIX = "u!"; // Prefix for commands
const BOT_TOKEN = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 3000; // Port for the web server

const app = express();
app.get("/", (req, res) => res.send("Bot is running"));

// Start the web server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Function to extract file name dynamically
async function getFileNameFromUrl(url) {
  try {
    // Send a HEAD request to the URL to retrieve the headers
    const response = await fetch(url, { method: "HEAD" });
    if (!response.ok)
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);

    // Check Content-Disposition header for the filename
    const contentDisposition = response.headers.get("content-disposition");
    if (contentDisposition && contentDisposition.includes("filename=")) {
      const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
      if (fileNameMatch) return fileNameMatch[1];
    }

    // Fallback: Try to extract the filename from the URL path
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    return pathParts[pathParts.length - 1]; // Last part of the path
  } catch (error) {
    console.error("Error extracting filename:", error);
    return null;
  }
}

// Shorten URL with GPlinks and set alias
async function shortenWithGPlinks(url, apiToken) {
  const fileName = await getFileNameFromUrl(url);
  if (!fileName) {
    console.error("Filename could not be extracted.");
    return;
  }

  // Create a URL-friendly alias from the filename
  const alias = encodeURIComponent(
    fileName.replace(/\s+/g, "_").replace(/\.[^/.]+$/, "")
  ); // Removing file extension

  const apiUrl = `https://api.gplinks.com/api?api=${apiToken}&url=${encodeURIComponent(
    url
  )}&alias=${alias}`;
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    if (data.status === "error") {
      console.error("Error shortening URL:", data.message);
    } else {
      console.log("Shortened URL:", data.shortenedUrl);
    }
  } catch (error) {
    console.error("Error calling GPlinks API:", error);
  }
}

client.once("ready", () => {
  console.log("Bot is online");
  // Set the bot's status
  client.user.setPresence({
    status: "online", // Can be 'online', 'idle', 'dnd' (Do Not Disturb), or 'invisible'
    activities: [{ name: "Monitoring URLs", type: "WATCHING" }],
  });
});

// Function to mask the API token
function maskToken(token) {
  if (!token) return "No token provided";
  const firstPart = token.substring(0, 2);
  const lastPart = token.substring(token.length - 2);
  return `${firstPart}*****${lastPart}`;
}

client.on("messageCreate", async (message) => {
  // Check if the message is not sent by a bot
  if (message.author.bot) return;

  if (message.content.startsWith(PREFIX)) {
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === "ping") {
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
          // Shorten the URL with GPlinks
          const apiToken = process.env.API_TOKEN; // Your GPlinks API token
          await shortenWithGPlinks(url, apiToken);

          // Extract domain from the original URL
          const urlObj = new URL(url);
          const domain = urlObj.hostname;

          // Create and send an embed message with the original long URL, shortened URL, and the source
          const embed = createUrlEmbed(
            url,
            `https://gplinks.com/shortened-url-here`,
            domain
          ); // Update with actual shortened URL
          await message.reply({ embeds: [embed] });
        } catch (error) {
          console.error("Error:", error);
        }
      }
    }
  }
});

client.login(BOT_TOKEN);
