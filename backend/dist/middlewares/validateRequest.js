"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
const logger_1 = require("../config/logger");
const validate = (schema) => (req, res, next) => {
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            logger_1.logger.warn(`Validation Error: ${error.message}`);
            res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: error.issues,
            });
            return;
        }
        next(error);
    }
};
exports.validate = validate;
