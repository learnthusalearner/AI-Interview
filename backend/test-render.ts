import axios from 'axios';
import { prisma } from './src/config/prisma';

(async () => {
    try {
        console.log("Fetching latest session from DB...");
        const session = await prisma.interviewSession.findFirst({
            where: { candidateEmail: { not: null } },
            orderBy: { createdAt: 'desc' }
        });
        
        if (!session) {
            console.log("No session found. Cannot test.");
            return;
        }

        console.log(`Pinging Render backend for Session ${session.id}...`);
        
        const response = await axios.post('https://ai-interview-1-lick.onrender.com/api/v1/admin/status', {
            sessionId: session.id,
            status: 'ACCEPTED',
            feedbackReason: 'Testing from node'
        });
        
        console.log("Render API Response:");
        console.log(response.status);
        console.log(response.data);
    } catch (e: any) {
        console.error("Render API Error:");
        if (e.response) {
            console.error("Status:", e.response.status);
            console.error("Data:", e.response.data);
        } else {
            console.error(e.message);
        }
    }
})();
