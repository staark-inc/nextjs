type BrandMarkProps = {
  className?: string;
};

export default function BrandMark({ className = "" }: BrandMarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Staark"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="staark-hub-mark-a" x1="8" y1="8" x2="55" y2="55" gradientUnits="userSpaceOnUse">
          <stop stopColor="#25E6FF" />
          <stop offset="0.48" stopColor="#0A8CFF" />
          <stop offset="1" stopColor="#2447FF" />
        </linearGradient>
        <linearGradient id="staark-hub-mark-b" x1="52" y1="10" x2="14" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1AD8FF" />
          <stop offset="0.55" stopColor="#0877FF" />
          <stop offset="1" stopColor="#123BE8" />
        </linearGradient>
      </defs>
      <path
        fill="url(#staark-hub-mark-a)"
        d="M32 3.5 55 17v15l-9-5.2v-4.7L32 14 18 22.1v6.8l28.2 16.3-8.8 5.1L9 33.9V17L32 3.5Z"
      />
      <path
        fill="url(#staark-hub-mark-b)"
        d="m17.8 35.2 8.8 5.1-8.6 5v-4.6L9 35.5V47l23 13.5L55 47V30.1l-8.8 5.1v6.7L32 50l-14.2-8.3v-6.5Z"
      />
    </svg>
  );
}
