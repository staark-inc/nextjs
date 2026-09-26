export default function NotFound() {
  return (
    <section className="sk-section">
      <div className="sk-container" style={{ textAlign: "center", paddingBlock: "80px" }}>
        <h1>Sidan hittades inte</h1>
        <p className="sk-section__intro">Sidan du letar efter finns inte längre.</p>
        <a className="sk-btn sk-btn--primary" href="/">
          Till startsidan
        </a>
      </div>
    </section>
  );
}
