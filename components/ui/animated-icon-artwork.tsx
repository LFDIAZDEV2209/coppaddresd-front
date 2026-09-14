import { useId } from "react";
import type { AnimatedIconName } from "./animated-icon";
import styles from "./animated-icon.module.css";

/** Piezas vectoriales independientes: bisagra, carta, trazo y pulsador. */
export function AnimatedIconArtwork({ name }: { name: AnimatedIconName }) {
  const id = useId().replaceAll(":", "");
  const fill = (part: string) => `url(#${id}-${part})`;
  return (
    <svg
      viewBox="0 0 120 120"
      className={styles.artwork}
      focusable="false"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-blue`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#42bdff" />
          <stop offset=".45" stopColor="#087cff" />
          <stop offset="1" stopColor="#0341c9" />
        </linearGradient>
        <linearGradient id={`${id}-green`} x1="0" y1="0" x2=".8" y2="1">
          <stop stopColor="#71f6a0" />
          <stop offset=".38" stopColor="#13ce63" />
          <stop offset="1" stopColor="#008d45" />
        </linearGradient>
        <linearGradient id={`${id}-orange`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ffda64" />
          <stop offset=".4" stopColor="#ff9a09" />
          <stop offset="1" stopColor="#ed5600" />
        </linearGradient>
        <linearGradient id={`${id}-red`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ff9990" />
          <stop offset=".45" stopColor="#ff4e54" />
          <stop offset="1" stopColor="#d91e36" />
        </linearGradient>
        <linearGradient id={`${id}-white`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#fff" />
          <stop offset=".65" stopColor="#fff" />
          <stop offset="1" stopColor="#c7e2f1" />
        </linearGradient>
        <radialGradient id={`${id}-shadow`}>
          <stop stopColor="#17395d" stopOpacity=".24" />
          <stop offset="1" stopColor="#17395d" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="61" cy="105" rx="44" ry="9" fill={fill("shadow")} />
      {name === "medical-kit" && (
        <g className={styles.kit}>
          <rect x="21" y="46" width="86" height="51" rx="13" fill="#053da9" />
          <rect
            x="15"
            y="41"
            width="86"
            height="52"
            rx="13"
            fill={fill("blue")}
          />
          <rect x="22" y="42" width="73" height="20" rx="7" fill="#062e78" />
          <path
            d="M26 45h64"
            stroke="#368fea"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <g className={styles.supplies}>
            <rect
              x="34"
              y="31"
              width="15"
              height="27"
              rx="5"
              fill={fill("white")}
            />
            <rect x="36" y="28" width="11" height="6" rx="2" fill="#1ae5d0" />
            <rect
              x="60"
              y="30"
              width="22"
              height="28"
              rx="5"
              fill={fill("white")}
            />
            <path d="M71 37v14m-7-7h14" stroke="#07a998" strokeWidth="4" />
          </g>
          <path
            d="M15 52h86v28q0 13-13 13H28q-13 0-13-13Z"
            fill={fill("blue")}
          />
          <path
            d="M20 56h76"
            stroke="#65b9ff"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M56 63h9v8h8v9h-8v8h-9v-8h-8v-9h8Z"
            fill="#024ec4"
            transform="translate(1 2)"
          />
          <path d="M54 61h9v8h8v9h-8v8h-9v-8h-8v-9h8Z" fill={fill("white")} />
          <g className={styles.lid}>
            <path
              d="M42 34V24q0-9 9-9h15q9 0 9 9v10"
              fill="none"
              stroke="#009eb4"
              strokeWidth="9"
            />
            <path
              d="M40 32V23q0-9 9-9h15q9 0 9 9v9"
              fill="none"
              stroke="#28e1e6"
              strokeWidth="7"
            />
            <rect x="17" y="33" width="86" height="23" rx="9" fill="#0353d2" />
            <rect
              x="13"
              y="29"
              width="88"
              height="23"
              rx="9"
              fill={fill("blue")}
            />
            <path
              d="M24 33h65"
              stroke="#9ae5ff"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <rect
              x="51"
              y="46"
              width="12"
              height="9"
              rx="3"
              fill={fill("white")}
            />
          </g>
          <rect x="17" y="49" width="7" height="9" rx="3" fill="#0950b8" />
        </g>
      )}
      {name === "invitation" && (
        <g className={styles.envelope}>
          <path d="M19 48 60 18l43 30v45q0 8-8 8H27q-8 0-8-8Z" fill="#dc6500" />
          <path
            d="M16 45 57 15l43 30v45q0 8-8 8H24q-8 0-8-8Z"
            fill={fill("orange")}
          />
          <path d="m20 48 38 26 38-26-38-26Z" fill="#b95400" />
          <g className={styles.letter}>
            <rect x="31" y="30" width="53" height="52" rx="7" fill="#dbe8ee" />
            <rect
              x="28"
              y="27"
              width="53"
              height="52"
              rx="7"
              fill={fill("white")}
            />
            <path
              d="M39 42h28M39 51h22"
              stroke="#94b5c4"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="m53 62 5 5 10-11"
              fill="none"
              stroke="#00ac61"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
          <path
            d="m16 47 40 27 44-27v42q0 9-9 9H25q-9 0-9-9Z"
            fill={fill("orange")}
          />
          <path
            d="m19 94 32-26q6-5 12 0l34 26"
            fill={fill("orange")}
            stroke="#ffbb48"
            strokeWidth="2"
          />
          <g className={styles.sent}>
            <circle cx="92" cy="28" r="14" fill="#008f4e" />
            <path
              d="m85 28 5 5 9-11"
              stroke="#fff"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </g>
      )}
      {name === "status-check" && (
        <g className={styles.checkDisc}>
          <circle cx="64" cy="62" r="41" fill="#007b3a" />
          <circle cx="58" cy="56" r="41" fill={fill("green")} />
          <path
            d="M28 42a33 33 0 0 1 40-17"
            stroke="#a6ffc9"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="m38 58 14 14 27-32"
            stroke="#008a41"
            strokeWidth="11"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(1 3)"
          />
          <path
            className={styles.checkStroke}
            pathLength="1"
            d="m36 55 14 14 27-32"
            stroke={fill("white")}
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <g
            className={styles.sparkles}
            stroke="#00b65d"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <path d="M101 28v10m-5-5h10M19 79v8m-4-4h8" />
          </g>
        </g>
      )}
      {name === "status-pause" && (
        <g>
          <circle cx="63" cy="63" r="42" fill="#b80f29" />
          <g className={styles.stopDisc}>
            <circle cx="58" cy="56" r="42" fill={fill("red")} />
            <path
              d="M28 40a33 33 0 0 1 40-16"
              stroke="#ffcdc7"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            <g className={styles.stopBars}>
              <rect
                x="39"
                y="37"
                width="13"
                height="39"
                rx="5"
                fill="#c8293e"
                transform="translate(2 3)"
              />
              <rect
                x="63"
                y="37"
                width="13"
                height="39"
                rx="5"
                fill="#c8293e"
                transform="translate(2 3)"
              />
              <rect
                x="38"
                y="34"
                width="13"
                height="39"
                rx="5"
                fill={fill("white")}
              />
              <rect
                x="62"
                y="34"
                width="13"
                height="39"
                rx="5"
                fill={fill("white")}
              />
            </g>
          </g>
        </g>
      )}
    </svg>
  );
}
