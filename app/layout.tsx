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
        <Script id="yandex-metrika" strategy="afterInteractive">
          {`
            (function(m,e,t,r,i,k,a){
              m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
              m[i].l=1*new Date();
              for (var j = 0; j < document.scripts.length; j++) {
                if (document.scripts[j].src === r) { return; }
              }
              k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
            })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js?id=109708859', 'ym');

            ym(109708859, 'init', {
              ssr: true,
              clickmap: true,
              referrer: document.referrer,
              url: location.href,
              accurateTrackBounce: true,
              trackLinks: true
            });
          `}
        </Script>
        <noscript>
          <div>
            <img
              src="https://mc.yandex.ru/watch/109708859"
              style={{ position: "absolute", left: "-9999px" }}
              alt=""
            />
          </div>
        </noscript>
        {children}
      </body>
    </html>
  );
}
