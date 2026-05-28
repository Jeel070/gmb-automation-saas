import './globals.css';

export const metadata = {
  title: 'GMB Automation SaaS',
  description: 'Multi-tenant Google My Business post automation platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
