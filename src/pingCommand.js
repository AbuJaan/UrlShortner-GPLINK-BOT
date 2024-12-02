import { EmbedBuilder } from 'discord.js';

export default async function pingCommand(message) {
  try {
    let days = Math.floor(message.client.uptime / 86400000);
    let hours = Math.floor(message.client.uptime / 3600000) % 24;
    let minutes = Math.floor(message.client.uptime / 60000) % 60;
    let seconds = Math.floor(message.client.uptime / 1000) % 60;
    let webLatency = new Date() - message.createdAt;
    let apiLatency = message.client.ws.ping;
    let totalLatency = webLatency + apiLatency;
    let emLatency = {
      Green: '🟢',
      Yellow: '🟡',
      Red: '🔴',
    };

    const embed = new EmbedBuilder()
      .setColor(
        totalLatency < 200
          ? '#008000' // Green
          : totalLatency < 500
          ? '#FFFF00' // Yellow
          : '#FF0000' // Red
      )
      .setTitle('Latency And API Ping')
      .addFields(
        {
          name: '<:server:1255851928286531585> Websocket Latency',
          value: `\`\`\`yml\n${
            webLatency <= 200
              ? emLatency.Green
              : webLatency <= 400
              ? emLatency.Yellow
              : emLatency.Red
          } ${webLatency}ms\`\`\``,
          inline: true,
        },
        {
          name: '🛰 API Latency',
          value: `\`\`\`yml\n${
            apiLatency <= 200
              ? emLatency.Green
              : apiLatency <= 400
              ? emLatency.Yellow
              : emLatency.Red
          } ${apiLatency}ms\`\`\``,
          inline: true,
        },
        {
          name: '<a:Ping:1230899360976470160> Uptime',
          value: `\`\`\`m\n${days} Days : ${hours} Hrs : ${minutes} Mins : ${seconds} Secs\`\`\``,
          inline: false,
        }
    
      );

    await message.reply({ embeds: [embed] });
  } catch (error) {
    console.error(error); // Log the error to the console
    await message.reply('An error occurred while processing the command.'); // Send a generic error message to the user
  }
}
