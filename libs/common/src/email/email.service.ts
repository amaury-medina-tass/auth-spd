
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
    private transporter: nodemailer.Transporter;
    private readonly logger = new Logger(EmailService.name);

    constructor(private configService: ConfigService) {
        this.createTransporter();
    }

    private createTransporter() {
        const host = this.configService.get<string>('SMTP_HOST');
        const port = this.configService.get<number>('SMTP_PORT');
        const user = this.configService.get<string>('SMTP_USER');
        const pass = this.configService.get<string>('SMTP_PASS');
        const secure = this.configService.get<string>('SMTP_SECURE') === 'true';

        this.transporter = nodemailer.createTransport({
            host,
            port,
            secure, // true for 465, false for other ports
            auth: {
                user,
                pass,
            },
            tls: {
                rejectUnauthorized: false
            }
        });
    }

    async sendMail(to: string, subject: string, text: string, html?: string) {
        const from = this.configService.get<string>('SMTP_FROM', '"No Reply" <noreply@example.com>'); // Default from

        try {
            const info = await this.transporter.sendMail({
                from,
                to,
                subject,
                text,
                html,
            });
            this.logger.log(`Email sent: ${info.messageId}`);
            return info;
        } catch (error) {
            this.logger.error('Error sending email', error);
            throw error;
        }
    }

    async sendTemplateEmail(to: string, subject: string, template: string, context: Record<string, string>) {
        const templatePath = path.join(process.cwd(), 'libs', 'common', 'src', 'email', 'templates', template);
        try {
            let html = fs.readFileSync(templatePath, 'utf8');

            // Simple mustache-like replacement
            Object.keys(context).forEach(key => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                html = html.replace(regex, context[key]);
            });

            return this.sendMail(to, subject, 'Please view this email in an HTML compatible viewer', html);
        } catch (error) {
            this.logger.error(`Error loading template ${template}: ${error.message}`);
            throw error;
        }
    }
}
