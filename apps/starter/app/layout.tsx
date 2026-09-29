import { content } from "@/lib/staark";

/**
 * BCP 47 document language from the active client site.
 * Content failures must not take down /admin or framework error pages.
 */
async function documentLanguage(): Promise<string> {
  try {
    const { locale } = await content.getSite();

    return /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(locale)
      ? locale
      : "sv";
  } catch {
    return "sv";
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang={await documentLanguage()} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
