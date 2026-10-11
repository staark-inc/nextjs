import { BlogConfigSchema } from "@staark/addon-blog/config";
import type {
  CustomLayoutProjectProps,
} from "@/lib/custom-layouts";

export function CustomHeader({
  project,
}: CustomLayoutProjectProps) {
  const addon = project.runtime.config.addons.find(item => item.key === "blog" && item.enabled);
  const blog = addon ? BlogConfigSchema.parse(addon.config) : null;
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
          {blog ? <a href={blog.basePath}>{blog.title}</a> : null}
        </nav>
      </div>
    </header>
  );
}
