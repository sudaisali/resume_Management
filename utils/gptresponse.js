const axios = require('axios')

const apiKey = process.env.GPT_API_KEY;
const apiUrl = process.env.GPT_API_URL;

async function gptResponse(userInput) {
    try {
      const response = await axios.post(
        apiUrl,
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: userInput,
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
        }
      );
      const assistantResponse = response.data.choices[0].message.content.replace(userInput, '').trim();
      return assistantResponse
    } catch (error) {
      console.error('Error:', error.response ? error.response.data : error.message);
    }
  }



  module.exports = {gptResponse}