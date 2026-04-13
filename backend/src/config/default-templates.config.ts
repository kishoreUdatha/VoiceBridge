/**
 * Default Message Templates
 * Professional templates for SMS, Email, and WhatsApp
 */

export interface DefaultTemplate {
  name: string;
  type: 'SMS' | 'EMAIL' | 'WHATSAPP';
  category: string;
  subject?: string;
  content: string;
  sampleValues: Record<string, string>;
  isDefault?: boolean;
}

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  // ==================== SMS TEMPLATES ====================
  {
    name: 'Welcome SMS',
    type: 'SMS',
    category: 'welcome',
    content: `Hi {{firstName}}! Welcome to {{orgName}}. We're excited to have you with us. Reply HELP for assistance or visit {{orgWebsite}} to learn more.`,
    sampleValues: { firstName: 'John', orgName: 'VoiceBridge', orgWebsite: 'voicebridge.io' },
    isDefault: true,
  },
  {
    name: 'Appointment Reminder',
    type: 'SMS',
    category: 'reminder',
    content: `Hi {{firstName}}, this is a reminder about your appointment on {{appointmentDate}} at {{appointmentTime}}. Reply YES to confirm or call us at {{orgPhone}} to reschedule.`,
    sampleValues: { firstName: 'John', appointmentDate: 'March 15', appointmentTime: '2:00 PM', orgPhone: '+1234567890' },
  },
  {
    name: 'Payment Reminder',
    type: 'SMS',
    category: 'reminder',
    content: `Hi {{firstName}}, your payment of {{amount}} is due. Please complete your payment to avoid service interruption. Questions? Call {{orgPhone}}.`,
    sampleValues: { firstName: 'John', amount: '$99', orgPhone: '+1234567890' },
  },
  {
    name: 'Order Confirmation',
    type: 'SMS',
    category: 'transactional',
    content: `Thank you {{firstName}}! Your order #{{custom1}} has been confirmed. Track your order: {{link}}. Questions? Reply to this message.`,
    sampleValues: { firstName: 'John', custom1: 'ORD-12345', link: 'track.example.com/12345' },
  },
  {
    name: 'Delivery Update',
    type: 'SMS',
    category: 'transactional',
    content: `Hi {{firstName}}, your order is out for delivery! Expected arrival: {{custom1}}. Track live: {{link}}`,
    sampleValues: { firstName: 'John', custom1: 'Today by 5 PM', link: 'track.example.com' },
  },
  {
    name: 'Follow-up SMS',
    type: 'SMS',
    category: 'follow-up',
    content: `Hi {{firstName}}, just following up on our conversation. Do you have any questions about {{custom1}}? Reply or call {{orgPhone}}. - {{orgName}}`,
    sampleValues: { firstName: 'John', custom1: 'our services', orgPhone: '+1234567890', orgName: 'VoiceBridge' },
  },
  {
    name: 'Promotional Offer',
    type: 'SMS',
    category: 'marketing',
    content: `{{firstName}}, exclusive offer just for you! Get {{custom1}} off your next purchase. Use code: {{custom2}}. Valid till {{custom3}}. Shop now: {{link}}`,
    sampleValues: { firstName: 'John', custom1: '20%', custom2: 'SAVE20', custom3: 'March 31', link: 'shop.example.com' },
  },
  {
    name: 'Feedback Request',
    type: 'SMS',
    category: 'follow-up',
    content: `Hi {{firstName}}, thank you for choosing {{orgName}}! We'd love your feedback. Rate us: {{link}} (takes 30 seconds)`,
    sampleValues: { firstName: 'John', orgName: 'VoiceBridge', link: 'feedback.example.com' },
  },
  {
    name: 'Event Reminder',
    type: 'SMS',
    category: 'reminder',
    content: `Hi {{firstName}}! Reminder: {{custom1}} is tomorrow at {{appointmentTime}}. Location: {{custom2}}. See you there! - {{orgName}}`,
    sampleValues: { firstName: 'John', custom1: 'Annual Conference', appointmentTime: '10:00 AM', custom2: 'Grand Hall', orgName: 'VoiceBridge' },
  },
  {
    name: 'OTP Verification',
    type: 'SMS',
    category: 'transactional',
    content: `Your {{orgName}} verification code is: {{custom1}}. Valid for 10 minutes. Do not share this code with anyone.`,
    sampleValues: { orgName: 'VoiceBridge', custom1: '123456' },
  },

  // ==================== EMAIL TEMPLATES ====================
  {
    name: 'Welcome Email',
    type: 'EMAIL',
    category: 'welcome',
    subject: 'Welcome to {{orgName}}! Let\'s Get Started',
    content: `Hi {{firstName}},

Welcome to {{orgName}}! We're thrilled to have you on board.

Here's what you can do next:
• Complete your profile setup
• Explore our features
• Connect with our support team if you need help

If you have any questions, feel free to reach out to us at {{orgEmail}} or call {{orgPhone}}.

We're here to help you succeed!

Best regards,
The {{orgName}} Team
{{orgWebsite}}`,
    sampleValues: { firstName: 'John', orgName: 'VoiceBridge', orgEmail: 'support@voicebridge.io', orgPhone: '+1234567890', orgWebsite: 'voicebridge.io' },
    isDefault: true,
  },
  {
    name: 'Meeting Invitation',
    type: 'EMAIL',
    category: 'notification',
    subject: 'Meeting Invitation: {{custom1}}',
    content: `Hi {{firstName}},

You're invited to a meeting!

Meeting Details:
• Topic: {{custom1}}
• Date: {{appointmentDate}}
• Time: {{appointmentTime}}
• Duration: {{custom2}}

Join Link: {{link}}

Please confirm your attendance by replying to this email.

Looking forward to seeing you there!

Best regards,
{{orgName}}`,
    sampleValues: { firstName: 'John', custom1: 'Product Demo', appointmentDate: 'March 15, 2024', appointmentTime: '2:00 PM IST', custom2: '30 minutes', link: 'meet.example.com/abc123', orgName: 'VoiceBridge' },
  },
  {
    name: 'Invoice Email',
    type: 'EMAIL',
    category: 'transactional',
    subject: 'Invoice #{{custom1}} from {{orgName}}',
    content: `Hi {{firstName}},

Please find your invoice details below:

Invoice Number: {{custom1}}
Amount Due: {{amount}}
Due Date: {{custom2}}

Payment Methods:
• Bank Transfer
• Credit/Debit Card
• UPI

Pay Now: {{link}}

If you have any questions about this invoice, please contact us at {{orgEmail}}.

Thank you for your business!

Best regards,
{{orgName}} Billing Team`,
    sampleValues: { firstName: 'John', custom1: 'INV-2024-001', amount: '₹9,999', custom2: 'March 20, 2024', link: 'pay.example.com', orgEmail: 'billing@voicebridge.io', orgName: 'VoiceBridge' },
  },
  {
    name: 'Course Enrollment Confirmation',
    type: 'EMAIL',
    category: 'transactional',
    subject: 'Enrollment Confirmed: {{course}}',
    content: `Hi {{firstName}},

Congratulations! Your enrollment in {{course}} has been confirmed.

Course Details:
• Course: {{course}}
• Start Date: {{appointmentDate}}
• Duration: {{custom1}}
• Access: Lifetime

What's Next:
1. Access your course: {{link}}
2. Join our community forum
3. Download the course materials

Need help? Contact us at {{orgEmail}}.

Happy Learning!

Best regards,
{{orgName}} Team`,
    sampleValues: { firstName: 'John', course: 'Advanced Sales Mastery', appointmentDate: 'March 1, 2024', custom1: '8 weeks', link: 'learn.example.com', orgEmail: 'support@voicebridge.io', orgName: 'VoiceBridge' },
  },
  {
    name: 'Newsletter',
    type: 'EMAIL',
    category: 'marketing',
    subject: '{{custom1}} - {{orgName}} Newsletter',
    content: `Hi {{firstName}},

Here's what's new this month at {{orgName}}:

📢 LATEST UPDATES
{{custom2}}

🎁 SPECIAL OFFER
{{custom3}}

📅 UPCOMING EVENTS
Check out our events calendar: {{link}}

Stay connected with us on social media for daily tips and updates!

Best regards,
The {{orgName}} Team

---
Unsubscribe | Update Preferences`,
    sampleValues: { firstName: 'John', custom1: 'March Edition', custom2: 'We launched exciting new features!', custom3: 'Get 25% off on annual plans', link: 'events.example.com', orgName: 'VoiceBridge' },
  },
  {
    name: 'Password Reset',
    type: 'EMAIL',
    category: 'transactional',
    subject: 'Reset Your {{orgName}} Password',
    content: `Hi {{firstName}},

We received a request to reset your password. Click the link below to create a new password:

{{link}}

This link will expire in 24 hours.

If you didn't request this password reset, please ignore this email or contact support at {{orgEmail}}.

Best regards,
{{orgName}} Security Team`,
    sampleValues: { firstName: 'John', link: 'reset.example.com/token123', orgEmail: 'security@voicebridge.io', orgName: 'VoiceBridge' },
  },
  {
    name: 'Follow-up After Demo',
    type: 'EMAIL',
    category: 'follow-up',
    subject: 'Great Connecting with You, {{firstName}}!',
    content: `Hi {{firstName}},

Thank you for taking the time to see our demo today! It was great connecting with you.

As discussed, here are the next steps:
• {{custom1}}
• {{custom2}}
• {{custom3}}

I've attached the presentation and pricing details for your reference.

Do you have any questions? Feel free to reply to this email or schedule a follow-up call: {{link}}

Looking forward to hearing from you!

Best regards,
{{orgName}}
{{orgPhone}}`,
    sampleValues: { firstName: 'John', custom1: 'Review the proposal', custom2: 'Discuss with your team', custom3: 'Schedule implementation call', link: 'calendly.com/demo', orgName: 'VoiceBridge', orgPhone: '+1234567890' },
  },
  {
    name: 'Subscription Renewal Reminder',
    type: 'EMAIL',
    category: 'reminder',
    subject: 'Your {{orgName}} Subscription is Expiring Soon',
    content: `Hi {{firstName}},

Your {{orgName}} subscription is set to expire on {{custom1}}.

Current Plan: {{custom2}}
Renewal Amount: {{amount}}

Renew now to continue enjoying:
✓ All premium features
✓ Priority support
✓ Unlimited access

Renew Now: {{link}}

Questions? Contact us at {{orgEmail}}.

Thank you for being a valued customer!

Best regards,
{{orgName}} Team`,
    sampleValues: { firstName: 'John', custom1: 'March 31, 2024', custom2: 'Professional Plan', amount: '₹4,999/month', link: 'renew.example.com', orgEmail: 'billing@voicebridge.io', orgName: 'VoiceBridge' },
  },
  {
    name: 'Referral Request',
    type: 'EMAIL',
    category: 'marketing',
    subject: 'Share {{orgName}} & Earn Rewards!',
    content: `Hi {{firstName}},

Loving {{orgName}}? Spread the word and earn rewards!

🎁 YOUR REFERRAL BENEFITS:
• Give: {{custom1}} off for your friends
• Get: {{custom2}} credit for each referral

Your unique referral link: {{link}}

It's simple:
1. Share your link
2. Friend signs up
3. You both win!

Start referring today!

Best regards,
{{orgName}} Team`,
    sampleValues: { firstName: 'John', custom1: '20%', custom2: '₹500', link: 'refer.example.com/john123', orgName: 'VoiceBridge' },
  },
  {
    name: 'Support Ticket Confirmation',
    type: 'EMAIL',
    category: 'transactional',
    subject: 'Support Ticket #{{custom1}} - We\'re On It!',
    content: `Hi {{firstName}},

We've received your support request and a ticket has been created.

Ticket Details:
• Ticket ID: #{{custom1}}
• Subject: {{custom2}}
• Priority: {{custom3}}
• Expected Response: Within 24 hours

Track your ticket: {{link}}

Our support team will get back to you shortly. In the meantime, check our Help Center for quick answers.

Thank you for your patience!

Best regards,
{{orgName}} Support Team
{{orgEmail}}`,
    sampleValues: { firstName: 'John', custom1: 'TKT-2024-001', custom2: 'Account Access Issue', custom3: 'High', link: 'support.example.com/tickets', orgEmail: 'support@voicebridge.io', orgName: 'VoiceBridge' },
  },

  // ==================== WHATSAPP TEMPLATES ====================
  {
    name: 'WhatsApp Welcome',
    type: 'WHATSAPP',
    category: 'welcome',
    content: `Hello {{firstName}}! 👋

Welcome to {{orgName}}!

We're excited to connect with you. Here's how we can help:

📞 Support: {{orgPhone}}
📧 Email: {{orgEmail}}
🌐 Website: {{orgWebsite}}

Reply with:
1️⃣ - Learn more about our services
2️⃣ - Speak to an agent
3️⃣ - Get pricing info`,
    sampleValues: { firstName: 'John', orgName: 'VoiceBridge', orgPhone: '+1234567890', orgEmail: 'hello@voicebridge.io', orgWebsite: 'voicebridge.io' },
    isDefault: true,
  },
  {
    name: 'WhatsApp Appointment Reminder',
    type: 'WHATSAPP',
    category: 'reminder',
    content: `Hi {{firstName}}! 📅

Reminder: You have an appointment scheduled.

📆 Date: {{appointmentDate}}
⏰ Time: {{appointmentTime}}
📍 Location: {{custom1}}

Reply:
✅ CONFIRM - to confirm
📅 RESCHEDULE - to change timing
❌ CANCEL - to cancel

See you soon!
{{orgName}}`,
    sampleValues: { firstName: 'John', appointmentDate: 'March 15, 2024', appointmentTime: '2:00 PM', custom1: 'Main Office', orgName: 'VoiceBridge' },
  },
  {
    name: 'WhatsApp Order Update',
    type: 'WHATSAPP',
    category: 'transactional',
    content: `Hi {{firstName}}! 📦

Your order update:

Order: #{{custom1}}
Status: {{custom2}}

{{custom3}}

Track your order: {{link}}

Need help? Just reply to this message!

Thank you for shopping with {{orgName}}! 🙏`,
    sampleValues: { firstName: 'John', custom1: 'ORD-12345', custom2: 'Out for Delivery', custom3: 'Expected delivery by 5 PM today', link: 'track.example.com', orgName: 'VoiceBridge' },
  },
  {
    name: 'WhatsApp Payment Confirmation',
    type: 'WHATSAPP',
    category: 'transactional',
    content: `Hi {{firstName}}! ✅

Payment Received Successfully!

💰 Amount: {{amount}}
📝 Transaction ID: {{custom1}}
📅 Date: {{date}}

Thank you for your payment!

For any queries, contact us at {{orgPhone}}.

Best regards,
{{orgName}}`,
    sampleValues: { firstName: 'John', amount: '₹4,999', custom1: 'TXN123456789', date: 'March 10, 2024', orgPhone: '+1234567890', orgName: 'VoiceBridge' },
  },
  {
    name: 'WhatsApp Follow-up',
    type: 'WHATSAPP',
    category: 'follow-up',
    content: `Hi {{firstName}}! 👋

Hope you're doing well!

I wanted to follow up on {{custom1}}.

Do you have any questions or need more information?

Reply:
📞 CALL - Get a callback
📋 INFO - More details
👍 INTERESTED - Move forward

Looking forward to hearing from you!

{{orgName}}`,
    sampleValues: { firstName: 'John', custom1: 'your interest in our Premium Plan', orgName: 'VoiceBridge' },
  },
  {
    name: 'WhatsApp Promotional',
    type: 'WHATSAPP',
    category: 'marketing',
    content: `Hi {{firstName}}! 🎉

SPECIAL OFFER just for you!

🏷️ {{custom1}}
💰 Save up to {{custom2}}
⏰ Valid till: {{custom3}}

Use code: {{custom2}}

Shop now: {{link}}

Don't miss out! Limited time offer.

{{orgName}}`,
    sampleValues: { firstName: 'John', custom1: 'Flat 30% OFF on all plans!', custom2: '₹3,000', custom3: 'March 31', link: 'offer.example.com', orgName: 'VoiceBridge' },
  },
  {
    name: 'WhatsApp Feedback Request',
    type: 'WHATSAPP',
    category: 'follow-up',
    content: `Hi {{firstName}}! 🌟

Thank you for choosing {{orgName}}!

We'd love to hear your feedback. How was your experience?

Rate us:
⭐ 1 - Poor
⭐⭐ 2 - Fair
⭐⭐⭐ 3 - Good
⭐⭐⭐⭐ 4 - Very Good
⭐⭐⭐⭐⭐ 5 - Excellent

Just reply with a number (1-5)

Your feedback helps us improve! 🙏`,
    sampleValues: { firstName: 'John', orgName: 'VoiceBridge' },
  },
  {
    name: 'WhatsApp Support',
    type: 'WHATSAPP',
    category: 'notification',
    content: `Hi {{firstName}}! 🛠️

Thanks for reaching out to {{orgName}} Support!

Your query has been registered.

Ticket ID: #{{custom1}}
Status: {{custom2}}

Our team will respond within {{custom3}}.

For urgent matters, call: {{orgPhone}}

We're here to help! 💪`,
    sampleValues: { firstName: 'John', custom1: 'TKT-001', custom2: 'In Progress', custom3: '2 hours', orgPhone: '+1234567890', orgName: 'VoiceBridge' },
  },
  {
    name: 'WhatsApp Event Invitation',
    type: 'WHATSAPP',
    category: 'notification',
    content: `Hi {{firstName}}! 🎪

You're invited!

📌 Event: {{custom1}}
📅 Date: {{appointmentDate}}
⏰ Time: {{appointmentTime}}
📍 Venue: {{custom2}}

Register now: {{link}}

Reply:
✅ YES - I'll attend
❌ NO - Can't make it
📅 REMIND - Send reminder

See you there! 🎉

{{orgName}}`,
    sampleValues: { firstName: 'John', custom1: 'Annual Customer Summit 2024', appointmentDate: 'April 15, 2024', appointmentTime: '10:00 AM', custom2: 'Grand Ballroom, Hotel Royal', link: 'register.example.com', orgName: 'VoiceBridge' },
  },
  {
    name: 'WhatsApp Course Reminder',
    type: 'WHATSAPP',
    category: 'reminder',
    content: `Hi {{firstName}}! 📚

Your class starts soon!

📖 Course: {{course}}
📅 Date: {{appointmentDate}}
⏰ Time: {{appointmentTime}}
🔗 Join: {{link}}

Don't forget your notebook! ✏️

Need help? Reply to this message.

Happy Learning! 🎓
{{orgName}}`,
    sampleValues: { firstName: 'John', course: 'Digital Marketing Masterclass', appointmentDate: 'Today', appointmentTime: '3:00 PM', link: 'class.example.com', orgName: 'VoiceBridge' },
  },
];

export default DEFAULT_TEMPLATES;
