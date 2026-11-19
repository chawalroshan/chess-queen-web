import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], display: 'swap' });

export const metadata = {
  title: { default: 'GG Chess', template: '%s — GG Chess' },
  description: 'GG Chess — play chess in your browser. Take on the computer or a friend.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className={inter.className}>
        <Script id="gg-theme-init" strategy="beforeInteractive">
          {String.raw`(function(){try{var t=localStorage.getItem('gg:theme');var v=t==='light'?'light':'dark';if(t!=='light'&&t!=='dark')v=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.dataset.theme=v;}catch(e){document.documentElement.dataset.theme='dark';}})();`}
        </Script>
        {children}
      </body>
    </html>
  );
}
