import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vita",
  description: "Fill the bars. Eat, train, weigh in — every day.",
};

/**
 * Vita lives on a phone, held in one hand. `viewportFit: "cover"` lets the
 * safe-area insets in globals.css actually do something on iOS, and locking
 * initialScale stops the number-pad inputs from zoom-jumping the layout.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#10b981",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
