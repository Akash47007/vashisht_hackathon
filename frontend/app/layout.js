import "./globals.css";
import SiteHeader from "../components/site-header";

export const metadata = {
  title: "FutureYou Retirement Coach",
  description: "Retirement planning habit loop for Gen Z",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <main className="site-main">{children}</main>
      </body>
    </html>
  );
}
