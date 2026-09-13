import type { Metadata } from "next";
import { StatusScreen } from "@/components/terminal/status-screen";

export const metadata: Metadata = {
  title: "Not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <StatusScreen
      code="404"
      title="No such page"
      detail="That route doesn't exist. If you were looking for an account, paste the address into the search bar on any terminal screen."
    />
  );
}
