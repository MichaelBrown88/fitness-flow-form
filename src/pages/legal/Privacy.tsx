/**
 * Privacy Policy Page
 * 
 * Comprehensive privacy policy required for GDPR/HIPAA compliance.
 * Essential for enterprise customers handling client health data.
 */

import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/landing';
import { Footer } from '@/components/landing';
import { Seo } from '@/components/seo/Seo';
import { requireSeoForPath, SEO_PATH } from '@/constants/seo';

const privacySeo = requireSeoForPath(SEO_PATH.PRIVACY);

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        pathname={SEO_PATH.PRIVACY}
        title={privacySeo.title}
        description={privacySeo.description}
        noindex={privacySeo.noindex}
      />
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
            Privacy Policy
          </h1>
          
          <p className="text-sm text-foreground-secondary mb-8">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Introduction</h2>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              One Assess ("we," "our," or "us") is committed to protecting your privacy and the privacy 
              of your clients. This Privacy Policy explains how we collect, use, disclose, and safeguard 
              your information when you use our Service.
            </p>
            <p className="text-foreground-secondary leading-relaxed">
              This policy applies to all users of One Assess, including coaches, gym owners, healthcare 
              providers, and their clients. By using our Service, you agree to the collection and use of 
              information in accordance with this policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-3">2.1 Account Information</h3>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              When you create an account, we collect:
            </p>
            <ul className="list-disc list-inside text-foreground-secondary space-y-2 mb-4 ml-4">
              <li>Name and email address</li>
              <li>Organization name and details</li>
              <li>Billing information (processed securely through payment processors)</li>
              <li>Profile information and preferences</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">2.2 Client Assessment Data</h3>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              When you use our Service to conduct assessments, we collect and store:
            </p>
            <ul className="list-disc list-inside text-foreground-secondary space-y-2 mb-4 ml-4">
              <li>Client personal information (name, date of birth, contact details)</li>
              <li>Biometric data (photos, measurements, movement analysis results)</li>
              <li>Health and fitness assessment data</li>
              <li>Medical history and lifestyle information (as provided by you or your clients)</li>
              <li>Assessment reports and recommendations</li>
            </ul>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              <strong>Important:</strong> You are responsible for obtaining all necessary consents from 
              your clients before collecting and storing their personal and health information through our Service.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3">2.3 Usage Data</h3>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              We automatically collect information about how you use the Service, including:
            </p>
            <ul className="list-disc list-inside text-foreground-secondary space-y-2 mb-4 ml-4">
              <li>Log data (IP address, browser type, device information)</li>
              <li>Usage patterns and feature interactions</li>
              <li>Performance and error logs</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. How We Use Your Information</h2>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              We use the collected information for the following purposes:
            </p>
            <ul className="list-disc list-inside text-foreground-secondary space-y-2 mb-4 ml-4">
              <li><strong>Service Provision:</strong> To provide, maintain, and improve our Service</li>
              <li><strong>Assessment Processing:</strong> To analyse biomechanical data and generate client reports</li>
              <li><strong>Account Management:</strong> To manage your account, process payments, and provide customer support</li>
              <li><strong>Communication:</strong> To send service updates, security alerts, and respond to your inquiries</li>
              <li><strong>Compliance:</strong> To comply with legal obligations and enforce our Terms of Service</li>
              <li><strong>Analytics:</strong> To analyse usage patterns and improve our Service (using aggregated, anonymised data)</li>
            </ul>
            <p className="text-foreground-secondary leading-relaxed">
              We do not sell, rent, or lease your personal information or client data to third parties.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Data Security</h2>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc list-inside text-foreground-secondary space-y-2 mb-4 ml-4">
              <li><strong>Encryption:</strong> All data is encrypted in transit (TLS/SSL) and at rest (AES-256)</li>
              <li><strong>Access Controls:</strong> Strict access controls and authentication requirements</li>
              <li><strong>Regular Audits:</strong> Security audits and vulnerability assessments</li>
              <li><strong>Backup Systems:</strong> Regular backups and disaster recovery procedures</li>
              <li><strong>Infrastructure:</strong> Hosted on secure cloud infrastructure with physical and logical security measures</li>
            </ul>
            <p className="text-foreground-secondary leading-relaxed">
              However, no method of transmission over the Internet or electronic storage is 100% secure. 
              While we strive to use commercially acceptable means to protect your data, we cannot guarantee 
              absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Data Sharing and Disclosure</h2>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              We do not share your personal information or client data except in the following limited circumstances:
            </p>
            <h3 className="text-xl font-semibold text-foreground mb-3">5.1 Service Providers</h3>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              We may share data with trusted third-party sub-processors who assist us in operating our
              Service. Our current sub-processors are:
            </p>
            <ul className="list-disc list-inside text-foreground-secondary space-y-2 mb-4 ml-4">
              <li><strong>Google Cloud Platform</strong> — Cloud infrastructure, database (Firebase Firestore), file storage (Firebase Storage), and authentication (Firebase Authentication). Data may be stored in the EU or US depending on configuration.</li>
              <li><strong>Google Gemini API (Vertex AI)</strong> — AI processing for posture observation and report generation. Images and posture metrics are transmitted to this service for analysis.</li>
              <li><strong>Stripe</strong> — Payment processing. We do not store card details; Stripe handles all payment data under their own PCI-DSS compliance programme.</li>
              <li><strong>Resend / transactional email provider</strong> — Email delivery for account notifications, assessment links, and lifecycle communications.</li>
            </ul>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              All sub-processors are contractually obligated to protect your data and use it only for the
              purposes specified in our agreements. We will update this list when sub-processors change.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3">5.2 Legal Requirements</h3>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              We may disclose information if required by law, court order, or government regulation, or if 
              we believe disclosure is necessary to:
            </p>
            <ul className="list-disc list-inside text-foreground-secondary space-y-2 mb-4 ml-4">
              <li>Comply with legal obligations</li>
              <li>Protect our rights and property</li>
              <li>Prevent or investigate possible wrongdoing</li>
              <li>Protect the safety of users or the public</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">5.3 Business Transfers</h3>
            <p className="text-foreground-secondary leading-relaxed">
              In the event of a merger, acquisition, or sale of assets, your information may be transferred 
              to the acquiring entity, subject to the same privacy protections.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. GDPR Compliance (EU Users)</h2>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              If you are located in the European Economic Area (EEA), you have certain data protection rights:
            </p>
            <ul className="list-disc list-inside text-foreground-secondary space-y-2 mb-4 ml-4">
              <li><strong>Right to Access:</strong> Request copies of your personal data</li>
              <li><strong>Right to Rectification:</strong> Request correction of inaccurate data</li>
              <li><strong>Right to Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
              <li><strong>Right to Restrict Processing:</strong> Request limitation of how we process your data</li>
              <li><strong>Right to Data Portability:</strong> Request transfer of your data to another service</li>
              <li><strong>Right to Object:</strong> Object to processing of your data for certain purposes</li>
            </ul>
            <p className="text-foreground-secondary leading-relaxed">
              To exercise these rights, please contact us at support@one-assess.com. We will respond to 
              your request within 30 days.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. HIPAA Considerations (US Healthcare Providers)</h2>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              If you are a healthcare provider subject to HIPAA (Health Insurance Portability and Accountability Act), 
              please note:
            </p>
            <ul className="list-disc list-inside text-foreground-secondary space-y-2 mb-4 ml-4">
              <li>We implement security measures aligned with HIPAA requirements</li>
              <li>You are responsible for obtaining Business Associate Agreements (BAAs) if required</li>
              <li>You must ensure proper consent and authorization from clients before collecting Protected Health Information (PHI)</li>
              <li>Contact us to discuss HIPAA compliance requirements and BAAs</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Data Retention</h2>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              We retain your data for as long as necessary to:
            </p>
            <ul className="list-disc list-inside text-foreground-secondary space-y-2 mb-4 ml-4">
              <li>Provide the Service to you</li>
              <li>Comply with legal and regulatory obligations</li>
              <li>Resolve disputes and enforce agreements</li>
            </ul>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              When you cancel your account, we will retain your data for a reasonable period (typically 30-90 days) 
              to allow for account recovery. After this period, your data will be permanently deleted unless 
              retention is required by law.
            </p>
            <p className="text-foreground-secondary leading-relaxed">
              You may request immediate deletion of your data at any time by contacting us, subject to legal 
              and regulatory requirements.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. Cookies and Tracking Technologies</h2>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              We use cookies and similar tracking technologies to:
            </p>
            <ul className="list-disc list-inside text-foreground-secondary space-y-2 mb-4 ml-4">
              <li>Maintain your session and authentication state</li>
              <li>Remember your preferences and settings</li>
              <li>Analyze Service usage and performance</li>
              <li>Improve user experience</li>
            </ul>
            <p className="text-foreground-secondary leading-relaxed">
              You can control cookies through your browser settings. However, disabling cookies may limit 
              your ability to use certain features of the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">10. Children's Privacy</h2>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              Our Service is intended for use by professional coaches and fitness professionals. While the Service 
              is designed for adult clients, we recognise that coaches may assess youth athletes (individuals under
              the age of 18) as part of their practice.
            </p>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              If you use our Service to assess individuals under 18, you represent and warrant that you have obtained 
              explicit written parental or guardian consent before collecting, storing, or processing any personal or 
              health information of such minors. You are solely responsible for ensuring compliance with applicable 
              child protection and privacy laws in your jurisdiction, including but not limited to COPPA (Children's 
              Online Privacy Protection Act) if operating in the United States.
            </p>
            <p className="text-foreground-secondary leading-relaxed">
              If you are a parent or guardian and believe your child's information has been collected through our 
              Service without proper consent, please contact us immediately at privacy@one-assess.com. We do not 
              knowingly collect personal information from minors without proper authorization and will take appropriate 
              action to address any unauthorized collection.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">11. International Data Transfers</h2>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              Your information may be transferred to and processed in countries other than your country of 
              residence. These countries may have different data protection laws than your country.
            </p>
            <p className="text-foreground-secondary leading-relaxed">
              By using our Service, you consent to the transfer of your information to countries outside 
              your jurisdiction. We ensure appropriate safeguards are in place to protect your data in 
              accordance with this Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">12. Changes to This Privacy Policy</h2>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any material changes 
              by:
            </p>
            <ul className="list-disc list-inside text-foreground-secondary space-y-2 mb-4 ml-4">
              <li>Email notification to the address associated with your account</li>
              <li>Prominent notice within the Service</li>
              <li>Updating the "Last updated" date at the top of this page</li>
            </ul>
            <p className="text-foreground-secondary leading-relaxed">
              Your continued use of the Service after such modifications constitutes acceptance of the updated 
              Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">13. Contact Us</h2>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, 
              please contact us at:
            </p>
            <p className="text-foreground-secondary leading-relaxed">
              <strong>One Assess</strong><br />
              Email: privacy@one-assess.com<br />
              {/* Add your actual contact information */}
            </p>
            <p className="text-foreground-secondary leading-relaxed mt-4">
              For GDPR-related requests, please include "GDPR Request" in your subject line. For HIPAA-related 
              inquiries, please include "HIPAA Inquiry" in your subject line.
            </p>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}
