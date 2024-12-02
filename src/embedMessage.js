import { EmbedBuilder } from 'discord.js';

export function createUrlEmbed(originalUrl, shortUrl) {
    // Extract domain from the original URL
    const urlObj = new URL(originalUrl);
    const domain = urlObj.hostname;

    // Create and return the embed message
    return new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('URL Shortened')
        .setDescription('Here are the details:')
        .addFields(
            { name: 'Original URL', value: originalUrl, inline: false },
            { name: 'Shortened URL', value: shortUrl, inline: false },
            { name: 'Source', value: `From: ${domain}`, inline: false }
        )
        .setTimestamp();
}
