import type {
  CustomLayoutProjectProps,
} from "@/lib/custom-layouts";

export function CustomHeader({
  project,
}: CustomLayoutProjectProps) {
  return (
    <header className="custom-project-header">
      <div className="custom-project-header__inner">
        <strong>
          {
            project.project
              .name
          }
        </strong>

        <nav className="custom-project-nav">
          <a
            href="/"
            style={{
              color:
                "inherit",

              textDecoration:
                "none",
            }}
          >
            Home
          </a>

          <a
            href="#services"
            style={{
              color:
                "inherit",

              textDecoration:
                "none",
            }}
          >
            Services
          </a>
        </nav>
      </div>
    </header>
  );
}
