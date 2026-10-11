export const customProjectCss = `
:root {
  --custom-content-width: 1100px;
  --custom-surface-dark: #0b0d10;
  --custom-text-light: #ffffff;
}

[data-staark-custom-styles="true"] {
  min-height: 100vh;
}

[data-staark-custom-styles="true"] .custom-project-header {
  position: relative;
  z-index: 20;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: var(--custom-surface-dark);
  color: var(--custom-text-light);
}

[data-staark-custom-styles="true"] .custom-project-header__inner {
  width: min(calc(100% - 48px), var(--custom-content-width));
  margin: 0 auto;
  padding: 20px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

[data-staark-custom-styles="true"] .custom-project-nav {
  display: flex;
  gap: 20px;
  font-size: 14px;
}

[data-staark-custom-styles="true"] .custom-project-nav a {
  color: inherit;
  text-decoration: none;
}

[data-staark-custom-styles="true"] .custom-project-footer {
  background: var(--custom-surface-dark);
  color: var(--custom-text-light);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

[data-staark-custom-styles="true"] .custom-project-footer__inner {
  width: min(calc(100% - 48px), var(--custom-content-width));
  margin: 0 auto;
  padding: 48px 0;
}

[data-staark-custom-styles="true"] .custom-project-footer__meta {
  margin-top: 8px;
  opacity: 0.55;
  font-size: 14px;
}
`;
