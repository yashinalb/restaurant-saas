import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import SEOHead from '../components/common/SEOHead';

export default function ContactPage() {
  return (
    <>
      <SEOHead title="Contact · Restaurant" description="Visit us, call, or send us a message." />
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-extrabold text-brand-text mb-2">Contact</h1>
        <p className="text-brand-text-muted mb-8">We'd love to hear from you.</p>

        <div className="grid gap-6 sm:grid-cols-2">
          <Info icon={<MapPin className="w-5 h-5" />} title="Address" body="Your restaurant address — configured per tenant." />
          <Info icon={<Phone className="w-5 h-5" />} title="Phone" body="+90 000 000 00 00" />
          <Info icon={<Mail className="w-5 h-5" />} title="Email" body="hello@restaurant.example" />
          <Info icon={<Clock className="w-5 h-5" />} title="Hours" body="Mon–Sun · 10:00 – 23:00" />
        </div>
      </section>
    </>
  );
}

function Info({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex gap-3">
      <div className="w-10 h-10 rounded-lg bg-brand-secondary flex items-center justify-center text-brand-primary">
        {icon}
      </div>
      <div>
        <div className="font-semibold text-brand-text">{title}</div>
        <div className="text-sm text-brand-text-muted mt-1">{body}</div>
      </div>
    </div>
  );
}
