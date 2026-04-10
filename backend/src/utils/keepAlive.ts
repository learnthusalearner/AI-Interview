import https from 'https';
import http from 'http';
import { logger } from '../config/logger';

export const startKeepAlive = () => {
  const url = process.env.RENDER_EXTERNAL_URL;

  if (url) {
    logger.info(`Starting keep-alive for ${url} to prevent Render free-tier sleep`);
    
    // Ping every 14 minutes (14 * 60 * 1000 ms) because Render sleeps after 15 mins of inactivity
    setInterval(() => {
      const getReq = url.startsWith('https') ? https.get : http.get;
      
      getReq(`${url}/health`, (res) => {
        if (res.statusCode === 200) {
          logger.info('Keep-alive ping successful');
        } else {
          logger.warn(`Keep-alive ping failed with status code: ${res.statusCode}`);
        }
      }).on('error', (err) => {
        logger.error(`Keep-alive ping error: ${err.message}`);
      });
    }, 14 * 60 * 1000);
  } else {
    logger.info('RENDER_EXTERNAL_URL not set, skipping keep-alive loop.');
  }
};
