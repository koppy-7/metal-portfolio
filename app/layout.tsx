import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '現物貴金属ポートフォリオ',
  description: '所有している現物貴金属の概算評価額を管理するアプリ',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
