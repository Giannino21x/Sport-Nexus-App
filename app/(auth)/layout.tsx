// Auth-Seiten (Login, Reset) liegen ausserhalb der App-Shell und haben keinen
// .main-Scroller. In der Edge-Hülle ist der Body-Scroll aber global gesperrt
// (Bounce-Killer in globals.css) — ohne eigenen Scroll-Container war die
// Login-Seite dort komplett unscrollbar, das Formular unerreichbar
// (User-Report 2026-07-21). Im Browser ist der Wrapper layout-neutral.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="auth-scroll">{children}</div>;
}
