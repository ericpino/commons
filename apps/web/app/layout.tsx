import "./globals.css";
export const metadata = {
  title: "Commons · Northstar",
  description: "Connected work. Shared understanding.",
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
