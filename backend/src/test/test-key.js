const API_KEY = process.env.OPENAI_API_KEY;

async function testKey() {
  console.log("Testing OpenAI API Key via fetch...");
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 10
    })
  });

  const data = await response.json();
  console.log("\n--- RESPONSE FROM OPENAI ---");
  console.log(JSON.stringify(data, null, 2));
}

testKey();
