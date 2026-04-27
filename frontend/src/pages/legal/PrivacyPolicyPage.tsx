/**
 * Privacy Policy Page - Clean Professional Design
 */

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back</span>
            </Link>
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="MyLeadX" className="w-7 h-7 rounded-lg" />
              <span className="font-semibold text-gray-900">MyLeadX</span>
            </Link>
            <Link to="/terms-of-service" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 md:py-16">
        {/* Title */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-gray-500">Last updated: April 24, 2026</p>
        </div>

        {/* Policy Content */}
        <div className="prose prose-gray prose-lg max-w-none">

          {/* Introduction */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Welcome to MyLeadX ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and web platform ("Service").
            </p>
            <p className="text-gray-600 leading-relaxed">
              By using MyLeadX, you agree to the collection and use of information in accordance with this policy.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>

            <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Account Information:</strong> Name, email address, phone number, and organization details when you register or log in.</li>
              <li><strong>Lead Data:</strong> Customer/lead information including names, phone numbers, email addresses, and notes that you enter into the app.</li>
              <li><strong>Call Notes:</strong> Notes and comments you add about calls and leads.</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">2.2 Information Collected Automatically</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Call Logs:</strong> With your permission, we access call history to track call duration and outcomes.</li>
              <li><strong>Call Recordings:</strong> With your explicit permission, call recordings may be captured for quality assurance.</li>
              <li><strong>Device Information:</strong> Device type, operating system version, unique device identifiers.</li>
              <li><strong>Usage Data:</strong> App feature usage, call statistics, and performance metrics.</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">2.3 Permissions We Request</h3>
            <div className="bg-gray-50 rounded-lg p-6 mt-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="font-medium text-gray-900">Phone</p>
                  <p className="text-sm text-gray-500">To make calls directly from the app</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Microphone</p>
                  <p className="text-sm text-gray-500">To record calls for quality assurance</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Call Logs</p>
                  <p className="text-sm text-gray-500">To track call duration and history</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Storage</p>
                  <p className="text-sm text-gray-500">To save call recordings temporarily</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Notifications</p>
                  <p className="text-sm text-gray-500">To send alerts and reminders</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Internet</p>
                  <p className="text-sm text-gray-500">To sync data with our servers</p>
                </div>
              </div>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Service Delivery:</strong> To provide and maintain the MyLeadX application and its features.</li>
              <li><strong>Call Management:</strong> To help you track, manage, and analyze your calls with leads.</li>
              <li><strong>Performance Analytics:</strong> To generate reports on call outcomes, conversion rates, and telecaller performance.</li>
              <li><strong>Quality Assurance:</strong> To review call recordings for training and quality improvement.</li>
              <li><strong>Notifications:</strong> To send you reminders about follow-ups and important updates.</li>
              <li><strong>Support:</strong> To respond to your inquiries and provide customer support.</li>
              <li><strong>Improvements:</strong> To analyze usage patterns and improve app functionality.</li>
              <li><strong>Security:</strong> To detect and prevent fraud, abuse, and security incidents.</li>
            </ul>
          </section>

          {/* Data Storage and Security */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Storage and Security</h2>

            <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">4.1 Data Storage</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Your data is stored on secure cloud servers hosted on Amazon Web Services (AWS).</li>
              <li>Call recordings are encrypted during transmission and storage.</li>
              <li>Data is retained as long as your account is active or as needed to provide services.</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">4.2 Security Measures</h3>
            <div className="bg-gray-50 rounded-lg p-6 mt-4">
              <div className="grid sm:grid-cols-2 gap-3">
                {['SSL/TLS encryption for all data transmission', 'Encrypted storage for sensitive data', 'Regular security audits and updates', 'Access controls and authentication', 'Secure password hashing', 'SOC 2 Type II compliance'].map((item, i) => (
                  <p key={i} className="text-gray-600 text-sm">• {item}</p>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
              <p className="text-amber-800 text-sm">
                <strong>Important:</strong> While we implement industry-standard security measures, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security.
              </p>
            </div>
          </section>

          {/* Call Recording Consent */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Call Recording Consent</h2>
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-4 mb-4">
              <p className="text-violet-800 text-sm">
                <strong>Call Recording Notice:</strong> When call recording is enabled, it is your responsibility to inform the other party that the call may be recorded, in compliance with applicable laws. Many jurisdictions require consent from all parties before recording a conversation.
              </p>
            </div>
            <p className="text-gray-600 leading-relaxed">
              You can disable call recording at any time through the app settings. We recommend always obtaining explicit consent before recording any call.
            </p>
          </section>

          {/* Your Rights and Choices */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Your Rights and Choices</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { right: 'Access', desc: 'Request a copy of your personal data' },
                { right: 'Correction', desc: 'Request correction of inaccurate data' },
                { right: 'Deletion', desc: 'Request deletion of your account and data' },
                { right: 'Portability', desc: 'Request your data in a portable format' },
                { right: 'Opt-out', desc: 'Disable specific features like call recording' },
                { right: 'Withdraw Consent', desc: 'Revoke permissions through device settings' },
              ].map((item, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4">
                  <p className="font-medium text-gray-900">{item.right}</p>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Data Retention */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Data Retention</h2>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-900">Data Type</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-900">Retention Period</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[
                    { type: 'Account Data', period: 'Retained while active + 30 days after deletion' },
                    { type: 'Call Recordings', period: 'Retained for 90 days or as configured' },
                    { type: 'Call Logs', period: 'Retained for 1 year for reporting' },
                    { type: 'Lead Data', period: 'Retained as long as lead exists' },
                  ].map((item, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.type}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.period}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Data Sharing and Disclosure */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Data Sharing and Disclosure</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We may share your information in the following circumstances:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>With Your Organization:</strong> Data is shared within your organization hierarchy (managers, admins, team members) based on role permissions.</li>
              <li><strong>Service Providers:</strong> We use trusted third-party services for hosting, analytics, and communication that may process your data on our behalf.</li>
              <li><strong>Legal Requirements:</strong> We may disclose information if required by law, court order, or government request.</li>
              <li><strong>Business Transfers:</strong> In case of merger, acquisition, or sale of assets, your data may be transferred to the new entity.</li>
            </ul>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
              <p className="text-green-800 text-sm">
                <strong>We do NOT sell your personal data</strong> to third parties for marketing or advertising purposes.
              </p>
            </div>
          </section>

          {/* Third-Party Services */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Third-Party Services</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We use the following third-party services to operate MyLeadX:
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { service: 'Amazon Web Services (AWS)', purpose: 'Cloud hosting and storage' },
                { service: 'Firebase (Google)', purpose: 'Authentication and notifications' },
                { service: 'Plivo', purpose: 'Voice calling and SMS services' },
                { service: 'SendGrid', purpose: 'Email delivery services' },
                { service: 'OpenAI', purpose: 'AI conversation processing' },
                { service: 'Razorpay', purpose: 'Payment processing' },
              ].map((item, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4">
                  <p className="font-medium text-gray-900">{item.service}</p>
                  <p className="text-sm text-gray-500">{item.purpose}</p>
                </div>
              ))}
            </div>
            <p className="text-gray-500 text-sm mt-4">
              Each service has its own privacy policy. We recommend reviewing their policies for more information.
            </p>
          </section>

          {/* International Data Transfers */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. International Data Transfers</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Your data may be transferred to and processed in countries other than India where our service providers operate. When we transfer data internationally, we ensure:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Adequate data protection measures are in place</li>
              <li>Standard contractual clauses are used where applicable</li>
              <li>Service providers comply with applicable data protection laws</li>
              <li>Data is encrypted during transmission</li>
            </ul>
          </section>

          {/* Children's Privacy */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Children's Privacy</h2>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <p className="text-gray-800 text-sm">
                <strong>Age Requirement:</strong> MyLeadX is intended for business use and is not directed at individuals under 18 years of age.
              </p>
            </div>
            <p className="text-gray-600 leading-relaxed">
              We do not knowingly collect personal information from children under 18. If you believe we have inadvertently collected information from a minor, please contact us immediately at <a href="mailto:privacy@myleadx.ai" className="text-violet-600 hover:underline">privacy@myleadx.ai</a> and we will promptly delete the information.
            </p>
          </section>

          {/* Changes to This Policy */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Changes to This Policy</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We may update this Privacy Policy from time to time. When we make changes:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>We will update the "Last Updated" date at the top of this page</li>
              <li>For significant changes, we will notify you via email or in-app notification</li>
              <li>Continued use of the Service after changes constitutes acceptance of the updated policy</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              We encourage you to review this Privacy Policy periodically to stay informed about how we protect your information.
            </p>
          </section>

          {/* Compliance */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Compliance</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              This privacy policy is designed to comply with:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Information Technology Act, 2000 (India)</li>
              <li>IT Rules, 2011 (Sensitive Personal Data)</li>
              <li>GDPR Principles</li>
              <li>Google Play Store Developer Policy</li>
              <li>TRAI Regulations</li>
              <li>DNC Registry Compliance</li>
            </ul>
          </section>

          {/* Contact Us */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="grid sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Email</p>
                  <a href="mailto:privacy@myleadx.ai" className="text-gray-900 hover:text-violet-600">privacy@myleadx.ai</a>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Support</p>
                  <a href="mailto:support@myleadx.ai" className="text-gray-900 hover:text-violet-600">support@myleadx.ai</a>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Location</p>
                  <p className="text-gray-900">Hyderabad, India</p>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-8 mt-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              &copy; 2026 MyLeadX. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm">
              <Link to="/terms-of-service" className="text-gray-500 hover:text-gray-900">Terms of Service</Link>
              <Link to="/" className="text-gray-500 hover:text-gray-900">Home</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
