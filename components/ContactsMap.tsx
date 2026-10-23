'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

// Карта 2ГИС: тайлы 2ГИС через Leaflet. В отличие от виджета-iframe так можно
// перекрасить подложку под тёмную тему сайта (см. .contacts-map в globals.css).
const PLACE: [number, number] = [43.08756, 131.848564];
const CENTER: [number, number] = [43.0872, 131.84845];
const ZOOM = 17;
const OPEN_IN_2GIS = `https://2gis.ru/vladivostok/geo/${PLACE[1]},${PLACE[0]}?m=${PLACE[1]},${PLACE[0]}/${ZOOM}`;

export default function ContactsMap() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let map: import('leaflet').Map | undefined;
    let cancelled = false;

    // Leaflet обращается к window при импорте, поэтому грузим его только в браузере.
    import('leaflet').then((L) => {
      if (cancelled) return;
      map = L.map(container, {
        center: CENTER,
        zoom: ZOOM,
        // Колесо мыши не перехватывает прокрутку страницы: масштаб — кнопками или щипком.
        scrollWheelZoom: false,
        attributionControl: true,
      });
      map.attributionControl.setPrefix(false);

      L.tileLayer('https://tile{s}.maps.2gis.com/tiles?x={x}&y={y}&z={z}&v=1', {
        subdomains: '0123',
        maxZoom: 18,
        attribution: '<a href="https://2gis.ru" target="_blank" rel="noopener noreferrer">© 2ГИС</a>',
      }).addTo(map);

      L.marker(PLACE, {
        title: 'Баня Море',
        icon: L.divIcon({
          className: 'contacts-map__pin',
          html: '<span></span>',
          iconSize: [34, 44],
          iconAnchor: [17, 44],
        }),
      }).addTo(map);
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, []);

  return (
    <>
      <div ref={containerRef} className="contacts-map__canvas absolute inset-0" role="region" aria-label="Баня Море на карте 2ГИС" />
      <a
        href={OPEN_IN_2GIS}
        target="_blank"
        rel="noopener noreferrer"
        className="contacts-map__open absolute bottom-4 left-4 z-[500] rounded-xl border border-[#d6a15f] bg-[#d6a15f] px-5 py-3 text-sm font-bold text-[#16110c] shadow-[0_12px_30px_rgba(0,0,0,0.3)] transition hover:bg-[#e9bd84]"
      >
        <span className="inline-block scale-[1.12]">Открыть в 2ГИС</span>
      </a>
    </>
  );
}
