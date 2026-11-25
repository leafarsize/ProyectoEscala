import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <circle
                cx="32"
                cy="32"
                r="28"
                fill="#f0f7ff"
                stroke="#0d52a0"
                strokeWidth="3.5"
            />
            <path
                d="M28.5 39C20 38 14 32 13 22.5C19.5 23.5 25.5 28.5 29 35.5Z"
                fill="#16a34a"
            />
            <path
                d="M35.5 30.5C43 29 49.5 23.5 51 15C44.5 16 38.5 20.5 35 27Z"
                fill="#22c55e"
            />
            <rect
                x="27.5"
                y="13"
                width="9"
                height="38"
                rx="4.2"
                fill="#15803d"
                stroke="#14532d"
                strokeWidth="1.4"
            />
            <path
                d="M26.5 24.5C29.5 26 34.5 26 37.5 24.5"
                stroke="#fde047"
                strokeWidth="2.6"
                strokeLinecap="round"
            />
            <path
                d="M26.5 37.5C29.5 39 34.5 39 37.5 37.5"
                stroke="#fde047"
                strokeWidth="2.6"
                strokeLinecap="round"
            />
        </svg>
    );
}
