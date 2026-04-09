"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
require("express-async-errors"); // catches async errors for global handler
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const v1_1 = __importDefault(require("./routes/v1"));
const errorHandler_1 = require("./middlewares/errorHandler");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: env_1.env.CORS_ORIGIN }));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP'
});
app.use('/api', limiter);
const morganFormat = env_1.env.NODE_ENV === 'development' ? 'dev' : 'combined';
app.use((0, morgan_1.default)(morganFormat, {
    stream: {
        write: (message) => logger_1.logger.http(message.trim()),
    },
}));
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'Backend is healthy' });
});
app.use('/api/v1', v1_1.default);
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route Not Found' });
});
app.use(errorHandler_1.errorHandler);
exports.default = app;
