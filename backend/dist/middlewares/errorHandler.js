"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const logger_1 = require("../config/logger");
const AppError_1 = require("../utils/AppError");
const env_1 = require("../config/env");
const errorHandler = (err, req, res, next) => {
    let statusCode = 500;
    let message = 'Internal Server Error';
    if (err instanceof AppError_1.AppError) {
        statusCode = err.statusCode;
        message = err.message;
    }
    logger_1.logger.error(`[${req.method}] ${req.path} >> StatusCode:: ${statusCode}, Message:: ${err.message}`);
    if (env_1.env.NODE_ENV === 'development' && !(err instanceof AppError_1.AppError)) {
        logger_1.logger.error(err.stack);
    }
    res.status(statusCode).json({
        success: false,
        message,
        ...(env_1.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
exports.errorHandler = errorHandler;
