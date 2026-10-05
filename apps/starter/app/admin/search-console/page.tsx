import {
  redirect,
} from "next/navigation";

export default function SearchConsolePage() {
  redirect(
    "/admin/analytics#search-console",
  );
}
