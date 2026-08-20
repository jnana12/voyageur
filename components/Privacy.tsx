
import React from 'react';
import { PageWrapper } from './ui/PageWrapper';
import { PageHeader } from './ui/PageHeader';

const Privacy: React.FC = () => {
    return (
        <PageWrapper>
            <div className="animate-fade-in-up">
                <PageHeader 
                    badge="Legal"
                    title="Privacy"
                    highlight="Policy"
                    description="Your data is yours. We protect it with military-grade encryption."
                />

            <div className="space-y-12 text-zinc-400 font-sans leading-relaxed text-sm md:text-base mb-20">                <section>
                    <h3 className="text-white font-bold uppercase tracking-wide mb-4 text-lg">1. Introduction</h3>
                    <p className="mb-4">
                        At Voyageur ("we", "our", or "us"), we respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website (regardless of where you visit it from) and tell you about your privacy rights and how the law protects you.
                    </p>
                </section>

                <section>
                    <h3 className="text-white font-bold uppercase tracking-wide mb-4 text-lg">2. Data We Collect</h3>
                    <p className="mb-4">We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
                    <ul className="list-disc pl-5 space-y-2 marker:text-cyan-500">
                        <li><strong className="text-zinc-300">Identity Data:</strong> includes first name, last name, username or similar identifier.</li>
                        <li><strong className="text-zinc-300">Contact Data:</strong> includes billing address, delivery address, email address and telephone numbers.</li>
                        <li><strong className="text-zinc-300">Technical Data:</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location.</li>
                        <li><strong className="text-zinc-300">Usage Data:</strong> includes information about how you use our website, products and services.</li>
                    </ul>
                </section>

                <section>
                    <h3 className="text-white font-bold uppercase tracking-wide mb-4 text-lg">3. How We Use Your Data</h3>
                    <p className="mb-4">We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
                    <ul className="list-disc pl-5 space-y-2 marker:text-cyan-500">
                        <li>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
                        <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
                        <li>Where we need to comply with a legal or regulatory obligation.</li>
                    </ul>
                </section>

                <section>
                    <h3 className="text-white font-bold uppercase tracking-wide mb-4 text-lg">4. AI & Automated Decision Making</h3>
                    <p className="mb-4">
                        Our platform utilizes advanced Artificial Intelligence (Gemini) to generate travel itineraries and recommendations. While we strive for accuracy, AI-generated content may occasionally be incorrect or outdated. We recommend verifying critical details such as visa requirements and health regulations independently.
                    </p>
                </section>

                <section>
                    <h3 className="text-white font-bold uppercase tracking-wide mb-4 text-lg">5. Data Security</h3>
                    <p className="mb-4">
                        We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.
                    </p>
                </section>

                <section>
                    <h3 className="text-white font-bold uppercase tracking-wide mb-4 text-lg">6. Contact Us</h3>
                    <p>
                        If you have any questions about this privacy policy or our privacy practices, please contact us at <a href="mailto:privacy@voyageur.ai" className="text-cyan-400 hover:text-cyan-300 transition-colors">privacy@voyageur.ai</a>.
                    </p>
                </section>
            </div>
            </div>
        </PageWrapper>
    );
};

export default Privacy;
