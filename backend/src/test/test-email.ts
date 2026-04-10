import { EmailService } from '../services/EmailService';

async function main() {
  console.log('Initiating test email to kunalsrivastava0405@gmail.com...');
  try {
    await EmailService.sendDecisionEmail('kunalsrivastava0405@gmail.com', 'ACCEPTED', 'Kunal');
    console.log('Test email script executed successfully!');
  } catch (error) {
    console.error('Test email script encountered an error:', error);
  }
}

main();
