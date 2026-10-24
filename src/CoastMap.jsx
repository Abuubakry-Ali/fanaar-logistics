import React, {useEffect, useRef} from 'react';
import './coast-map-animation.css';

// Keep this offshore path identical to the dotted route in the static map asset.
const WATER_ROUTE = 'M411 378C405 368 402 362 398 358C389 349 378 339 370 331C360 321 357 313 357 303C354 288 354 277 360 260C367 243 378 228 393 218C404 211 412 203 415 193C419 188 425 186 429 182C427 173 417 165 410 163C404 159 397 158 389 156';
const DURATION = 24;
const UNGUJA = 0.32113122169265124;
const PEMBA = 0.8296464907439696;
const TIMES = [0, .5, 3.390180995233861, 4.390180995233861, 8.966818416695727, 9.966818416695727, 11.5, 12.5, 14.033181583304273, 15.033181583304273, 19.609819004766138, 20.609819004766138, 23.5, DURATION];
const DISTANCES = [0, 0, UNGUJA, UNGUJA, PEMBA, PEMBA, 1, 1, PEMBA, PEMBA, UNGUJA, UNGUJA, 0, 0];

function progressAt(seconds) {
  const time = ((seconds % DURATION) + DURATION) % DURATION;
  let segment = 0;
  while (segment < TIMES.length - 2 && time >= TIMES[segment + 1]) segment++;
  const fraction = (time - TIMES[segment]) / (TIMES[segment + 1] - TIMES[segment]);
  // Smoothstep has zero velocity at both ends of every sailing leg.
  const eased = fraction * fraction * (3 - 2 * fraction);
  return DISTANCES[segment] + (DISTANCES[segment + 1] - DISTANCES[segment]) * eased;
}

export function CoastMap() {
  const routeRef = useRef(null);
  const shipRef = useRef(null);

  useEffect(() => {
    const route = routeRef.current;
    const ship = shipRef.current;
    if (!route || !ship) return;

    const length = route.getTotalLength();
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let elapsed = 0;
    let previousTime = null;
    let disposed = false;

    function draw() {
      const point = route.getPointAtLength(length * progressAt(elapsed));
      ship.setAttribute('transform', `translate(${point.x} ${point.y})`);
    }

    function tick(timestamp) {
      frame = 0;
      if (disposed || document.hidden || preference.matches) {
        previousTime = null;
        return;
      }
      if (previousTime !== null) elapsed = (elapsed + Math.min(Math.max(0, timestamp - previousTime), 100) / 1000) % DURATION;
      previousTime = timestamp;
      draw();
      frame = window.requestAnimationFrame(tick);
    }

    function synchronize() {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      previousTime = null;
      if (preference.matches) {
        elapsed = 0;
        draw();
      } else if (!document.hidden && !disposed) {
        frame = window.requestAnimationFrame(tick);
      }
    }

    draw();
    synchronize();
    document.addEventListener('visibilitychange', synchronize);
    if (preference.addEventListener) preference.addEventListener('change', synchronize);
    else preference.addListener(synchronize);

    return () => {
      disposed = true;
      if (frame) window.cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', synchronize);
      if (preference.removeEventListener) preference.removeEventListener('change', synchronize);
      else preference.removeListener(synchronize);
    };
  }, []);

  return <>
    <img className="coast-map" src={`${import.meta.env.BASE_URL}images/tanzania-service-map.svg?v=static-single-ship-2`} alt="Geographic map of Tanzania highlighting Dar es Salaam, Tanga, and Zanzibar's Unguja and Pemba islands, with an enlarged coastal view"/>
    <svg className="coast-map-animation" viewBox="0 0 620 500" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
      <path ref={routeRef} d={WATER_ROUTE} fill="none" stroke="none"/>
      <g ref={shipRef} className="coast-map-ship" transform="translate(411 378)">
        <g transform="scale(.75)">
          <circle r="16" fill="#fffefb" stroke="#d6e1d3"/>
          <g fill="none" stroke="#173c3d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M-10 1-6 7H6L10 1 0-3Z" fill="#ed7654" stroke="#c86e50"/>
            <path d="M-6-1v-7H5v7M0-8v-3M-4-5h2m4 0h2M-12 10q3 3 6 0 3 3 6 0 3 3 6 0 3 3 6 0"/>
          </g>
        </g>
      </g>
    </svg>
  </>;
}
