import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import About from '@/components/About';
import Baths from '@/components/Baths';
import Gallery from '@/components/Gallery';
import Contacts from '@/components/Contacts';
import Footer from '@/components/Footer';
import ScrollToTopOnLoad from '@/components/ScrollToTopOnLoad';

export default function Home() {
  return (
    <main className="min-h-screen">
      <ScrollToTopOnLoad />
      <Navbar />
      <Hero />
      <About />
      <Baths />
      <Gallery />
      <Contacts />
      <Footer />
    </main>
  );
}
