import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
})

interface SendEmailOptions {
    to: string | string[]
    subject: string
    html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
    const from = process.env.SMTP_USER || 'noreply@example.com'

    await transporter.sendMail({
        from: `Arinox Quote Generator <${from}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html,
    })
}
