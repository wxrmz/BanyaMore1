import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Баня Море | Русская баня на берегу моря во Владивостоке",
  description:
    "Премиальный банный комплекс на берегу Японского моря: русская баня на дровах, приватный отдых, морской воздух и панорамные виды.",
  keywords: [
    "баня во Владивостоке",
    "русская баня",
    "баня у моря",
    "Баня Море",
    "отдых у моря",
  ],
  openGraph: {
    title: "Баня Море | Русская баня на берегу моря",
    description:
      "Пар на дровах, морской воздух и приватный отдых во Владивостоке.",
    type: "website",
    locale: "ru_RU",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <Script id="scroll-restoration" strategy="beforeInteractive">
          {`if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; window.scrollTo(0, 0);`}
        </Script>
        {children}
      </body>
    </html>
  );
}
