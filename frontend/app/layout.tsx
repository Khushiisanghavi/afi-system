import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "AFI – Attention Fragmentation Index",
  description: "Analyze short-form videos for attention stimulation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: "#05050f", color: "#e8e8f0", minHeight: "100vh" }}>
        <Navbar />
        <main style={{ paddingTop: "4.5rem" }}>{children}</main>
      </body>
    </html>
  );
}