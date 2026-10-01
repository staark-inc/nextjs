export default function PageEditorLoading() {
  return (
    <>
      <section className="sa-page-header">
        <div>
          <span className="sa-page-eyebrow">
            Content
          </span>
          <h1 className="sa-h1">
            Loading page…
          </h1>
          <p className="sa-subtitle">
            Preparing the editor.
          </p>
        </div>
      </section>

      <div className="sa-card">
        <div className="sa-loading">
          Loading content…
        </div>
      </div>
    </>
  );
}
