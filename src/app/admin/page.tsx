import { redirect } from "next/navigation";

// The dashboard (calendar + requests) is build-order steps 4–5. Until then the
// admin is the product manager, so go straight there.
export default function AdminHomePage() {
  redirect("/admin/products");
}
