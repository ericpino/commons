import "./globals.css";
import { sidebarBootstrap } from "../components/shell-state";
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export const metadata = {
  title: "Commons · Northstar",
  description: "Connected work. Shared understanding.",
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: sidebarBootstrap }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
