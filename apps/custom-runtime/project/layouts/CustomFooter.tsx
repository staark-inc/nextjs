import type {
  CustomLayoutProjectProps,
} from "@/lib/custom-layouts";

export function CustomFooter({
  project,
}: CustomLayoutProjectProps) {
  return (
    <footer className="custom-project-footer">
      <div className="custom-project-footer__inner">
        <strong>
          {
            project.project
              .name
          }
        </strong>

        <div className="custom-project-footer__meta">
          Powered by Staark Custom
        </div>
      </div>
    </footer>
  );
}
