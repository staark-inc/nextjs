import type {
  Metadata,
} from "next";

import "@staark/theme-light/styles.css";
import "@staark/theme-byra/styles.css";
import "@staark/theme-el/styles.css";
import "@staark/theme-gastfrihet/styles.css";
import "@staark/theme-kreator/styles.css";
import "@staark/theme-salong/styles.css";
import "@staark/theme-skonhet/styles.css";
import "@staark/theme-verkstad/styles.css";
import "@staark/theme-webb/styles.css";

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
