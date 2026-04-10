"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const logger_1 = require("../config/logger");
class EmailService {
    static transporter = null;
    static async getTransporter() {
        if (this.transporter)
            return this.transporter;
        // Use Ethereal mock email for development
        try {
            const testAccount = await nodemailer_1.default.createTestAccount();
            this.transporter = nodemailer_1.default.createTransport({
                host: "smtp.ethereal.email",
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            });
            return this.transporter;
        }
        catch (err) {
            logger_1.logger.error('Failed to create mock email account', err);
            throw err;
        }
    }
    static async sendDecisionEmail(to, status, name) {
        const transporter = await this.getTransporter();
        let subject = '';
        let htmlContent = '';
        if (status === 'ACCEPTED') {
            subject = 'Congratulations: You have been selected for the next round';
            htmlContent = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #0d9488;">Congratulations, ${name}</h2>
          <p>We are pleased to inform you that you have been selected to move forward in the interview process for the AI Tutor role.</p>
          <p>Your performance in the virtual screening was impressive. Our team will contact you shortly with details regarding the next steps.</p>
          <br />
          <p>Best regards,</p>
          <p><strong>The Alpha AI Recruitment Team</strong></p>
        </div>
      `;
        }
        else {
            subject = 'Update on your AI Tutor Application';
            htmlContent = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Dear ${name},</h2>
          <p>Thank you for taking the time to complete the virtual screening interview.</p>
          <p>We have reviewed your application and evaluation carefully. Unfortunately, we will not be moving forward with your candidacy at this time.</p>
          <p>We appreciate your interest in joining our team and wish you the best in your future endeavors.</p>
          <br />
          <p>Best regards,</p>
          <p><strong>The Alpha AI Recruitment Team</strong></p>
        </div>
      `;
        }
        try {
            const info = await transporter.sendMail({
                from: '"Alpha AI Careers" <careers@alpha-ai.test>',
                to,
                subject,
                html: htmlContent,
            });
            logger_1.logger.info(`Decision email sent to ${to}. Status: ${status}`);
            logger_1.logger.info(`Preview Mock Email URL: ${nodemailer_1.default.getTestMessageUrl(info)}`);
        }
        catch (err) {
            logger_1.logger.error(`Failed to send email to ${to}:`, err);
        }
    }
}
exports.EmailService = EmailService;
