"use client";

import { useEffect } from "react";

export default function DynamicFavicon({ logoUrl }) {
  useEffect(() => {
    if (!logoUrl) return;

    // Atualiza o favicon
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = logoUrl;

    // Atualiza o apple-touch-icon
    let appleLink = document.querySelector("link[rel~='apple-touch-icon']");
    if (!appleLink) {
      appleLink = document.createElement("link");
      appleLink.rel = "apple-touch-icon";
      document.head.appendChild(appleLink);
    }
    appleLink.href = logoUrl;

    return () => {
      // Cleanup não necessário, pois o favicon deve persistir
    };
  }, [logoUrl]);

  return null;
}
