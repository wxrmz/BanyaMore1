'use client';

// Подвал по образцу DentalClinic: одна строка под тонкой чертой — название
// с золотой точкой, разделы сайта и копирайт. Телефон и соцсети есть
// в разделе «Контакты» прямо над подвалом.
const links = [
  { name: 'О нас', href: '#about' },
  { name: 'Бани', href: '#baths' },
  { name: 'Запись', href: '#schedule' },
  { name: 'Галерея', href: '#gallery' },
  { name: 'Контакты', href: '#contacts' },
];

export default function Footer() {
  const scroll = (href: string) => {
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <footer className="site-footer layer-footer relative bg-[#090806]">
      <div className="container-custom">
        <div className="site-footer__inner">
          <a
            href="#"
            onClick={(event) => {
              event.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="site-footer__logo"
            aria-label="Баня Море, наверх"
          >
            Баня Море<span className="site-footer__dot">.</span>
          </a>

          <nav className="site-footer__nav" aria-label="Навигация в подвале">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(event) => {
                  event.preventDefault();
                  scroll(link.href);
                }}
                className="site-footer__link"
              >
                {link.name}
              </a>
            ))}
          </nav>

          <p className="site-footer__copy">© {new Date().getFullYear()} Баня Море</p>
        </div>
      </div>
    </footer>
  );
}
