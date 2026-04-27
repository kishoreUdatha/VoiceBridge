/**
 * Terms of Service Page - Clean Professional Design
 */

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfServicePage() {
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
            <Link to="/privacy-policy" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 md:py-16">
        {/* Title */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-gray-500">Last updated: April 24, 2026</p>
        </div>

        {/* Important Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-12">
          <p className="text-amber-800 text-sm">
            <strong>Please read these terms carefully.</strong> By accessing or using our application, you agree to be bound by these terms. If you do not agree, please do not use the application.
          </p>
        </div>

        {/* Terms Content */}
        <div className="prose prose-gray prose-lg max-w-none">

          {/* Acceptance of Terms */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              By downloading, installing, or using the MyLeadX mobile application ("App"), you ("User," "you," or "your") agree to be bound by these Terms of Service ("Terms"), our Privacy Policy, and any additional terms and conditions that may apply.
            </p>
            <p className="text-gray-600 leading-relaxed">
              These Terms constitute a legally binding agreement between you and MyLeadX ("Company," "we," "us," or "our"). If you are using the App on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.
            </p>
          </section>

          {/* Description of Service */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              MyLeadX is a mobile Customer Relationship Management (CRM) application designed for telecallers and sales teams. The App provides the following services:
            </p>
            <div className="grid sm:grid-cols-2 gap-3 my-6">
              {[
                'Lead management and tracking',
                'Call initiation and duration tracking',
                'Call recording capabilities',
                'Call outcome and disposition logging',
                'Follow-up scheduling and reminders',
                'Performance analytics and reporting',
                'Team management features',
                'WhatsApp and SMS integration',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-gray-600">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-500 text-sm">
              We reserve the right to modify, suspend, or discontinue any part of the Service at any time with or without notice.
            </p>
          </section>

          {/* User Accounts */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>

            <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">3.1 Account Requirements</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>You must be at least 18 years old to use this App</li>
              <li>You must provide accurate and complete information</li>
              <li>You must be authorized by your organization to access the App</li>
              <li>One account per user - sharing accounts is prohibited</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">3.2 Account Security</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              You are solely responsible for safeguarding your login credentials. We recommend:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Using a strong, unique password</li>
              <li>Not sharing your credentials with others</li>
              <li>Logging out when not using the App</li>
              <li>Reporting any security concerns immediately</li>
            </ul>
          </section>

          {/* Acceptable Use Policy */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Acceptable Use Policy</h2>

            <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">4.1 Permitted Uses</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Managing and contacting assigned leads</li>
              <li>Tracking your call activities and outcomes</li>
              <li>Recording calls with proper consent</li>
              <li>Collaborating with your team members</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">4.2 Prohibited Activities</h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
              <p className="text-red-800 text-sm font-medium mb-3">You must NOT:</p>
              <ul className="list-disc pl-6 text-red-700 text-sm space-y-1">
                <li>Use the App for illegal purposes</li>
                <li>Make harassing or abusive calls</li>
                <li>Violate Do-Not-Call regulations</li>
                <li>Record calls without consent</li>
                <li>Share or misuse lead data</li>
                <li>Attempt to hack the App</li>
                <li>Use automated bots</li>
                <li>Impersonate another person</li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
              <p className="text-amber-800 text-sm">
                <strong>Warning:</strong> Violation of this Acceptable Use Policy may result in immediate termination of your account and potential legal action.
              </p>
            </div>
          </section>

          {/* Call Recording Terms */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Call Recording Terms</h2>

            <div className="bg-violet-50 border border-violet-200 rounded-lg p-4 mb-6">
              <p className="text-violet-800 text-sm">
                <strong>Important Legal Notice:</strong> Call recording laws vary by jurisdiction. It is YOUR responsibility to understand and comply with all applicable laws regarding call recording in your location and the location of the person you are calling.
              </p>
            </div>

            <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">Your Responsibilities</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Obtain proper consent before recording any call where required by law</li>
              <li>Inform the other party that the call may be recorded</li>
              <li>Comply with all applicable federal, state, and local laws</li>
              <li>Use recordings only for legitimate business purposes</li>
            </ul>

            <div className="bg-gray-50 rounded-lg p-4 mt-6">
              <p className="text-gray-600 text-sm">
                <strong>Company Disclaimer:</strong> MyLeadX provides call recording as a feature but does not provide legal advice. We are not responsible for any legal consequences arising from your use of the call recording feature. You assume all liability for ensuring compliance with applicable laws.
              </p>
            </div>
          </section>

          {/* Data and Content */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data and Content</h2>
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">6.1 Your Data</h4>
                <p className="text-gray-600 text-sm">
                  You retain ownership of all data you enter into the App, including lead information, call notes, and custom fields.
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">6.2 Organization Data</h4>
                <p className="text-gray-600 text-sm">
                  Lead data and customer information belong to your organization. Your access to this data is governed by your employment or contractual relationship.
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">6.3 Data Accuracy</h4>
                <p className="text-gray-600 text-sm">
                  You are responsible for ensuring the accuracy of data you enter. We are not liable for any consequences arising from inaccurate or incomplete data.
                </p>
              </div>
            </div>
          </section>

          {/* Payment Terms */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Payment Terms</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Subscription Fees:</strong> Fees are based on your chosen plan and are billed monthly or annually.</li>
              <li><strong>Payment Methods:</strong> We accept credit cards, debit cards, UPI, and net banking through Razorpay.</li>
              <li><strong>Automatic Renewal:</strong> Subscriptions auto-renew unless cancelled before the renewal date.</li>
              <li><strong>Refund Policy:</strong> Refunds are provided as per our refund policy available on our website.</li>
            </ul>
            <p className="text-gray-500 text-sm mt-4">
              All prices are in Indian Rupees (INR) and are subject to applicable taxes.
            </p>
          </section>

          {/* Intellectual Property */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Intellectual Property</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              The MyLeadX App, including its design, features, code, graphics, logos, and content, is owned by us and protected by intellectual property laws. You may not:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Copy, modify, or distribute the App</li>
              <li>Reverse engineer or decompile the App</li>
              <li>Use our trademarks without permission</li>
              <li>Create derivative works based on the App</li>
            </ul>
            <p className="text-gray-500 text-sm mt-4">
              We grant you a limited, non-exclusive, non-transferable, revocable license to use the App for its intended purpose, subject to these Terms.
            </p>
          </section>

          {/* Disclaimers */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Disclaimers</h2>
            <div className="bg-gray-100 rounded-lg p-6 mb-4">
              <p className="text-gray-700 text-sm uppercase leading-relaxed">
                THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
            </div>
            <p className="text-gray-600 text-sm">
              We do not guarantee that the App will be uninterrupted, error-free, or that defects will be corrected. We are not a telecommunications provider and are not responsible for call quality or connectivity issues.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Limitation of Liability</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              To the maximum extent permitted by law:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>We shall not be liable for any indirect, incidental, special, consequential, or punitive damages</li>
              <li>We shall not be liable for any loss of profits, revenue, data, or business opportunities</li>
              <li>Our total liability shall not exceed the amount paid by your organization in the 12 months preceding the claim</li>
              <li>We are not liable for any actions taken based on data or analytics provided by the App</li>
            </ul>
          </section>

          {/* Termination */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Termination</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Termination by You</h4>
                <p className="text-gray-600 text-sm">
                  You may stop using the App at any time. Contact your organization administrator to deactivate your account.
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Termination by Us</h4>
                <p className="text-gray-600 text-sm">
                  We may suspend or terminate your access for violation of Terms, illegal activities, or upon request from your organization.
                </p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Effect of Termination</h4>
              <p className="text-gray-600 text-sm">
                Upon termination, your access will be revoked, and your data may be deleted according to our retention policy. Sections regarding liability, indemnification, and intellectual property survive termination.
              </p>
            </div>
          </section>

          {/* Governing Law */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Governing Law</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Jurisdiction</h4>
                <p className="text-gray-600 text-sm">
                  These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions.
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Dispute Resolution</h4>
                <p className="text-gray-600 text-sm">
                  Any disputes shall be first attempted to be resolved through good-faith negotiation. If unresolved, submitted to binding arbitration in Hyderabad, India.
                </p>
              </div>
            </div>
          </section>

          {/* Contact Us */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="grid sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Legal</p>
                  <a href="mailto:legal@myleadx.ai" className="text-gray-900 hover:text-violet-600">legal@myleadx.ai</a>
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
              <Link to="/privacy-policy" className="text-gray-500 hover:text-gray-900">Privacy Policy</Link>
              <Link to="/" className="text-gray-500 hover:text-gray-900">Home</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
