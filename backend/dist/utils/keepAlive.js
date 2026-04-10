"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startKeepAlive = void 0;
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const logger_1 = require("../config/logger");
const startKeepAlive = () => {
    const url = process.env.RENDER_EXTERNAL_URL;
    if (url) {
        logger_1.logger.info(`Starting keep-alive for ${url} to prevent Render free-tier sleep`);
        // Ping every 14 minutes (14 * 60 * 1000 ms) because Render sleeps after 15 mins of inactivity
        setInterval(() => {
            const getReq = url.startsWith('https') ? https_1.default.get : http_1.default.get;
            getReq(`${url}/health`, (res) => {
                if (res.statusCode === 200) {
                    logger_1.logger.info('Keep-alive ping successful');
                }
                else {
                    logger_1.logger.warn(`Keep-alive ping failed with status code: ${res.statusCode}`);
                }
            }).on('error', (err) => {
                logger_1.logger.error(`Keep-alive ping error: ${err.message}`);
            });
        }, 14 * 60 * 1000);
    }
    else {
        logger_1.logger.info('RENDER_EXTERNAL_URL not set, skipping keep-alive loop.');
    }
};
exports.startKeepAlive = startKeepAlive;
