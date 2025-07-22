// This is the root layout that wraps everything.
// It delegates the locale-specific rendering, including <html> and <body> tags,
// to the [locale]/layout.tsx file.

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
