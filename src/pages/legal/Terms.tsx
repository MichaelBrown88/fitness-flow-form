/**
 * Terms of Service Page
 * 
 * Legal terms and conditions for One Assess SaaS platform.
 * Required for GDPR compliance and trust-building with enterprise customers.
 */

import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/landing';
import { Footer } from '@/components/landing';

export default function Terms() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 py-16">
        <Button
          variant="ghost"
          asChild
          className="mb-8"
        >
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </Button>

        <article className="prose prose-slate max-w-none">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Terms of Service
          </h1>
          
          <p className="text-sm text-foreground-secondary mb-8">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              By accessing and using One Assess ("the Service"), you accept and agree to be bound by the terms 
              and provision of this agreement. If you do not agree to these Terms of Service, please do not use 
              our Service.
            </p>
            <p className="text-foreground-secondary leading-relaxed">
              One Assess is a Software-as-a-Service (SaaS) platform designed for fitness professionals, 
              coaches, gyms, and healthcare providers to conduct biomechanical assessments and generate 
              client reports.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Use of Service</h2>
            <h3 className="text-xl font-semibold text-foreground mb-3">2.1 Eligibility</h3>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              You must be at least 18 years old and have the legal capacity to enter into this agreement. 
              By using the Service, you represent and warrant that you meet these requirements.
            </p>
            
            <h3 className="text-xl font-semibold text-foreground mb-3">2.2 Account Responsibility</h3>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              You are responsible for maintaining the confidentiality of your account credentials and for all 
              activities that occur under your account. You agree to immediately notify us of any unauthorized 
              use of your account.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3">2.3 Acceptable Use</h3>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              You agree to use the Service only for lawful purposes and in accordance with these Terms. 
              You agree not to:
            </p>
            <ul className="list-disc list-inside text-foreground-secondary space-y-2 mb-4 ml-4">
              <li>Use the Service in any way that violates applicable laws or regulations</li>
              <li>Infringe upon the intellectual property rights of others</li>
              <li>Transmit any malicious code, viruses, or harmful data</li>
              <li>Attempt to gain unauthorized access to the Service or related systems</li>
              <li>Use the Service to store or process data in violation of privacy laws (e.g., HIPAA, GDPR)</li>
              <li>Resell, sublicense, or redistribute the Service without our written consent</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Subscription and Billing</h2>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              One Assess operates on a subscription model. Subscription fees are billed monthly (or annually where
              offered) based on your selected plan and client capacity. Fees are charged in the currency of your
              selected billing region: British Pound (GBP), US Dollar (USD), or Kuwaiti Dinar (KWD).
            </p>
            <h3 className="text-xl font-semibold text-foreground mb-3">3.1 Free Trial</h3>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              New users may be eligible for a 14-day free trial. The trial period begins upon account creation. 
              At the end of the trial period, your subscription will automatically convert to a paid plan 
              unless you cancel before the trial expires.
            </p>
            <h3 className="text-xl font-semibold text-foreground mb-3">3.2 Cancellation</h3>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              You may cancel your subscription at any time from your account settings. Cancellation takes effect 
              at the end of your current billing period. You will continue to have access to the Service until 
              the end of the billing period for which you have already paid.
            </p>
            <h3 className="text-xl font-semibold text-foreground mb-3">3.3 Refunds</h3>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              Subscription fees are non-refundable except as required by law or at our sole discretion. 
              Refund requests must be submitted within 7 days of the charge.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Data and Privacy</h2>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              Your use of the Service is also governed by our Privacy Policy. We take data security and 
              privacy seriously, especially when handling client health information (PII).
            </p>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              By using the Service, you represent that you have obtained all necessary consents and 
              authorizations from your clients to collect, store, and process their personal and health 
              information through our platform.
            </p>
            <p className="text-foreground-secondary leading-relaxed">
              You are responsible for ensuring your use of the Service complies with applicable data 
              protection laws, including but not limited to GDPR, HIPAA, and local privacy regulations.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Intellectual Property</h2>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              The Service, including its proprietary clinical logic engine, algorithms, software, designs, 
              and content, is owned by One Assess and protected by intellectual property laws. 
              You may not copy, modify, distribute, or create derivative works without our written permission.
            </p>
            <p className="text-foreground-secondary leading-relaxed">
              You retain ownership of your client data and content you upload. By using the Service, you 
              grant us a limited license to use, process, and store your data solely for the purpose of 
              providing the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Disclaimers and Limitations</h2>
            <h3 className="text-xl font-semibold text-foreground mb-3">6.1 Medical Disclaimer</h3>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              <strong>IMPORTANT:</strong> One Assess is a tool for fitness professionals and is not a 
              substitute for professional medical advice, diagnosis, or treatment. The assessments and 
              recommendations generated by the Service are intended for fitness and wellness purposes only 
              and should not be used as medical advice.
            </p>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              Users are responsible for ensuring that any assessments or recommendations provided to clients 
              are appropriate and within their scope of practice.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3">6.2 Service Availability</h3>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              We strive to maintain high availability of the Service, but we do not guarantee uninterrupted 
              or error-free access. The Service may be unavailable due to maintenance, technical issues, 
              or circumstances beyond our control.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3">6.3 Limitation of Liability</h3>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              To the maximum extent permitted by law, One Assess shall not be liable for any indirect, 
              incidental, special, consequential, or punitive damages, or any loss of profits or revenues, 
              whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible 
              losses resulting from your use of the Service.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3">6.4 AI & Automated Analysis</h3>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              The Service utilizes artificial intelligence and computer vision technologies (including but not 
              limited to MediaPipe and Gemini) to provide biomechanical analysis. While we strive for accuracy, 
              these outputs are probabilistic estimates and may vary based on lighting, camera angle, subject 
              positioning, and other environmental factors.
            </p>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              AI outputs should never be used as the sole basis for clinical diagnosis or treatment. The User 
              (Coach) is responsible for verifying all automated findings against their professional judgment 
              and conducting appropriate follow-up assessments when necessary.
            </p>
            <p className="text-foreground-secondary leading-relaxed">
              One Assess makes no warranty that AI-generated analysis will be error-free, complete, or suitable 
              for any particular purpose. You acknowledge that automated analysis may contain inaccuracies or 
              artifacts, and you agree to use your professional expertise to interpret and validate all results 
              before providing recommendations to clients.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Termination</h2>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              We reserve the right to suspend or terminate your account and access to the Service at any time 
              for violation of these Terms, fraudulent activity, or any other reason we deem necessary to 
              protect the Service or other users.
            </p>
            <p className="text-foreground-secondary leading-relaxed">
              Upon termination, your right to use the Service will immediately cease. We may delete your 
              account data after a reasonable retention period, subject to legal and regulatory requirements.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Changes to Terms</h2>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              We reserve the right to modify these Terms at any time. We will notify users of material 
              changes via email or through the Service. Your continued use of the Service after such 
              modifications constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. Governing Law</h2>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              These Terms shall be governed by and construed in accordance with the laws of Kuwait, without 
              regard to its conflict of law provisions. Any disputes arising from these Terms or your use of 
              the Service shall be subject to the exclusive jurisdiction of the courts of Kuwait.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">10. Contact Information</h2>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <p className="text-foreground-secondary leading-relaxed">
              <strong>One Assess</strong><br />
              Email: support@one-assess.com<br />
              {/* Add your actual contact information */}
            </p>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}
