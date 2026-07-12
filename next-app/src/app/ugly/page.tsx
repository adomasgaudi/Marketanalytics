import Link from "next/link";
import styles from "./ugly.module.css";

export default function UglyPortPage() {
  return (
    <main className={styles.page}>
      <header className={styles.bar}>
        <strong>Market Analytics</strong>
        <nav>
          <Link href="/">Main</Link>
          <Link href="/rough">Rough</Link>
        </nav>
      </header>
      <iframe
        className={styles.frame}
        src="/legacy/index.html"
        title="Original Market Analytics"
      />
    </main>
  );
}
