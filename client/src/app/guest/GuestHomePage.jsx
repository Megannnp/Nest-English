import { useEffect } from "react";

export default function GuestHomePage({ navigateGuestPage }) {
  useEffect(() => {
    navigateGuestPage("portal");
  }, [navigateGuestPage]);

  return null;
}
