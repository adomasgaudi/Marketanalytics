import Link from "next/link";
import styles from "./rough.module.css";

export function TopNav({ version }: { version: string }) {
  return (
    <nav className={styles.topnav}>
      <div>
        <strong>Market Analytics</strong>
        <span>rough Next port</span>
      </div>
      <div className={styles.navlinks}>
        <Link href="/">Main</Link>
        <Link href="/ugly">Ugly</Link>
        <a href="#markets">Markets</a>
        <a href="#companies">Companies</a>
        <a href="#explorer">Explorer</a>
        <span>{version}</span>
      </div>
    </nav>
  );
}
