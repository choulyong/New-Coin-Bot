import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '빗썸 AI 자동매매 봇',
  description: '멀티레이어 전략 기반 암호화폐 자동매매 시스템',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-xl font-bold text-white">
                🤖 빗썸 AI 트레이더
              </Link>
              <div className="flex gap-6">
                <Link
                  href="/"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  홈
                </Link>
                <Link
                  href="/dashboard"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  대시보드
                </Link>
                <Link
                  href="/strategy"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  전략분석
                </Link>
                <Link
                  href="/backtest"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  백테스트
                </Link>
              </div>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
