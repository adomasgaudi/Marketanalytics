import styles from "./ugly.module.css";

export default function UglyPortPage() {
  // No wrapper nav: the legacy dashboard ships its own <nav class="topnav">
  // inside the iframe, so adding one here stacks two bars.
  return (
    <main className={styles.page}>
      <iframe
        className={styles.frame}
        src="/legacy/index.html"
        title="Original Market Analytics"
      />
    </main>
  );
}
