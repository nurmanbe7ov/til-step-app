"use client";

import { useLayoutEffect, useRef, useState } from "react";

const viewBoxWidth = 800;
const viewBoxHeight = 300;

type Point = {
  x: number;
  y: number;
};

type Curve = readonly [Point, Point, Point, Point];

const trail: readonly Curve[] = [
  [
    { x: 64, y: 286 },
    { x: 170, y: 274 },
    { x: 250, y: 280 },
    { x: 360, y: 258 },
  ],
  [
    { x: 360, y: 258 },
    { x: 470, y: 236 },
    { x: 560, y: 246 },
    { x: 690, y: 220 },
  ],
];

function mix(start: Point, end: Point, amount: number): Point {
  return {
    x: start.x + (end.x - start.x) * amount,
    y: start.y + (end.y - start.y) * amount,
  };
}

function curveX(curve: Curve, amount: number): number {
  const rest = 1 - amount;
  const [start, controlA, controlB, end] = curve;

  return (
    rest * rest * rest * start.x +
    3 * rest * rest * amount * controlA.x +
    3 * rest * amount * amount * controlB.x +
    amount * amount * amount * end.x
  );
}

function cutCurve(curve: Curve, amount: number): Curve {
  const [start, controlA, controlB, end] = curve;
  const startControl = mix(start, controlA, amount);
  const middle = mix(controlA, controlB, amount);
  const endControl = mix(controlB, end, amount);
  const startMiddle = mix(startControl, middle, amount);
  const endMiddle = mix(middle, endControl, amount);

  return [start, startControl, startMiddle, mix(startMiddle, endMiddle, amount)];
}

function amountAtX(curve: Curve, maxX: number): number {
  let low = 0;
  let high = 1;

  for (let step = 0; step < 18; step += 1) {
    const middle = (low + high) / 2;

    if (curveX(curve, middle) < maxX) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return (low + high) / 2;
}

function coordinate(value: number): string {
  return value.toFixed(1);
}

function trailPath(maxX: number): string {
  const commands: string[] = [];

  for (const curve of trail) {
    if (curve[0].x >= maxX) {
      break;
    }

    const visible = curve[3].x <= maxX ? curve : cutCurve(curve, amountAtX(curve, maxX));

    if (commands.length === 0) {
      commands.push(`M${coordinate(visible[0].x)} ${coordinate(visible[0].y)}`);
    }

    commands.push(
      `C${coordinate(visible[1].x)} ${coordinate(visible[1].y)} ${coordinate(visible[2].x)} ${coordinate(visible[2].y)} ${coordinate(visible[3].x)} ${coordinate(visible[3].y)}`,
    );

    if (curve[3].x > maxX) {
      break;
    }
  }

  return commands.join("");
}

function visibleLimit(width: number, height: number): number {
  const scale = Math.max(width / viewBoxWidth, height / viewBoxHeight);
  const visibleWidth = width / scale;

  return Math.min(690, Math.max(220, visibleWidth - 40));
}

export function HomeScene() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [limit, setLimit] = useState(340);
  const path = trailPath(limit);

  useLayoutEffect(() => {
    const svg = svgRef.current;

    if (!svg) {
      return;
    }

    const update = () => {
      const box = svg.getBoundingClientRect();

      if (box.width > 0 && box.height > 0) {
        setLimit(Math.round(visibleLimit(box.width, box.height)));
      }
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(svg);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg
        ref={svgRef}
        aria-hidden
        width="100%"
        height="100%"
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="xMinYMid slice"
        overflow="hidden"
        className="absolute inset-0 block h-full max-w-full"
      >
        <defs>
          <linearGradient id="tilstep-home-sky" x1="0" y1="0" x2="1" y2="1">
            <stop className="home-sky-0" offset="0%" />
            <stop className="home-sky-1" offset="55%" />
            <stop className="home-sky-2" offset="100%" />
          </linearGradient>
          <filter
            id="tilstep-moon-glow"
            filterUnits="userSpaceOnUse"
            x="-70"
            y="-70"
            width="140"
            height="140"
          >
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>
        <rect width={viewBoxWidth} height={viewBoxHeight} fill="url(#tilstep-home-sky)" />
        <g className="home-ridge-drift">
          <path
            className="home-ridge"
            d="M0 236C150 214 240 156 360 146C500 134 580 86 700 74C760 68 820 84 860 78V320H0Z"
          />
        </g>
        <path
          className="home-hill"
          d="M40 214C170 176 280 206 410 168C540 130 650 162 860 132V320H0V248C8 236 20 224 40 214Z"
        />
        <g className="home-moon">
          <circle r="16" fill="#f3e2a8" filter="url(#tilstep-moon-glow)" opacity="0.9" />
          <circle r="14" fill="#f7f4ec" />
        </g>
        <g className="home-stars">
          <circle cx="52" cy="34" r="1.5" fill="#f7f4ec" />
          <circle cx="228" cy="26" r="2" fill="#f6f1e6" />
          <circle cx="292" cy="58" r="1.2" fill="#f7f4ec" />
          <circle cx="356" cy="34" r="1.7" fill="#f3e2a8" />
          <circle cx="198" cy="72" r="1.1" fill="#f7f4ec" />
        </g>
        <path
          className="home-front"
          d="M0 252C150 228 250 258 390 228C530 198 640 230 860 196V320H0Z"
        />
        <path
          id="tilstep-home-trail"
          className="home-path"
          d={path}
          fill="none"
          stroke="var(--home-trail)"
          strokeWidth="2"
          strokeLinecap="round"
          pathLength={1}
        />
        <circle className="home-walker-still" cx="64" cy="286" r="3.5" fill="#f4c95d" />
        <circle key={path} className="home-walker" r="3.5" fill="#f4c95d">
          <animateMotion
            dur="18s"
            repeatCount="indefinite"
            keyPoints="0;1;0"
            keyTimes="0;0.5;1"
            calcMode="spline"
            keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
          >
            <mpath href="#tilstep-home-trail" />
          </animateMotion>
        </circle>
      </svg>
      <div className="home-sun absolute right-5 top-5 size-14 sm:right-8 sm:top-7 sm:size-16">
        <span className="home-sun-glow absolute inset-0 rounded-full bg-[#f4c95d]/40 blur-md" />
        <span className="absolute left-1/2 top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f4c95d] sm:size-8" />
      </div>
    </div>
  );
}
