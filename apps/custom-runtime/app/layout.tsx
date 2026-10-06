import type {
  Metadata,
} from "next";

import "@staark/theme-light/styles.css";

export const metadata:
  Metadata = {
  title:
    "Staark Custom Runtime",

  robots:
    "noindex",
};

export default function RootLayout({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <html lang="sv">
      <body
        style={{
          margin:
            0,
        }}
      >
        {children}
      </body>
    </html>
  );
}
